import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-022 Sangomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-022", as: "sangomon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("sangomon").currentDP).toBe(s.perm("sangomon").baseDP);
  });
});
