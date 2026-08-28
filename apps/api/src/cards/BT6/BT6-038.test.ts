import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-038.js";

describe("BT6-038 Apemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-038", as: "apemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("apemon").currentDP).toBe(s.perm("apemon").baseDP);
  });
});
