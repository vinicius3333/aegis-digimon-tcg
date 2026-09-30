// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  activePacing,
  DEFAULT_PACING,
  EFFECT_SPEED_SCALE,
  getEffectSpeed,
  scalePacing,
  setBasePacing,
  setEffectSpeed,
  SPEED_SCALED_KNOBS,
} from "./pacing";

afterEach(() => {
  setEffectSpeed("normal");
  setBasePacing(DEFAULT_PACING);
  localStorage.clear();
});

describe("pacing config", () => {
  it("scales the watched beats and leaves safety bounds and counts alone", () => {
    const fast = scalePacing(DEFAULT_PACING, 0.5);
    for (const knob of SPEED_SCALED_KNOBS) expect(fast[knob]).toBe(Math.round(DEFAULT_PACING[knob] * 0.5));
    expect(fast.announceMaxMs).toBe(DEFAULT_PACING.announceMaxMs);
    expect(fast.budgetCeilingMs).toBe(DEFAULT_PACING.budgetCeilingMs);
    expect(fast.minChainLength).toBe(DEFAULT_PACING.minChainLength);
  });

  it("applies the Effect speed on top of the base config and remembers it", () => {
    setBasePacing({ ...DEFAULT_PACING, announceMs: 1000 });
    setEffectSpeed("slow");
    expect(getEffectSpeed()).toBe("slow");
    expect(activePacing().announceMs).toBe(Math.round(1000 * EFFECT_SPEED_SCALE.slow));
    expect(localStorage.getItem("aegis.effect-speed")).toBe("slow");
  });
});
