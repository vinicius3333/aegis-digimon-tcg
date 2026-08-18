import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-083.js";

describe("BT1-083 GranKuwagamon", () => {
  it("has Piercing and gets +4000 DP on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-083", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasPierce(s.perm("digimon"))).toBe(true);
    expect(s.perm("digimon").currentDP).toBe(15000);
  });
});
