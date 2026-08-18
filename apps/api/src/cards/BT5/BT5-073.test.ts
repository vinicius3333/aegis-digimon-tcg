import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-073 Pillomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-073", as: "pillomon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("pillomon").currentDP).toBe(s.perm("pillomon").baseDP);
  });
});
