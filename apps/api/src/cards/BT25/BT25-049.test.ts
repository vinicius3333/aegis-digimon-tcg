import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-049.js";

describe("BT25-049 Armalizamon", () => {
  it("matches the catalog and models both suspension timings", () => {
    expect(getCardDefinition("BT25-049")).toMatchObject({
      nameEn: "Armalizamon",
      level: 4,
      playCost: 4,
      types: ["Reptile", "Glowing Dawn", "BEATBREAK"],
      effectText: expect.stringContaining("bottom face-down card under any of your Tamers"),
    });
    const BT25_049 = getEffectModule("BT25-049")!;
    expect(BT25_049.effectsForTiming).toBeTypeOf("function");
    expect(BT25_049.effectsForTiming(EffectTiming.OnPlay, {} as never)).toHaveLength(1);
    expect(BT25_049.effectsForTiming(EffectTiming.WhenDigivolving, {} as never)).toHaveLength(1);
  });
});
