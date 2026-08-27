import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-053 Roachmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-053", as: "roachmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("roachmon").currentDP).toBe(s.perm("roachmon").baseDP);
  });
});
