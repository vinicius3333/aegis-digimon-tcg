import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { EffectDuration } from "@aegis/shared";
import { internalsOf } from "../../engine/testkit/internals.js";
import { createEvaluationPolicy } from "../policy.js";
import { buildBotView } from "../view.js";
import { createTrainingPolicy, type TrainingWindow } from "./policy.js";
import { compoundTeacherCandidates, createTrainingTeacher } from "./referencePolicy.js";
import { mainActionReady } from "./actions.js";
import "../../cards/index.js";

for (const seat of [0, 1] as const) {
  describe(`compound demonstration policy for seat ${seat}`, () => {
    it("labels and executes hand Link followed by App Fusion with the same physical partner", async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [{ card: "EX10-024", as: "host", suspended: true }],
            hand: [
              { card: "EX10-016", as: "partner" },
              { card: "EX10-017", as: "result" },
            ],
            deck: ["BT26-084", "BT26-084"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 2;
      await s.ready();
      const windows: TrainingWindow[] = [];
      const teacher = createTrainingTeacher(s.engine, seat, 7);
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
      const link = policy.chooseMainAction(buildBotView(s.state, seat)!);
      expect(link).toEqual({
        type: "linkCard",
        instanceId: s.inst("partner").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      });
      expect(s.engine.applyIntent(seat, link)).toEqual({ ok: true });
      await settle(() => s.perm("host").linked.length === 1);
      await settle(() => mainActionReady(s.engine));
      const fusion = policy.chooseMainAction(buildBotView(s.state, seat)!);
      expect(fusion).toEqual({
        type: "appFusion",
        instanceId: s.inst("result").instanceId,
        permanentId: s.perm("host").permanentId,
        linkedInstanceId: s.inst("partner").instanceId,
      });
      expect(s.engine.applyIntent(seat, fusion)).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard.cardId === "EX10-017");
      await settle(() => mainActionReady(s.engine));
      expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX10-024", "EX10-016"]);
      expect(s.perm("host").linked).toHaveLength(0);
      expect(windows.map((window) => window.actions[window.teacher!.action!]!.intent.type)).toEqual([
        "linkCard",
        "appFusion",
      ]);
    });

    it("does not spend the turn setting up a fusion, consume an attacker, or use a forbidden base", async () => {
      const s = setupEngine({
        [seat]: {
          battleArea: [
            { card: "EX10-024", as: "host", suspended: true },
            { card: "EX10-016", as: "partner" },
          ],
          hand: [{ card: "EX10-017", as: "result" }],
        },
      });
      s.state.turnSeat = seat;
      s.state.memory = 2;
      await s.ready();
      const teacher = createTrainingTeacher(s.engine, seat, 7);
      expect(teacher.chooseMainAction(buildBotView(s.state, seat)!).type).not.toBe("linkCard");
      s.state.memory = 0;
      expect(
        compoundTeacherCandidates(s.engine, seat, buildBotView(s.state, seat)!).filter((c) => c.kind === "linkCard"),
      ).toEqual([]);
      s.state.memory = 2;
      internalsOf(s.engine).continuous.addRestriction(
        s.perm("host").permanentId,
        "digivolve",
        EffectDuration.Permanent,
      );
      expect(
        compoundTeacherCandidates(s.engine, seat, buildBotView(s.state, seat)!).filter(
          (c) => c.kind === "linkCard" && c.base?.permanentId === s.perm("host").permanentId,
        ),
      ).toEqual([]);
    });

    it("uses DNA to regain a winning attack but preserves an existing winning attacker", async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: "BT22-013", as: "greymon", suspended: true },
              { card: "BT22-026", as: "garurumon", suspended: true },
            ],
            hand: [{ card: "EX13-016", as: "result" }],
            deck: ["BT22-008"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 0;
      await s.ready();
      const teacher = createTrainingTeacher(s.engine, seat, 7);
      const view = buildBotView(s.state, seat)!;
      expect(createEvaluationPolicy({ seed: 7 }).chooseMainAction(view).type).not.toBe("dnaDigivolve");
      const dna = teacher.chooseMainAction(view);
      expect(dna.type).toBe("dnaDigivolve");
      teacher.noteRejected(dna);
      expect(teacher.chooseMainAction(view)).not.toEqual(dna);
      teacher.onTurnStart();
      const attacker = { ...view.board[0]!, suspended: false, canAttackPlayer: true };
      expect(
        teacher.chooseMainAction({ ...view, board: [attacker, view.board[1]!], readyAttackers: [attacker] }).type,
      ).toBe("attack");
      expect(s.engine.applyIntent(seat, dna)).toEqual({ ok: true });
      await settle(() => s.state.players[seat]!.battleArea.some((unit) => unit.topCard?.cardId === "EX13-016"));
      const result = s.state.players[seat]!.battleArea.find((unit) => unit.topCard?.cardId === "EX13-016")!;
      await settle(() => mainActionReady(s.engine));
      expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(result.isSuspended).toBe(false);
      expect(result.stack).toHaveLength(2);
    });

    it("blocklists a rejected Link and resets its availability on the next turn", async () => {
      const s = setupEngine({
        [seat]: {
          battleArea: [{ card: "EX10-024", suspended: true }],
          hand: ["EX10-016", "EX10-017"],
        },
      });
      s.state.turnSeat = seat;
      s.state.memory = 2;
      await s.ready();
      const teacher = createTrainingTeacher(s.engine, seat, 7);
      const view = buildBotView(s.state, seat)!;
      const link = teacher.chooseMainAction(view);
      expect(link.type).toBe("linkCard");
      teacher.noteRejected(link);
      expect(teacher.chooseMainAction(view)).not.toEqual(link);
      teacher.onTurnStart();
      expect(teacher.chooseMainAction(view)).toEqual(link);
    });

    it("takes an unrelated winning attack before fusing two suspended materials", async () => {
      const s = setupEngine({
        [seat]: {
          battleArea: [
            { card: "BT22-013", suspended: true },
            { card: "BT22-026", suspended: true },
            { card: "EX13-048", as: "winner" },
          ],
          hand: ["EX13-016"],
        },
      });
      s.state.turnSeat = seat;
      s.state.memory = 0;
      await s.ready();
      const view = buildBotView(s.state, seat)!;
      expect(view.opponentSecurityCount).toBe(0);
      expect(s.perm("winner").canAttackPlayer).toBe(true);
      expect(createTrainingTeacher(s.engine, seat, 7).chooseMainAction(view)).toEqual({
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "player" },
      });
    });

    it("prepares and executes the registered Sociamon / Gossipmon Charismon fusion", async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [{ card: "BT21-043", as: "host", suspended: true }],
            hand: [
              { card: "BT21-070", as: "partner" },
              { card: "BT21-073", as: "result" },
            ],
            deck: ["BT26-063"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 3;
      await s.ready();
      const teacher = createTrainingTeacher(s.engine, seat, 9);
      const link = teacher.chooseMainAction(buildBotView(s.state, seat)!);
      expect(link).toEqual({
        type: "linkCard",
        instanceId: s.inst("partner").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      });
      expect(s.engine.applyIntent(seat, link)).toEqual({ ok: true });
      await settle(() => s.perm("host").linked.length === 1 && mainActionReady(s.engine));
      const fusion = teacher.chooseMainAction(buildBotView(s.state, seat)!);
      expect(fusion).toEqual({
        type: "appFusion",
        instanceId: s.inst("result").instanceId,
        permanentId: s.perm("host").permanentId,
        linkedInstanceId: s.inst("partner").instanceId,
      });
      expect(s.engine.applyIntent(seat, fusion)).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard.cardId === "BT21-073" && mainActionReady(s.engine));
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-043", "BT21-070"]);
      expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    });
  });
}
