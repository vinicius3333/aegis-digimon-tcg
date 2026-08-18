import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-086.js";

describe("BT1-086 Matt Ishida", () => {
  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-086", as: "matt" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt"));
    expect(s.state.memory).toBe(3);
  });

  it("may suspend itself when a blue Digimon is played to trash an opponent's bottom source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-086", as: "matt" }], hand: [{ card: "BT1-027", as: "blue" }] }, 1: { battleArea: [{ card: "BT1-072", as: "target", under: [{ card: "BT1-066", as: "bottom" }, "BT1-067"] }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("matt").isSuspended && s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId));
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-086", as: "securityMatt", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityMatt"));

    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard?.instanceId === s.inst("securityMatt").instanceId,
    )).toBe(true);
  });
});
