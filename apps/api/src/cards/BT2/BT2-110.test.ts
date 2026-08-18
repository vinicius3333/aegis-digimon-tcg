import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-110.js";

describe("BT2-110 Trump Sword", () => {
  it("deletes an opposing unsuspended Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-067"], hand: [{ card: "BT2-110", as: "option" }] }, 1: { battleArea: [{ card: "BT2-043", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("activates its Main deletion effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-110", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT2-043", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
