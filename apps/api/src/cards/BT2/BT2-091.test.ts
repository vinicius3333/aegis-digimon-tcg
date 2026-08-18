import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-091.js";

describe("BT2-091 Volcanic Flare", () => {
  it("deletes an opposing Digimon at 4000 DP or less", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-009"], hand: [{ card: "BT2-091", as: "option" }] }, 1: { battleArea: [{ card: "BT2-043", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("activates its Main deletion effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-091", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT2-043", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
