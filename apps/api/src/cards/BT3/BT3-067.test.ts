import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-067.js";

describe("BT3-067 Tankmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-067", as: "tankmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("tankmon").currentDP).toBe(s.perm("tankmon").baseDP);
  });
});
