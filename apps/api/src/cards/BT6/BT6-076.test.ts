import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT6-076 Feresmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-076", as: "feresmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("feresmon").currentDP).toBe(s.perm("feresmon").baseDP);
  });
});
