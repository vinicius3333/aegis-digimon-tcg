import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST20-01.js";

describe("ST20-01 Koromon", () => {
  it("gives an Adventure host +1000 DP through the inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST20-02", as: "host", under: ["ST20-01"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give the inherited bonus to a non-Adventure host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["ST20-01"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not apply while Koromon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST20-01", as: "koromon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("koromon").currentDP).toBe(s.perm("koromon").baseDP);
  });
});
