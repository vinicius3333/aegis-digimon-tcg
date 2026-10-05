import { describe, expect, it } from "vitest";
import { GameState, type Intent } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { createEvaluationPolicy } from "../policy.js";
import { mainActions, mainActionReady } from "./actions.js";
import { createTrainingPolicy, type TrainingWindow } from "./policy.js";
import { trainingObservation } from "./observation.js";
import { teacherActionIndex } from "./teacher.js";
import { compoundTeacherCandidates, createTrainingTeacher } from "./referencePolicy.js";
import "../../cards/index.js";

const declaration: Intent = {
  type: "playCard",
  instanceId: "destination",
  assembly: { materialInstanceIds: ["B", "A"] },
};
function privateWindow(seat: 0 | 1, selected: string[]): TrainingWindow {
  return {
    observation: trainingObservation(new GameState(), seat),
    kind: "selectCards",
    selected,
    actions: [
      ...["A", "B"]
        .filter((id) => !selected.includes(id))
        .map((id) => ({
          sourceId: id,
          label: "Material",
          intent: {
            type: "respondDecision" as const,
            decisionId: "assembly",
            response: { kind: "selectCards" as const, instanceIds: [id] },
          },
        })),
      {
        sourceId: "destination",
        label: "Finish",
        intent: { type: "respondDecision", decisionId: "assembly", response: { kind: "selectCards", instanceIds: [] } },
      },
    ],
  };
}

