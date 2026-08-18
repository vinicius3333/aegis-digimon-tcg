import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import module from "./BT11-102.js";

describe("BT11-102 High Mega Blaster", () => {
  it("registers distinct main and security suspension effects", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT11-102", as: "option" }] } });
    const card = s.inst("option");
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
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
});
