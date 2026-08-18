import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import module from "./BT11-068.js";
describe("BT11-068 Mamemon", () => {
  it("registers both reveal timings as dedicated effects", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-068", as: "mamemon" }] } });
    const permanent = s.perm("mamemon");
    const source: CardSource = {
      instanceId: permanent.topCard!.instanceId,
      cardId: "BT11-068",
      ownerSeat: 0,
      definition: getCardDefinition("BT11-068")!,
      permanent: () => permanent,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    expect(module.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });
});
