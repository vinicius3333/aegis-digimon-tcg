import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-013 Triceramon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-013", as: "triceramon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("triceramon").currentDP).toBe(s.perm("triceramon").baseDP);
  });
});
