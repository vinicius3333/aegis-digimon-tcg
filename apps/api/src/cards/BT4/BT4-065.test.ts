import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-065 Gotsumon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-065", as: "gotsumon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("gotsumon").currentDP).toBe(s.perm("gotsumon").baseDP);
  });
});
