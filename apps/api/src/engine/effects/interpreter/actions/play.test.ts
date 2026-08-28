import { describe, expect, it } from "vitest";
import { playCostScalingDelta } from "./play.js";

describe("PlayWithoutCost play-cost scaling", () => {
  it("adds the computed factor by default and honors an explicit additive bonus", () => {
    expect(playCostScalingDelta({ per: 1, unit: "cards" }, 3)).toBe(3);
    expect(playCostScalingDelta({ per: 1, unit: "cards", bonus: 2 }, 3)).toBe(6);
  });

  it("subtracts the requested amount per factor with precedence over bonus", () => {
    expect(playCostScalingDelta({ per: 1, unit: "cards", subtract: 1 }, 3)).toBe(-3);
    expect(playCostScalingDelta({ per: 1, unit: "cards", bonus: 99, subtract: 2 }, 3)).toBe(-6);
  });
});
