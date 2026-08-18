import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-041.js";

describe("BT2-041 ShineGreymon", () => {
  it("suspends yellow Tamers and gives -4000 DP for each", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-038", as: "base" }, { card: "BT1-087", as: "t1" }, { card: "BT2-087", as: "t2" }], hand: [{ card: "BT2-041", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-020", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP <= 4000);
    expect(s.perm("t1").isSuspended).toBe(true);
    expect(s.perm("t2").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBeLessThanOrEqual(4000);
  });

  it("gets +1000 DP for each Tamer its owner has in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-041", as: "shinegreymon" }, "BT1-087", "BT2-087"] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("shinegreymon").currentDP).toBe(s.perm("shinegreymon").baseDP + 2000);
  });
});
