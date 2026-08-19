import { describe, expect, it } from "vitest";
import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../index.js";

const CARD_ID = "EX9-021";

function source(permanentId = "ex9-021-permanent"): CardSource {
  return {
    instanceId: "EX9-021#test",
    cardId: CARD_ID,
    ownerSeat: 0,
    definition: {
      cardId: CARD_ID,
      set: "EX9",
      nameEn: "Omnimon Alter-S",
      kinds: [CardKind.Digimon],
      colors: [CardColor.Red, CardColor.Blue],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () => ({ permanentId } as never),
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as CardSource;
}

describe("EX9-021 — End of Attack timing", () => {
  it("exposes the clause at OnEndAttack, not as a battle-win watcher", () => {
    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.OnEndAttack, source())).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source())).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnEndBattle, source())).toHaveLength(0);
  });

  it("only triggers for an attack declared by this Digimon", () => {
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnEndAttack, source())[0]!;
    const ctx = { trigger: { attackerPermanentId: "other-attacker" } } as never;
    expect(effect.canTrigger?.(ctx)).toBe(false);
  });
});
