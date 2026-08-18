import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-054 Piximon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-054", as: "piximon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("piximon").currentDP).toBe(s.perm("piximon").baseDP);
  });
});
