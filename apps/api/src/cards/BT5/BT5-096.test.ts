import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-096.js";

describe("BT5-096 Supreme Cannon", () => {
  it("returns all 3000-DP-or-less opponents and trashes their sources", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-020"], hand: [{ card: "BT5-096", as: "option" }] }, 1: { battleArea: [{ card: "BT5-021", as: "first", dp: 3000, under: [{ card: "BT5-001", as: "source" }] }, { card: "BT5-022", as: "high", dp: 4000 }] } }, { autoSelectCards: true });
    const firstTopId = s.perm("first").topCard.instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === firstTopId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("raises the threshold to 5000 when you control Garurumon", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-024"], hand: [{ card: "BT5-096", as: "option" }] }, 1: { battleArea: [{ card: "BT5-022", as: "target", dp: 5000 }] } }, { autoSelectCards: true });
    const targetTopId = s.perm("target").topCard.instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetTopId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("activates the threshold logic from security", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-024"], security: [{ card: "BT5-096", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT5-022", as: "target", dp: 5000 }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
