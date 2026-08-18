import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-096.js";

describe("BT12-096 handwritten module", () => {
  it("registers its printed OnStartTurn effect without declarative effect record", () => {
    const module = getEffectModule("BT12-096");
    expect(module?.cardId).toBe("BT12-096");
    const source = {
      instanceId: "source-096",
      cardId: "BT12-096",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source).length).toBeGreaterThan(0);
  });
});
