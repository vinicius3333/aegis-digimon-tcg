import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-105.js";

describe("BT4-105 Tactical Retreat!", () => {
  it("places the chosen Digimon face down on security and trashes its whole stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-044", as: "target", under: [{ card: "BT4-003", as: "bottom" }, { card: "BT4-011", as: "topSource" }] }], security: ["BT4-033"], hand: [{ card: "BT4-105", as: "option" }] } }, { autoSelectCards: true });
    const targetInstanceId = s.perm("target").topCard.instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    const placed = s.state.players[0]!.security.find((card) => card.instanceId === targetInstanceId);
    expect(placed).toBeDefined();
    expect(placed?.faceUp).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("bottom").instanceId, s.inst("topSource").instanceId]));
  });

  it("recovers the top deck card when checked in security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-105", as: "securityOption", faceUp: true }], deck: [{ card: "BT4-033", as: "recovered" }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
