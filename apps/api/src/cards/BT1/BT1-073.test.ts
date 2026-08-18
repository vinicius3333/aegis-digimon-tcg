import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-073.js";

describe("BT1-073 Kabuterimon", () => {
  it("gives +1000 DP for each suspended opposing Digimon during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] }, 1: { battleArea: [{ card: "BT1-016", suspended: true }, { card: "BT1-017", suspended: true }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
