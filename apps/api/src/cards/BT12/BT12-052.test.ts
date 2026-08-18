import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-052.js";

describe("BT12-052 handwritten module", () => {
  it("registers as a no-effect definition", () => {
    const module = getEffectModule("BT12-052");
    expect(module?.cardId).toBe("BT12-052");
    const source = {
      instanceId: "source-052",
      cardId: "BT12-052",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.None, source)).toEqual([]);
  });
});
