import { describe, expect, it } from "vitest";
import { materializeLevelComparisonScaling, playCostScalingDelta } from "./play.js";

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

describe("PlayWithoutCost level scaling", () => {
  it("materializes a dynamic level ceiling for loose-card matching", () => {
    const target = {
      filter: {
        levelComparison: {
          op: "lte" as const,
          value: 4,
          scaling: { per: 2, unit: "cards" as const },
        },
      },
      count: 1,
    };

    expect(materializeLevelComparisonScaling(target, 1)).toEqual({
      filter: { levelComparison: { op: "lte", value: 5 } },
      count: 1,
    });
  });

  it("leaves static level ceilings unchanged", () => {
    const target = { filter: { levelComparison: { op: "lte" as const, value: 4 } }, count: 1 };
    expect(materializeLevelComparisonScaling(target, 3)).toEqual(target);
  });
});
