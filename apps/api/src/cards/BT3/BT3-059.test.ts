import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT3-059 Commandramon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-059", as: "commandramon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("commandramon").currentDP).toBe(s.perm("commandramon").baseDP);
  });
});
