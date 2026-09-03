import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-043.js";

describe("BT4-043 Crowmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-043", as: "crowmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("crowmon").currentDP).toBe(s.perm("crowmon").baseDP);
  });
});
