import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT3-078 Shamanmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-078", as: "shamanmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("shamanmon").currentDP).toBe(s.perm("shamanmon").baseDP);
  });
});
