import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import module from "./BT11-105.js";
describe("BT11-105 Fusionize", () => {
  it("registers a dedicated optional security reveal effect", () => {
    const s = setupEngine({ 0: { security: [{ card: "BT11-105", as: "fusionize" }] } });
    const card = s.inst("fusionize");
    const source: CardSource = {
      instanceId: card.instanceId,
      cardId: card.cardId,
      ownerSeat: 0,
      definition: getCardDefinition(card.cardId)!,
      permanent: () => undefined,
      isOnBattleArea: () => false,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effects = module.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]?.isSecurity).toBe(true);
    expect(effects[0]?.optional).toBe(true);
  });
});
