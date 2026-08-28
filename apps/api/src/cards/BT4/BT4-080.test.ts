import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-080 Bakemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-080", as: "bakemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("bakemon").currentDP).toBe(s.perm("bakemon").baseDP);
  });
});
