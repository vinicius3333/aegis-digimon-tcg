import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT5-027 MarineDevimon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-027", as: "marineDevimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("marineDevimon").currentDP).toBe(s.perm("marineDevimon").baseDP);
  });
});
