import type { DecisionRequest } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "#api/cards/index";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/borrowed-succession-effect-names-its-printed-card.fixture";

const JUPITERMON_CLAUSE =
  "[On Play] [When Digivolving] Trash your top security card and 1 of your opponent's Digimon gets -13000 DP until their turn ends. Then, if you have 1 or fewer security cards, ＜Recovery +2 (Deck)＞";

async function activateSuccessionOnPlayAtEndOfTurn(verify: (s: EngineSetup) => Promise<void> | void) {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1);
    await verify(s);
  } finally {
    if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "surrender" });
    await loop;
  }
}

function borrowedEffectChoice(s: EngineSetup): DecisionRequest {
  return s.decisions.find(
    ({ req }) => req.kind === "chooseOption" && req.sourceCardId === "BT24-102" && req.options?.choiceEffects,
  )!.req;
}

describe("activating an effect a Digimon gained through Succession", () => {
  it("names the digivolution card each offered effect is printed on", () =>
    activateSuccessionOnPlayAtEndOfTurn((s) => {
      expect(borrowedEffectChoice(s).options!.choiceEffects).toEqual([
        { cardId: "BT26-103", timing: "WhenDigivolving" },
        { cardId: "BT24-101", timing: "OnPlay" },
        { cardId: "BT24-101", timing: "WhenDigivolving" },
      ]);
    }));

  it("offers each route of a combined effect as its printed clause under its own timing", () =>
    activateSuccessionOnPlayAtEndOfTurn((s) => {
      const { choices, choiceEffects } = borrowedEffectChoice(s).options!;

      expect(choices!.slice(1)).toEqual([JUPITERMON_CLAUSE, JUPITERMON_CLAUSE]);
      expect(choiceEffects!.slice(1).map(({ timing }) => timing)).toEqual(["OnPlay", "WhenDigivolving"]);
    }));

  it("logs the activated effect under the card it is printed on", () =>
    activateSuccessionOnPlayAtEndOfTurn((s) => {
      const notices = s.events.filter(
        (event) => event.kind === "effectTriggered" && event.activatedBy?.cardId === "BT24-102",
      );

      expect(notices).toHaveLength(1);
      expect(notices[0]).toMatchObject({
        sourceCardId: "BT24-101",
        sourceInstanceId: s.inst("jupitermon").instanceId,
        sourcePermanentId: s.perm("wrathMode").permanentId,
        timing: "OnPlay",
        description: JUPITERMON_CLAUSE,
      });
      expect(s.state.players[0]!.security).toHaveLength(4);
      expect(s.perm("homeros").isSuspended).toBe(true);
    }));

  it("orders the Succession-gained security watcher as a main effect", () =>
    activateSuccessionOnPlayAtEndOfTurn((s) => {
      const order = s.decisions.find(
        ({ req }) => req.kind === "orderTriggers" && req.options?.triggerCardIds?.includes("BT24-101"),
      )!.req.options!;
      const gained = order.triggerCardIds!.indexOf("BT24-101");

      expect(order.triggerCardIds).toEqual(expect.arrayContaining(["BT26-103", "BT24-101"]));
      expect(order.triggerIsInherited![gained]).toBe(false);
      expect(order.triggerDescriptions![gained]).toContain("[All Turns] [Once Per Turn]");
      expect(s.state.players[1]!.security).toHaveLength(4);
    }));
});
