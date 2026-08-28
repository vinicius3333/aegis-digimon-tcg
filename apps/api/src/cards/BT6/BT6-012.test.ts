import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT6-012 Deltamon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-012", as: "deltamon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("deltamon").currentDP).toBe(s.perm("deltamon").baseDP);
  });
});
