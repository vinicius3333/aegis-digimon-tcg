import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT4-010 Fugamon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-010", as: "fugamon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("fugamon").currentDP).toBe(s.perm("fugamon").baseDP);
  });
});
