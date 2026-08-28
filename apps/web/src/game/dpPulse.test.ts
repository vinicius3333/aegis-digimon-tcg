import { describe, expect, it } from "vitest";
import { dpPulseKind, dpPulses } from "./dpPulse";

describe("dpPulseKind", () => {
  it("reads a rise as a buff and a fall as a debuff", () => {
    expect(dpPulseKind(3000, 5000)).toBe("buff");
    expect(dpPulseKind(5000, 3000)).toBe("debuff");
  });

  it("marks the debuff that takes a Digimon to nothing, which is held longer", () => {
    expect(dpPulseKind(3000, 0)).toBe("debuffFatal");
    expect(dpPulseKind(3000, -2000)).toBe("debuffFatal");
  });
});

describe("dpPulses", () => {
  it("raises one pulse per figure that moved", () => {
    const pulses = dpPulses({
      previous: new Map([
        ["a", 3000],
        ["b", 5000],
      ]),
      next: new Map([
        ["a", 6000],
        ["b", 5000],
      ]),
      nextKey: 0,
    });
    expect(pulses).toHaveLength(1);
    expect(pulses[0]).toMatchObject({ permanentId: "a", kind: "buff", from: 3000, to: 6000, key: 1 });
  });

  it("says nothing about a permanent that just arrived or just left", () => {
    // Both are already narrated by a cue of their own; a DP pulse on top of an
    // entrance would read as a modifier that never happened.
    expect(dpPulses({ previous: new Map(), next: new Map([["new", 4000]]), nextKey: 0 })).toEqual([]);
    expect(dpPulses({ previous: new Map([["gone", 4000]]), next: new Map(), nextKey: 0 })).toEqual([]);
  });

  it("hands out a fresh key to each pulse so repeats restart their keyframes", () => {
    const pulses = dpPulses({
      previous: new Map([
        ["a", 1000],
        ["b", 1000],
      ]),
      next: new Map([
        ["a", 2000],
        ["b", 500],
      ]),
      nextKey: 10,
    });
    expect(pulses.map((pulse) => pulse.key)).toEqual([11, 12]);
  });
});
