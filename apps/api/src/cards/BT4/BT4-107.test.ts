import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-107.js";

describe("BT4-107 Pollen Spray", () => {
  it("adds every revealed Digi-Burst Digimon and suspends one opponent per card added", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT4-059"], hand: [{ card: "BT4-107", as: "option" }], deck: ["BT4-012", "BT4-059", "BT4-003"] }, 1: { battleArea: [{ card: "BT4-045", as: "first" }, { card: "BT4-063", as: "second" }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2 && s.perm("first").isSuspended && s.perm("second").isSuspended);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT4-012", "BT4-059"]);
    expect([s.perm("first").isSuspended, s.perm("second").isSuspended]).toEqual([true, true]);
  });

  it("activates the full Main effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-107", as: "securityOption", faceUp: true }], deck: ["BT4-012", "BT4-003", "BT4-004"] }, 1: { battleArea: [{ card: "BT4-045", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT4-012");
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
