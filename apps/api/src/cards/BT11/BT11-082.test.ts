import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-082.js";

describe("BT11-082 Tuwarmon", () => {
  it("has Decoy and prevents own Yuu Amano from being deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-082", as: "tuwarmon" },
          { card: "BT10-093", as: "yuu" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("tuwarmon"), "Decoy")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("yuu"), "beDeleted")).toBe(true);
  });
});
