import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-093.js";

describe("BT2-093 Shield of the Just", () => {
  it("deletes a 5000 DP Digimon without a red Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT2-009"], hand: [{ card: "BT2-093", as: "option" }] }, 1: { battleArea: [{ card: "BT1-036", as: "target", dp: 5000 }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses the red Tamer threshold to delete up to 8000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-009", "BT2-084"], hand: [{ card: "BT2-093", as: "option" }] }, 1: { battleArea: [{ card: "BT2-045", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("activates its red-Tamer Main deletion effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-093", as: "securityOption", faceUp: true }], battleArea: ["BT2-084"] }, 1: { battleArea: [{ card: "BT2-045", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
