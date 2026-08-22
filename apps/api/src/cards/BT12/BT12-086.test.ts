import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-086.js";

describe("BT12-086 handwritten module", () => {
  it("registers its printed OnPlay effect without declarative effect record", () => {
    const module = getEffectModule("BT12-086");
    expect(module?.cardId).toBe("BT12-086");
    const source = {
      instanceId: "source-086",
      cardId: "BT12-086",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
  });
});

it("adds up to two differently colored Save Digimon from the reveal", async () => {
  const s = setupEngine({
    0: {
      hand: [{ card: "BT12-086", as: "clock" }],
      deck: ["BT12-008", "BT12-058", "BT1-009"],
    },
  }, { autoSelectCards: true, autoOrderCards: true });
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("clock").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.length >= 2);
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
    expect.arrayContaining(["BT12-008", "BT12-058"]),
  );
});
