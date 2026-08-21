import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-048 Floramon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-048", as: "floramon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("floramon").currentDP).toBe(s.perm("floramon").baseDP);
  });
});
