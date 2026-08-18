import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-052.js";

describe("BT7-052 SaberLeomon", () => {
  it("gets +5000 DP for the turn when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT7-052", as: "evolving" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 15000);
    expect(s.perm("base").currentDP).toBe(15000);
  });
});
