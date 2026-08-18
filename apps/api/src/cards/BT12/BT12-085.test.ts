import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-085.js";

describe("BT12-085 handwritten module", () => {
  it("registers its printed WhenDigivolving effect without declarative effect record", () => {
    const module = getEffectModule("BT12-085");
    expect(module?.cardId).toBe("BT12-085");
    const source = {
      instanceId: "source-085",
      cardId: "BT12-085",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});
