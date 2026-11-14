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
