import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-069 Blimpmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-069", as: "blimpmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("blimpmon").currentDP).toBe(s.perm("blimpmon").baseDP);
  });
});
