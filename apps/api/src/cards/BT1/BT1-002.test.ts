import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-002.js";
import "./BT1-022.js";

describe("BT1-002 Bebydomon", () => {
  it("gives +2000 DP while its Digimon has Piercing during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-022", as: "host", dp: 5000, under: ["BT1-002"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
