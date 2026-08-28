import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-082.js";

describe("BT4-082 Dobermon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-082", as: "dobermon", under: ["BT4-077"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("dobermon").currentDP).toBe(s.perm("dobermon").baseDP);
  });
});
