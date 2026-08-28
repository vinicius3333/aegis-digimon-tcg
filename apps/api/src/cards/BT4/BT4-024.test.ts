import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-024 Tobiumon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-024", as: "tobiumon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("tobiumon").currentDP).toBe(s.perm("tobiumon").baseDP);
  });
});
