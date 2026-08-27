import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-085 Phantomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-085", as: "phantomon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("phantomon").currentDP).toBe(s.perm("phantomon").baseDP);
  });
});
