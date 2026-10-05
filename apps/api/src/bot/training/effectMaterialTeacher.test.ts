import { describe, expect, it } from "vitest";
import type { DecisionRequest, Intent } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView, type BotView } from "../view.js";
import { createEvaluationPolicy, type BotPolicy } from "../policy.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import { createTrainingTeacher } from "./referencePolicy.js";
import { mainActionReady } from "./actions.js";
import "../../cards/index.js";

function teacherIndex(window: TrainingWindow): number {
  expect(window.teacher?.action).toBeTypeOf("number");
  return window.teacher!.action!;
}

function selected(intent: Intent, ids: string[]): void {
  expect(intent).toMatchObject({ type: "respondDecision", response: { kind: "selectCards", instanceIds: ids } });
}

function delegated(teacher: BotPolicy, view: BotView | undefined, request: DecisionRequest): void {
  expect(teacher.answerDecision(view, request)).toEqual(createEvaluationPolicy().answerDecision(view, request));
}

for (const seat of [0, 1] as const) {
  describe(`effect material teacher seat=${seat}`, () => {
    for (const family of ["assembly", "digiXros"] as const) {
      it(`labels and executes an actual effect ${family} material request`, async () => {
        const s = setupEngine({
          [seat]:
            family === "assembly"
              ? {
                  hand: [{ card: "BT26-073", as: "played" }],
                  battleArea: [{ card: "BT26-096", as: "source" }],
                  trash: [{ card: "BT25-008", as: "material" }, "BT26-015"],
                  deck: ["BT26-009"],
                }
              : {
                  hand: [
                    { card: "BT10-084", as: "source" },
                    { card: "BT10-076", as: "material" },
                  ],
                  trash: [{ card: "BT10-077", as: "played" }],
                },
        });
        s.state.turnSeat = seat;
        s.state.memory = 10;
        await s.ready();
        const teacher = createTrainingTeacher(s.engine, seat, 7);
        const windows: TrainingWindow[] = [];
        const policy = createAsyncTrainingPolicy(
          s.engine,
          seat,
          async (window) => {
            windows.push(window);
            if (window.request?.options?.assemblyCardId || window.request?.options?.digiXrosCardId) {
              return teacherIndex(window);
            }
            // A bounded fixture enters the real effect route; this is no primary
            // policy proof. Only material choices below are the teacher's labels.
            if (window.request?.sourceCardId === "BT26-096" && window.kind !== "optional") {
              const target = window.actions.findIndex((a) => a.sourceId === s.inst("played").instanceId);
              if (window.selected.length === 0 && target >= 0) return target;
              const finish = window.actions.findIndex((a) => a.sourceId === undefined);
              if (finish >= 0) return finish;
            }
            if (window.kind === "optional" && !["BT26-096", "BT10-084"].includes(window.request?.sourceCardId ?? "")) {
              return window.actions.findIndex(
                (a) =>
                  a.intent.type === "respondDecision" &&
                  a.intent.response.kind === "optional" &&
                  !a.intent.response.accept,
              );
            }
            if (window.kind === "optional") return window.teacher?.action ?? 0;
            const decline = window.actions.findIndex((a) =>
              ["Decline", "Don't use", "Finish selection"].includes(a.label),
            );
            if (decline >= 0) return decline;
            return window.teacher?.action ?? 0;
          },
          teacher,
        );
        const trigger: Intent =
          family === "assembly"
            ? {
                type: "activateEffect",
                sourceInstanceId: s.inst("source").instanceId,
                effectKey: s.engine.projection.activatableEffectsFor([s.inst("source")])[0]!.effect.effectKey,
              }
            : { type: "playCard", instanceId: s.inst("source").instanceId };
        expect(s.engine.applyIntent(seat, trigger)).toEqual({ ok: true });
        let materialRequests = 0;
        for (let index = 0; index < 40; index++) {
          await settle(() => s.state.pendingDecision !== undefined || mainActionReady(s.engine));
          const pending = s.state.pendingDecision;
          if (pending === undefined) break;
          const request = s.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
          if (request.options?.assemblyCardId || request.options?.digiXrosCardId) {
            materialRequests++;
            const view = buildBotView(s.state, seat)!;
            const baseline = createEvaluationPolicy().answerDecision(view, request);
            selected(baseline, []);
            const response = teacher.answerDecision(view, request);
            selected(response, [s.inst("material").instanceId]);
            // Costs/quotas remain solver constraints, never positive labels
            // fabricated to satisfy coverage when the request cannot use them.
            const constrained = { ...request, options: { ...request.options, maxTotalPlayCost: 0 } };
            delegated(teacher, view, constrained);
            const invalid = { ...request, options: { ...request.options, [family + "CardId"]: "NOT-A-CARD" } };
            delegated(teacher, view, invalid);
            for (const blocked of [
              { ...request, options: { ...request.options, max: 0 } },
              { ...request, options: { ...request.options, min: 2, max: 1 } },
              { ...request, options: { ...request.options, candidateInstanceIds: [] } },
              { ...request, decisionId: "stale" },
              ...(family === "digiXros"
                ? [
                    {
                      ...request,
                      options: {
                        ...request.options,
                        digiXrosMaterialLimits: [
                          { candidateInstanceIds: request.options?.candidateInstanceIds ?? [], max: 0 },
                        ],
                      },
                    },
                  ]
                : []),
            ]) {
              delegated(teacher, view, blocked);
            }
            if (family === "digiXros")
              selected(
                teacher.answerDecision(view, {
                  ...request,
                  options: {
                    ...request.options,
                    digiXrosMaterialLimits: [{ candidateInstanceIds: [s.inst("material").instanceId], max: 0 }],
                  },
                }),
                [s.inst("source").instanceId],
              );
          }
          expect(s.engine.applyIntent(seat, await policy.answerDecision(buildBotView(s.state, seat), request))).toEqual(
            { ok: true },
          );
        }
        await settle(() => mainActionReady(s.engine));
        expect(materialRequests).toBe(1);
        const unit = s.state.players[seat]!.battleArea.find(
          (p) => p.topCard.instanceId === s.inst("played").instanceId,
        )!;
        expect(unit.stack.map((c) => c.instanceId)).toEqual([s.inst("material").instanceId]);
        expect(
          windows
            .filter((w) => w.request?.options?.assemblyCardId || w.request?.options?.digiXrosCardId)
            .map((w) => w.selected.length),
        ).toEqual([0, 1]);
        expect(s.state.memory).toBe(family === "assembly" ? 6 : -3);
        expect(s.events.filter((e) => e.kind === "actionRejected")).toEqual([]);
      });
    }

    it("delegates unrelated, unrecognized and no-valid-material requests unchanged", async () => {
      const s = setupEngine({ [seat]: { hand: ["BT26-073"], trash: ["BT26-015"] } });
      s.state.turnSeat = seat;
      await s.ready();
      const teacher = createTrainingTeacher(s.engine, seat, 7);
      const view = buildBotView(s.state, seat)!;
      const base = {
        decisionId: "unrelated",
        seat,
        kind: "selectCards" as const,
        promptText: "Assembly DigiXros words are not structured admission",
        options: { min: 0, max: 1, candidateInstanceIds: [s.state.players[seat]!.trash[0]!.instanceId] },
      };
      for (const request of [
        base,
        { ...base, options: { ...base.options, assemblyCardId: "BT26-073" } },
        { ...base, options: { ...base.options, digiXrosCardId: "BT10-077" } },
        { ...base, options: { ...base.options, assemblyCardId: "BAD" } },
      ]) {
        expect(teacher.answerDecision(view, request)).toEqual(createEvaluationPolicy().answerDecision(view, request));
      }
    });
  });
}
