import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-101.js";

describe("BT1-101 Howling Crusher", () => {
  it("trashes every source under every opposing Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-028"], hand: [{ card: "BT1-101", as: "option" }] }, 1: { battleArea: [{ card: "BT2-047", as: "first", under: ["BT1-001", "BT1-002"] }, { card: "BT2-060", as: "second", under: ["BT1-003"] }] } }, { autoSelectCards: true });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("first").stack.length === 0 && s.perm("second").stack.length === 0);
    expect(s.state.players[1]!.trash).toHaveLength(3);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-101", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT2-047", as: "target", under: ["BT1-001", "BT1-002"] }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });
});
