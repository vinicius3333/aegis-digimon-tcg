import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-083.js";

describe("BT3-083 Meramon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-083", as: "meramon", under: ["BT3-076"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("meramon").currentDP).toBe(s.perm("meramon").baseDP);
  });
});
