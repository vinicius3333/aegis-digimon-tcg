import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-111.js";

describe("BT1-111 Giga Blaster", () => {
  it("suspends two 5000-DP-or-less Digimon through its second mode", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-067"], hand: [{ card: "BT1-111", as: "option" }] }, 1: { battleArea: [{ card: "BT1-010", as: "first" }, { card: "BT1-015", as: "second" }] } }, { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.isSuspended));
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("activates either Main mode from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-111", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT1-010", as: "first" }, { card: "BT1-015", as: "second" }] } }, { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
  });
});
