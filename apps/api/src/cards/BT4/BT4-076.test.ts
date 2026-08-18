import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-076 Gabumon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-076", as: "gabumon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("gabumon").currentDP).toBe(s.perm("gabumon").baseDP);
  });
});
