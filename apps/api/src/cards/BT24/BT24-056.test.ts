import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../index.js";

describe("BT24-056 Dezipmon", () => {
  it("protects one own System/Life/Transmutation Digimon on both entry timings", () => {
    const module = getEffectModule("BT24-056");
    for (const timing of [EffectTiming.OnEnterFieldAnyone, EffectTiming.WhenDigivolving]) {
      const effect = module?.effectsForTiming(timing, {} as never)?.[0];
      expect(effect?.description).toContain("can't return 1 of your Digimon");
    }
  });
});
