import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-053.js";

describe("BT25-053 Aegiochusmon: Green", () => {
  it("registers both suspension timings and matches the security boundary", () => {
    expect(getCardDefinition("BT25-053")).toMatchObject({ nameEn: "Aegiochusmon: Green", level: 5, playCost: 8 });
    const module = getEffectModule("BT25-053")!;
    expect(module.cardId).toBe("BT25-053");
    expect(module.effectsForTiming(EffectTiming.OnPlay, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, {} as never)).toHaveLength(1);
  });
});