for (const seat of [0, 1] as const) {
  describe(`training material demonstrations seat=${seat}`, () => {
    it("maps the original declared ordered prefix and semantic finish with destination sourceId", () => {
      expect(teacherActionIndex(privateWindow(seat, []), declaration, declaration)).toBe(1);
      expect(teacherActionIndex(privateWindow(seat, ["B"]), declaration, declaration)).toBe(0);
      expect(teacherActionIndex(privateWindow(seat, ["B", "A"]), declaration, declaration)).toBe(0);
    });

    it("keeps unrelated declarations, divergent prefixes and missing targets unavailable", () => {
      const unrelated = { ...declaration, instanceId: "other" } as Intent;
      expect(teacherActionIndex(privateWindow(seat, []), unrelated, declaration)).toBeUndefined();
      expect(teacherActionIndex(privateWindow(seat, []), declaration)).toBeUndefined();
      expect(teacherActionIndex(privateWindow(seat, ["A"]), declaration, declaration)).toBeUndefined();
      expect(teacherActionIndex(privateWindow(seat, ["B", "A", "extra"]), declaration, declaration)).toBeUndefined();
      const missing = privateWindow(seat, []);
      missing.actions = missing.actions.filter((a) => a.sourceId !== "B");
      expect(teacherActionIndex(missing, declaration, declaration)).toBeUndefined();
      expect(
        teacherActionIndex(privateWindow(seat, []), { type: "playCard", instanceId: "destination" }, declaration),
      ).toBeUndefined();
      const realRequest = privateWindow(seat, []);
      realRequest.request = { decisionId: "real", seat, kind: "selectCards", promptText: "Real decision" };
      expect(teacherActionIndex(realRequest, declaration, declaration)).toBeUndefined();
    });

    it("preserves real decision decline and refuses a private empty Assembly declaration", () => {
      const window = privateWindow(seat, []);
      window.request = { decisionId: "assembly", seat, kind: "selectCards", promptText: "Real decision" };
      window.actions = window.actions.map((a) => ({
        ...a,
        sourceId:
          a.intent.type === "respondDecision" &&
          a.intent.response.kind === "selectCards" &&
          a.intent.response.instanceIds.length === 0
            ? undefined
            : a.sourceId,
      }));
      expect(
        teacherActionIndex(window, {
          type: "respondDecision",
          decisionId: "assembly",
          response: { kind: "selectCards", instanceIds: [] },
        }),
      ).toBe(2);
      expect(
        teacherActionIndex(
          privateWindow(seat, []),
          { type: "playCard", instanceId: "destination", assembly: { materialInstanceIds: [] } },
          declaration,
        ),
      ).toBeUndefined();
    });

    it("teaches and executes actual Main Assembly material and finish steps", async () => {
      const s = setupEngine(
        {
          [seat]: {
            hand: [{ card: "BT26-073", as: "played" }],
            trash: [{ card: "BT25-008", as: "material" }, "BT26-011", "BT26-015"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const before = mainActions(s.engine, seat);
      const view = buildBotView(s.state, seat)!;
      const fixed = createEvaluationPolicy({ seed: 7 }).chooseMainAction(view);
      const teacher = createTrainingTeacher(s.engine, seat, 7);
      expect(createEvaluationPolicy({ seed: 7 }).chooseMainAction(view)).toEqual(fixed);
      const windows: TrainingWindow[] = [];
      const policy = createTrainingPolicy(
        s.engine,
        seat,
        (window) => {
          windows.push(window);
          expect(window.teacher?.action).toBeTypeOf("number");
          return window.teacher!.action!;
        },
        teacher,
      );
      const intent = policy.chooseMainAction(view);
      expect(intent.type === "playCard" && intent.assembly?.materialInstanceIds).toEqual([
        s.inst("material").instanceId,
      ]);
      expect(mainActions(s.engine, seat)).toEqual(before);
      expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
      await settle(() => mainActionReady(s.engine));
      const unit = s.state.players[seat]!.battleArea.find((p) => p.topCard.instanceId === s.inst("played").instanceId)!;
      expect(unit.stack.map((c) => c.instanceId)).toEqual([s.inst("material").instanceId]);
      expect(s.state.memory).toBe(4);
      expect(windows.map((w) => w.kind)).toEqual(["main", "selectCards", "selectCards"]);
      expect(windows[2]!.actions[windows[2]!.teacher!.action!]!.sourceId).toBe(s.inst("played").instanceId);
      expect(s.events.filter((e) => e.kind === "actionRejected")).toEqual([]);
    });

    it("retains unique engine-validated DigiXros routes and blocklists exactly a rejected declaration", async () => {
      const s = setupEngine({
        [seat]: { hand: [{ card: "EX10-031", as: "played" }, "EX10-026", "EX10-027", "EX10-026"] },
      });
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const view = buildBotView(s.state, seat)!;
      const candidates = compoundTeacherCandidates(s.engine, seat, view).filter(
        (c) => c.intent.type === "playCard" && c.intent.digiXros !== undefined,
      );
      const legal = mainActions(s.engine, seat).filter(
        (a) => a.intent.type === "playCard" && a.intent.digiXros !== undefined,
      );
      expect(candidates.length).toBeGreaterThan(2);
      expect(candidates.map((c) => c.intent)).toEqual(legal.map((a) => a.intent));
      expect(new Set(candidates.map((c) => c.key)).size).toBe(candidates.length);
      expect(candidates.map((c) => c.cost)).toEqual(legal.map((a) => a.projectedCost));
      const teacher = createTrainingTeacher(s.engine, seat, 7);
      const selected = teacher.chooseMainAction(view);
      expect(selected.type === "playCard" && selected.digiXros?.materialInstanceIds.length).toBe(2);
      teacher.noteRejected(selected);
      expect(teacher.chooseMainAction(view)).not.toEqual(selected);
      teacher.onTurnStart();
      const restored = teacher.chooseMainAction(view);
      expect(restored.type === "playCard" && restored.digiXros?.materialInstanceIds.length).toBe(2);
      s.state.memory = -10;
      expect(
        compoundTeacherCandidates(s.engine, seat, buildBotView(s.state, seat)!).filter(
          (c) => c.intent.type === "playCard" && c.intent.digiXros !== undefined,
        ),
      ).toEqual([]);
    });

    it("teaches a complete four-material Assembly declaration through its real private sequence", async () => {
      const s = setupEngine(
        { [seat]: { hand: [{ card: "EX9-047", as: "played" }], trash: ["EX9-048", "BT7-069", "EX9-048", "BT7-069"] } },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const windows: TrainingWindow[] = [];
      const policy = createTrainingPolicy(
        s.engine,
        seat,
        (window) => {
          windows.push(window);
          expect(window.teacher?.action).toBeTypeOf("number");
          return window.teacher!.action!;
        },
        createTrainingTeacher(s.engine, seat, 7),
      );
      const intent = policy.chooseMainAction(buildBotView(s.state, seat)!);
      expect(intent.type === "playCard" && intent.assembly?.materialInstanceIds.length).toBe(4);
      expect(windows.filter((w) => w.kind === "selectCards").map((w) => w.selected.length)).toEqual([0, 1, 2, 3, 4]);
      expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
      await settle(() => mainActionReady(s.engine));
      const unit = s.state.players[seat]!.battleArea.find((p) => p.topCard.instanceId === s.inst("played").instanceId)!;
      expect(new Set(unit.stack.map((c) => c.instanceId))).toEqual(
        new Set(intent.type === "playCard" ? intent.assembly!.materialInstanceIds : []),
      );
      expect(s.state.memory).toBe(6);
    });

    it("labels and physically executes a complete Main DigiXros play", async () => {
      const s = setupEngine(
        { [seat]: { hand: [{ card: "EX10-031", as: "played" }, "EX10-026", "EX10-027"] } },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const windows: TrainingWindow[] = [];
      const policy = createTrainingPolicy(
        s.engine,
        seat,
        (window) => {
          windows.push(window);
          expect(window.teacher?.action).toBeTypeOf("number");
          return window.teacher!.action!;
        },
        createTrainingTeacher(s.engine, seat, 7),
      );
      const intent = policy.chooseMainAction(buildBotView(s.state, seat)!);
      expect(intent.type === "playCard" && intent.digiXros?.materialInstanceIds.length).toBe(2);
      expect(windows).toHaveLength(1);
      expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
      await settle(() => mainActionReady(s.engine));
      const unit = s.state.players[seat]!.battleArea.find((p) => p.topCard.instanceId === s.inst("played").instanceId)!;
      expect(unit.stack.map((c) => c.cardId)).toEqual(["EX10-027", "EX10-026"]);
      expect(s.state.memory).toBe(5);
      expect(s.events.filter((e) => e.kind === "actionRejected")).toEqual([]);
    });
  });
}
