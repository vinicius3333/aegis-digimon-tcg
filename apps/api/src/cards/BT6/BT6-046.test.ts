import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-046.js";

describe("BT6-046 Pomumon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-046", as: "pomumon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("pomumon").currentDP).toBe(s.perm("pomumon").baseDP);
  });
});
