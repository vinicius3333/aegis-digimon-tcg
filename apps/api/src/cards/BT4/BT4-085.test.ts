import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-085.js";

describe("BT4-085 Phantomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-085", as: "phantomon", under: ["BT4-081"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("phantomon").currentDP).toBe(s.perm("phantomon").baseDP);
  });
});
