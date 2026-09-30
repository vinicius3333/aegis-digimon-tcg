import { describe, expect, it } from "vitest";
import { DEFAULT_PACING, PACING_BY_STYLE, PACING_STYLES } from "../game/pacing";
import {
  KNOB_SPECS,
  PACING_KNOBS,
  PACING_PRESETS,
  pacingAsTypeScript,
  parseStoredPacing,
  withKnob,
} from "./pacingTunerModel";

describe("pacing tuner", () => {
  it("has a range for every knob that holds each style's value", () => {
    for (const style of PACING_STYLES)
      for (const knob of PACING_KNOBS) {
        const spec = KNOB_SPECS[knob];
        expect(PACING_BY_STYLE[style][knob]).toBeGreaterThanOrEqual(spec.min);
        expect(PACING_BY_STYLE[style][knob]).toBeLessThanOrEqual(spec.max);
      }
  });

  it("keeps a changed knob inside its range and ignores a non-number", () => {
    expect(withKnob(DEFAULT_PACING, "announceMs", 99_999).announceMs).toBe(KNOB_SPECS.announceMs.max);
    expect(withKnob(DEFAULT_PACING, "settleMs", -5).settleMs).toBe(0);
    expect(withKnob(DEFAULT_PACING, "settleMs", Number.NaN)).toBe(DEFAULT_PACING);
  });

  it("reads a stored config defensively", () => {
    expect(parseStoredPacing(null)).toBe(DEFAULT_PACING);
    expect(parseStoredPacing("not json")).toBe(DEFAULT_PACING);
    expect(parseStoredPacing('{"announceMs":900,"settleMs":"x","extra":1}')).toEqual({
      ...DEFAULT_PACING,
      announceMs: 900,
    });
  });

  it("orders the presets from slowest to fastest", () => {
    const { slow, normal, fast, currentLike } = PACING_PRESETS;
    expect(slow.announceMs).toBeGreaterThan(normal.announceMs);
    expect(fast.announceMs).toBeLessThan(normal.announceMs);
    expect(currentLike.announceMs).toBe(0);
    expect(normal).toBe(DEFAULT_PACING);
  });

  it("copies a literal that reads back as the same config", () => {
    const tuned = withKnob(DEFAULT_PACING, "announceMs", 650);
    const literal = pacingAsTypeScript(tuned);
    expect(literal.startsWith("const TUNED_PACING: PacingConfig = {")).toBe(true);
    const body = literal.slice(literal.indexOf("{"), literal.lastIndexOf("}") + 1);
    const json = body
      .replace(/\/\*\*.*\*\//g, "")
      .replace(/(\w+):/g, '"$1":')
      .replace(/,(\s*})/, "$1");
    expect(JSON.parse(json)).toEqual(tuned);
  });
});
