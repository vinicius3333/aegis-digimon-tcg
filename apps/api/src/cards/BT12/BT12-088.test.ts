import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-088.js";

describe("BT12-088 handwritten module", () => {
  it("registers its printed OnStartTurn effect without declarative effect record", () => {
    const module = getEffectModule("BT12-088");
    expect(module?.cardId).toBe("BT12-088");
    const source = {
      instanceId: "source-088",
      cardId: "BT12-088",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source).length).toBeGreaterThan(0);
  });
});
