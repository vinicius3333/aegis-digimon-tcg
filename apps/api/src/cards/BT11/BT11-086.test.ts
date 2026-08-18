import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-086.js";
describe("BT11-086 Mervamon", () => {
  it("grants Rush and Blocker to Xros Heart Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-086", as: "merva" },
          { card: "BT10-008", as: "xros" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("xros"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("xros"), "Blocker")).toBe(true);
  });
});
