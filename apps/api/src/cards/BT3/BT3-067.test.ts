import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT3-067 Hagurumon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-067", as: "hagurumon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("hagurumon").currentDP).toBe(s.perm("hagurumon").baseDP);
  });
});
