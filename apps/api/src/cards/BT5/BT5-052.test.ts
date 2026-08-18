import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-052 Garbagemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-052", as: "garbagemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("garbagemon").currentDP).toBe(s.perm("garbagemon").baseDP);
  });
});
