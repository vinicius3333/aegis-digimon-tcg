import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-056 SkullScorpiomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-056", as: "skullScorpiomon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("skullScorpiomon").currentDP).toBe(s.perm("skullScorpiomon").baseDP);
  });
});
