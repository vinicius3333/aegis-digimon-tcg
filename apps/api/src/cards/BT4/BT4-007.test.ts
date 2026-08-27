import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-007 Otamamon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-007", as: "otamamon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("otamamon").currentDP).toBe(s.perm("otamamon").baseDP);
  });
});
