import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-014 Vermilimon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-014", as: "vermilimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("vermilimon").currentDP).toBe(s.perm("vermilimon").baseDP);
  });
});
