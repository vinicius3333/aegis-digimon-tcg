import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-109.js";

describe("BT5-109 Mega Digimon Fusion!", () => {
  it("reduces the next level 6-to-7 digivolution by 6, then bottoms it and trashes its stack at turn end", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-019", as: "base", under: [{ card: "BT5-007", as: "source" }] }, "BT5-091"], hand: [{ card: "BT5-109", as: "option" }, { card: "BT5-086", as: "level7" }], deck: ["BT5-001"] }, 1: { deck: ["BT5-001"] } });
    const basePermanentId = s.perm("base").permanentId;
    const baseTopId = s.perm("base").topCard.instanceId;
    const turn = s.engine.runOneTurn();
    await settle(() => (s.engine as any).mainPhase.isOpen);
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: basePermanentId, instanceId: s.inst("level7").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("level7").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("level7").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([baseTopId, s.inst("source").instanceId]));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === basePermanentId)).toBe(false);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-109", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
