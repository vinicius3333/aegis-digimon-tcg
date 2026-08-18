import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-101.js";

describe("BT4-101 Final Aqua Blaster", () => {
  it("makes own Digimon delete a sourceless Digimon when attacking it", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-023", as: "attacker", dp: 1000 }], hand: [{ card: "BT4-101", as: "option" }] }, 1: { battleArea: [{ card: "BT4-045", as: "target", suspended: true, dp: 20_000 }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-101"));
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("target").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId)).toBe(true);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-101", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });
});
