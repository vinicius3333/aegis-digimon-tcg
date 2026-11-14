import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import "#api/cards/index";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/sealed-color-and-breeding.fixture";

it("offers a cross-color revealed evolution while preserving Blue Card's destination filter", async () => {
  const s = setupScenario(
    {
      ...fixture,
      board: {
        ...fixture.board,
        0: {
          battleArea: [
            { card: "BT1-029", as: "blue-base" },
            { card: "BT1-086", as: "tamer" },
          ],
          hand: [{ card: "EX2-072", as: "blue-card" }],
          deck: ["BT1-016", ...Array<string>(7).fill("BT1-009")],
          security: 5,
        },
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, autoOrderCards: true, autoChooseOption: true },
  );
  s.state.rulesPolicy = GameRulesPolicy.SEALED.value;
  s.state.phase = Phase.Main;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue-card").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  expect(s.perm("blue-base").topCard.cardId).toBe("BT1-016");
});
