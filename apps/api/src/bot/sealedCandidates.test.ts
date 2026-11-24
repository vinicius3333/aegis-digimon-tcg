import { createEvaluationPolicy } from "#api/bot/policy";
import { createBaselinePolicy } from "#api/bot/baselinePolicy";
import { applyPlannedAction } from "#api/bot/evolution/applyPlannedAction";
import { trainingObservation } from "#api/bot/training/observation";
import { expect, it } from "vitest";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import { digivolveCost, enumerateMainPhaseCandidates } from "#api/bot/candidates";
import { buildBotView } from "#api/bot/view";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/sealed-color-and-breeding.fixture";

it("offers sealed fallback evolution candidates without waiving constructed colors", () => {
  const s = setupScenario(fixture);
  s.state.rulesPolicy = GameRulesPolicy.SEALED.value;
  const view = buildBotView(s.state, 0)!;
  for (const card of view.hand) {
    card.digivolveCosts = undefined;
  }
  expect(enumerateMainPhaseCandidates(view)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "digivolve",
        intent: {
          type: "digivolve",
          permanentId: s.perm("blue-rookie").permanentId,
          instanceId: s.inst("red-champion").instanceId,
        },
        cost: 2,
      }),
    ]),
  );
  expect(digivolveCost("BT1-016", "BT1-029")).toBeUndefined();
});

it.each([GameRulesPolicy.CONSTRUCTED.value, GameRulesPolicy.SEALED.value])(
  "prices cross-color development under %s",
  (policy) => {
    const s = setupScenario(fixture);
    s.state.rulesPolicy = policy;
    const view = buildBotView(s.state, 0)!;
    const base = view.board[0]!;
    const breedingView = { ...view, board: [], breeding: { ...base, inBreeding: true } };
    const bot = createBaselinePolicy();
    const evaluation = createEvaluationPolicy();
    const sealed = policy === GameRulesPolicy.SEALED.value;
    expect(evaluation.chooseBreedingAction(breedingView).type).toBe(sealed ? "endPhase" : "moveFromBreeding");
    expect(bot.chooseBreedingAction(breedingView).type).toBe(sealed ? "endPhase" : "moveFromBreeding");
    expect(bot.chooseMainAction(breedingView).type).toBe(sealed ? "digivolve" : "playCard");
    const rookie = s.inst("rookie").instanceId;
    const next = applyPlannedAction(
      {
        observation: trainingObservation(s.state, 0),
        actions: [
          { intent: { type: "playCard", instanceId: rookie }, label: "Play", sourceId: rookie, projectedCost: 2 },
        ],
        ended: false,
        won: false,
        plannedPermanents: 0,
      },
      0,
    );
    expect(
      next.actions.some(
        (action) =>
          action.intent.type === "digivolve" &&
          action.sourceId === s.inst("red-champion").instanceId &&
          action.projectedCost === 2,
      ),
    ).toBe(sealed);
  },
);
