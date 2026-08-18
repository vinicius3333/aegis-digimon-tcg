import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-097.js";

describe("BT5-097 Absolute Blast", () => {
  it("trashes a bottom source, then bottoms an opponent with no sources", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-020"], hand: [{ card: "BT5-097", as: "option" }] }, 1: { battleArea: [{ card: "BT5-021", as: "stripped", under: [{ card: "BT5-001", as: "source" }] }], deck: ["BT5-002"] } }, { autoSelectCards: true });
    const returnedTopId = s.perm("stripped").topCard.instanceId;
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.deck.some((card) => card.instanceId === returnedTopId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(returnedTopId);
  });

  it("activates the full Main effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-097", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT5-021", as: "target", under: [{ card: "BT5-001", as: "source" }] }], deck: ["BT5-002"] } }, { autoSelectCards: true });
    const targetTopId = s.perm("target").topCard.instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(targetTopId);
  });
});
