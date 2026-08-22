import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-060.js";

describe("BT11-060 Monmon", () => {
  it("continuously prevents opponent-effect returns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-060", as: "monmon" },
          { card: "BT1-075", as: "neighbor" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("monmon"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("neighbor"), "beReturned")).toBe(false);
  });
});
