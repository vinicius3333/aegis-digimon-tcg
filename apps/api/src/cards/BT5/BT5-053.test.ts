import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-053.js";

describe("BT5-053 Deramon", () => {
  it("gets +2000 DP for each other suspended own Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-053", as: "dera" }, { card: "BT1-009", suspended: true }, { card: "BT1-010", suspended: true }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("dera").currentDP).toBe(s.perm("dera").baseDP + 4000);
  });
});
