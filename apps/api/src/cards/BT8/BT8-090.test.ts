import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-090.js";
import "./BT8-042.js";

describe("BT8-090 Kari Kamiya", () => {
  it("suspends to gain 1 memory when a card is added to your security", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT8-090", as: "kari" }, { card: "BT1-051", as: "base" }],
      hand: [{ card: "BT8-042", as: "evolving" }],
      deck: [{ card: "BT8-034", as: "recovered" }, "BT8-035"],
      security: ["BT8-034", "BT8-035"],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3 && s.perm("kari").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("sets memory to 3 at the start of its turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-090", as: "kari" }] } });
    s.state.turnSeat = 0;
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kari"));
    expect(s.state.memory).toBe(3);
  });

  it("plays itself from a face-up Security check without memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT8-090", as: "securityKari", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityKari"));
    expect(s.state.players[0]!.battleArea.some(permanent => permanent.topCard.instanceId === s.inst("securityKari").instanceId)).toBe(true);
  });
});
