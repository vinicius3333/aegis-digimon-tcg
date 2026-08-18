import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-103.js";

describe("BT2-103 DarkTyrannomon", () => {
  it("gives one Digimon +3000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-052", as: "target" }], hand: [{ card: "BT2-103", as: "option" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("unsuspends one of its Digimon with Blocker from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-103", as: "securityOption", faceUp: true }], battleArea: [{ card: "BT2-054", as: "blocker", suspended: true }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("blocker").isSuspended).toBe(false);
  });
});
