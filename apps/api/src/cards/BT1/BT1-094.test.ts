import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-072.js";
import "./BT1-094.js";
describe("BT1-094 Oblivion Bird", () => {
  it("deletes an opposing Digimon with Blocker", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT1-010"], hand: [{ card: "BT1-094", as: "option" }] }, 1: { battleArea: ["BT1-072"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT1-094", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
