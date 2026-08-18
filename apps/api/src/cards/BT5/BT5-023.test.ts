import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-023 Gesomon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-023", as: "gesomon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("gesomon").currentDP).toBe(s.perm("gesomon").baseDP);
  });
});
