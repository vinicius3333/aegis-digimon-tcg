import { describe, expect, it } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT21-087.js";

describe("BT21-087 Zenith", () => {
  it("registers a real reveal/play-or-add/trash-rest On Play effect and Security skill", () => {
    const module = getEffectModule("BT21-087");
    expect(module).toBeDefined();
    const source: CardSource = {
      instanceId: "INST#ZENITH",
      cardId: "BT21-087",
      ownerSeat: 0 as Seat,
      definition: {
        cardId: "BT21-087",
        set: "BT21",
        nameEn: "Zenith",
        kinds: ["Tamer"] as never,
        colors: ["Black"] as never,
        playCost: 4,
        dp: 0,
        evoCosts: [],
        maxCountInDeck: 4,
      } as CardDefinition,
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)[0]?.description).toContain("Trash the rest");
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)[0]?.isSecurity).toBe(true);
  });
});
