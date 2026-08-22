import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-089.js";

describe("BT8-089 Cody Hida", () => {
  it("suspends when a multicolor Digimon attacks to give an opposing Digimon -2000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-089", as: "cody" }, { card: "BT8-015", as: "attacker" }] },
      1: { security: ["BT8-034"], battleArea: [{ card: "BT8-017", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const before = s.perm("target").currentDP;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP < before);
    expect(s.perm("cody").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(before - 2000);
  });

  it("gains 1 memory at the start of its main phase when a yellow Digimon is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-089", as: "cody" }, { card: "BT8-034", as: "yellow" }] } });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("cody"));
    expect(s.state.memory).toBe(1);
  });

  it("plays itself from a face-up Security check without memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT8-089", as: "securityCody", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityCody"));
    expect(s.state.players[0]!.battleArea.some(permanent => permanent.topCard.instanceId === s.inst("securityCody").instanceId)).toBe(true);
  });
});
