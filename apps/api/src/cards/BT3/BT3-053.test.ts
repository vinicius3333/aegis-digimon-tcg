import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-053.js";

describe("BT3-053 JewelBeemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-053", as: "jewel", under: ["BT2-044"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("jewel").currentDP).toBe(s.perm("jewel").baseDP);
  });
});
