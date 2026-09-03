import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-050.js";

describe("BT4-050 Liollmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-050", as: "liollmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("liollmon").currentDP).toBe(s.perm("liollmon").baseDP);
  });
});
