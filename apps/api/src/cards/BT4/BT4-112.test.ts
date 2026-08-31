import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-112.js";

describe("BT4-112 Hell's Gate", () => {
  it("deletes an opposing level 6 or higher Digimon", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "BT4-006" }, hand: [{ card: "BT4-112", as: "option" }] },
        1: { battleArea: [{ card: "BT3-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-112", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });

  it("does not delete an opposing level 5 Digimon", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "BT4-006" }, hand: [{ card: "BT4-112", as: "option" }] },
        1: { battleArea: [{ card: "BT3-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-112"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
