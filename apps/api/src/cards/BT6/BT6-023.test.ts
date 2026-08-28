import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT6-023 Octomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-023", as: "octomon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("octomon").currentDP).toBe(s.perm("octomon").baseDP);
  });
});
