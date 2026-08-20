import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT14-046.js";

describe("BT14-046", () => {
  const source = { instanceId: "source", cardId: "BT14-046", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the before-pay-cost suspend reduction and inherited green-Tamer evo reduction", () => {
    expect(getEffectModule("BT14-046")!.effectsForTiming(EffectTiming.BeforePayCost, source)).toHaveLength(1);
    expect(getEffectModule("BT14-046")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });
});
