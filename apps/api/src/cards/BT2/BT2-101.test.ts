import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-101.js";

describe("BT2-101 Needle Spray", () => {
  it("suspends all opposing Digimon at 6000 DP or less", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-042"], hand: [{ card: "BT2-101", as: "option" }] }, 1: { battleArea: [{ card: "BT2-045", as: "small" }, { card: "BT2-047", as: "large" }] } }, { autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("small").isSuspended);
    expect(s.perm("small").isSuspended).toBe(true);
    expect(s.perm("large").isSuspended).toBe(false);
  });

  it("activates its Main suspension effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-101", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT2-045", as: "target" }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
