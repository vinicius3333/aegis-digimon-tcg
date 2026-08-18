import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-040 Diatrymon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-040", as: "diatrymon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("diatrymon").currentDP).toBe(s.perm("diatrymon").baseDP);
  });
});
