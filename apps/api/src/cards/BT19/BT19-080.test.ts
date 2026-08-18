import { describe, expect, it } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT19-080.js";

const definition: CardDefinition = {
  cardId: "BT19-080", set: "BT19", nameEn: "Takato Matsuki", kinds: ["Tamer"] as never,
  colors: ["Red"] as never, playCost: 4, dp: 0, evoCosts: [], maxCountInDeck: 4,
};
const instance = { cardId: "BT19-080", instanceId: "BT19-080-test", ownerSeat: 0, faceUp: true } as CardInstance;
const source: CardSource = {
  instanceId: instance.instanceId, cardId: "BT19-080", ownerSeat: 0, definition,
  permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true,
};

describe("BT19-080 Takato Matsuki", () => {
  it("fires the Growlmon/Gallantmon clause only in the digivolution window", () => {
    const module = getEffectModule("BT19-080");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });
});
