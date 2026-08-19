import { describe, expect, it } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT26-055.js";

const CARD_ID = "BT26-055";

function makeSource(): CardSource {
  const definition: CardDefinition = {
    cardId: CARD_ID,
    set: "BT26",
    nameEn: "Giromon",
    kinds: ["Digimon"] as never,
    colors: ["Black"] as never,
    playCost: 7,
    dp: 7000,
    types: ["Mine", "DM", "Ver.3"],
    evoCosts: [],
    maxCountInDeck: 4,
  };
  return {
    instanceId: "giromon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition,
    permanent: () => ({ permanentId: "giromon-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-055 [Counter] timing", () => {
  it("is exposed through the dedicated Counter window", () => {
    const source = makeSource();
    const module = getEffectModule(CARD_ID);
    expect(module!.effectsForTiming(EffectTiming.OnCounterTiming, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source)).toHaveLength(0);
  });
});
