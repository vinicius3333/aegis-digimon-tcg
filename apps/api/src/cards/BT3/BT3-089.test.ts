import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT3-089 Boltmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-089", as: "boltmon", under: ["BT3-085"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("boltmon").currentDP).toBe(s.perm("boltmon").baseDP);
  });
});
