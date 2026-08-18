import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT3-076 Candlemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-076", as: "candlemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("candlemon").currentDP).toBe(s.perm("candlemon").baseDP);
  });
});
