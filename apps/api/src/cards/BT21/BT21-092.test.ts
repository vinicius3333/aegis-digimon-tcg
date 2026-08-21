import { describe, expect, it } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT21-092.js";

describe("BT21-092 Can't Turn My Back!", () => {
  it("registers color waiver, stack transfer with cost scaling, and Security add-to-hand", () => {
    const module = getEffectModule("BT21-092");
    const source: CardSource = {
      instanceId: "INST#092",
      cardId: "BT21-092",
      ownerSeat: 0 as Seat,
      definition: {
        cardId: "BT21-092",
        set: "BT21",
        nameEn: "Can't Turn My Back!",
        kinds: ["Option"] as never,
        colors: ["Red"] as never,
        playCost: 2,
        dp: 0,
        evoCosts: [],
        maxCountInDeck: 4,
      } as CardDefinition,
      permanent: () => undefined,
      isOnBattleArea: () => false,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };
    expect(module).toBeDefined();
    const waiver = module!.effectsForTiming(EffectTiming.None, source);
    expect(waiver).toHaveLength(1);
    expect(waiver[0]?.description).toContain("[Xros Heart] Digimon");
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
});
