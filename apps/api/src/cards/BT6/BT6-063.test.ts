import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT6-063 BigMamemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-063", as: "bigMamemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("bigMamemon").currentDP).toBe(s.perm("bigMamemon").baseDP);
  });
});
