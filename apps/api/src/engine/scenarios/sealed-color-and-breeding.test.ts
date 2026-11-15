import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/sealed-color-and-breeding.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { advance } from "#api/engine/testkit/advance";
import { breedingActions, mainActions } from "#api/bot/training/actions";

it.each(["moveFromBreeding", "hatchEgg", "placeSealedRookie"] as const)(
  "rejects immediate placement → %s without playing, paying or drawing",
  async (second) => {
    const s = setupScenario(fixture);
    s.state.rulesPolicy = GameRulesPolicy.SEALED.value;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.engine.breeding.isOpen);
      const rookie = s.inst("rookie");
      const intent = { type: "placeSealedRookie", instanceId: rookie.instanceId } as const;
      expect(breedingActions(s.engine, 0).some((action) => action.intent.type === intent.type)).toBe(true);
      const memory = s.state.memory;
      const deck = s.state.players[0]!.deck.map((card) => card.instanceId);
      const hand = s.state.players[0]!.hand.map((card) => card.instanceId);
      const battle = s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId);
      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
      const placed = s.state.players[0]!.breeding!;
      const afterPlacement = s.state.toJSON();
      const placementEvents = [...s.events];
      expect(s.state.phase).toBe(Phase.Breeding);
      expect(s.engine.breeding.isOpen).toBe(false);
      expect(s.engine.breeding.isActionSpent).toBe(false);
      const secondIntent =
        second === "moveFromBreeding"
          ? { type: second, permanentId: placed.permanentId }
          : { type: second, instanceId: rookie.instanceId };
      expect.soft(s.engine.applyIntent(0, secondIntent)).toEqual({ ok: false, reason: "wrong-phase" });
      expect(s.state.toJSON()).toEqual(afterPlacement);
      expect(s.events).toEqual(placementEvents);
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(rookie.instanceId);
      expect(s.state.players[0]!.breeding?.topCard.faceUp).toBe(true);
      expect(s.state.memory).toBe(memory);
      expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deck);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
        hand.filter((id) => id !== rookie.instanceId),
      );
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(battle);
      expect(s.state.players[0]!.breeding?.inBreeding).toBe(true);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.events.some((event) => event.kind === "cardPlayed")).toBe(false);
      expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === rookie.cardId)).toBe(
        false,
      );
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it("waives only digivolution colors and projects the same legal action while retaining Option colors", async () => {
  const s = setupScenario(fixture);
  s.state.rulesPolicy = GameRulesPolicy.SEALED.value;
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.engine.breeding.isOpen);
    s.engine.applyIntent(0, { type: "endPhase" });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red-option").instanceId }).ok).toBe(false);
    const intent = {
      type: "digivolve",
      instanceId: s.inst("red-champion").instanceId,
      permanentId: s.perm("blue-rookie").permanentId,
    } as const;
    expect(mainActions(s.engine, 0).some((action) => JSON.stringify(action.intent) === JSON.stringify(intent))).toBe(
      true,
    );
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.perm("blue-rookie").topCard.cardId).toBe("BT1-016");
    expect(s.state.phase).toBe(Phase.Main);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
