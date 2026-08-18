import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-101.js";

describe("BT5-101 You Can't Actually Fly?", () => {
  it("suspends an opponent and trashes their top security when they control a level 7", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-101", as: "option" }] }, 1: { battleArea: [{ card: "BT5-085", as: "level7" }], security: [{ card: "BT5-001", as: "top" }, "BT5-002"] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("level7").isSuspended && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
  });

  it("does not trash security without an opposing level 7", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-101", as: "option" }] }, 1: { battleArea: [{ card: "BT5-047", as: "target" }], security: ["BT5-001"] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-101", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
