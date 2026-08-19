import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-010.js";

describe("BT25-010 Hawkmon", () => {
  it("installs the your-turn evolution-cost reduction and inherited DP effect", () => {
    const module = getEffectModule("BT25-010");
    const effects = module?.effectsForTiming(EffectTiming.None, {} as never) ?? [];
    expect(effects).toHaveLength(2);
    expect(effects[0]?.description).toContain("reduce the digivolution cost by 1");
    expect(effects[1]?.description).toContain("gets +2000 DP");
  });
});
