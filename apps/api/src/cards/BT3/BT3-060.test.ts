import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT3-060 Psychemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-060", as: "psychemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("psychemon").currentDP).toBe(s.perm("psychemon").baseDP);
  });
});
