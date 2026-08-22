import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-094.js";

describe("BT5-094 Rowdy Rocker", () => {
  it("may place a red level 4-or-lower hand card as the bottom source, then draws 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-007", as: "host", under: [{ card: "BT5-001", as: "existing" }] }], hand: [{ card: "BT5-094", as: "option" }, { card: "BT5-012", as: "material" }], deck: [{ card: "BT5-002", as: "draw1" }, { card: "BT5-003", as: "draw2" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.length === 2 && s.state.players[0]!.hand.length === 2);
    expect(s.perm("host").stack[0]!.instanceId).toBe(s.inst("material").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("draw1").instanceId, s.inst("draw2").instanceId]));
  });

  it("does not draw when no qualifying red card is in hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-007", as: "host" }], hand: [{ card: "BT5-094", as: "option" }, { card: "BT5-071", as: "wrongColor" }], deck: ["BT5-002", "BT5-003"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wrongColor").instanceId)).toBe(true);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-094", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
