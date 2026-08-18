import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-098.js";

describe("BT12-098 handwritten module", () => {
  it("registers its printed OnPlay effect without declarative effect record", () => {
    const module = getEffectModule("BT12-098");
    expect(module?.cardId).toBe("BT12-098");
    const source = {
      instanceId: "source-098",
      cardId: "BT12-098",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
  });
});
