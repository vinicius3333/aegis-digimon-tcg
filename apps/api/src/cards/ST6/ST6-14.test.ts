import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-14.js";
import "./ST6-15.js";

describe("ST6-14 Matt Ishida", () => {
  it("suspends to gain 1 memory when one of your Digimon is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST6-14", as: "matt" }, { card: "ST6-03", as: "victim" }], hand: [{ card: "ST6-15", as: "option" }] }, 1: { battleArea: [{ card: "ST6-08", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("matt").isSuspended && s.state.memory === 5);
    expect(s.perm("matt").isSuspended).toBe(true);
    expect(s.state.memory).toBe(5);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST6-14", as: "matt", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("matt"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("matt").instanceId)).toBe(true);
  });
});
