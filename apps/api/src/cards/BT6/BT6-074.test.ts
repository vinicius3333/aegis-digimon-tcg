import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-074.js";

describe("BT6-074 Boogiemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-074", as: "boogiemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("boogiemon").currentDP).toBe(s.perm("boogiemon").baseDP);
  });
});
