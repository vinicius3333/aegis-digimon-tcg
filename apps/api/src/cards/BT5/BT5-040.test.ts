import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-040 SuperStarmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-040", as: "superStarmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("superStarmon").currentDP).toBe(s.perm("superStarmon").baseDP);
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-040")).toBeDefined();
    expect(runtimeCompiledCard("BT5-040")).toMatchObject({ effects: [], coverage: "full", residual: [] });
  });
});
