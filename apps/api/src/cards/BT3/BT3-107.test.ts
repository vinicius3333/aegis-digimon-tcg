import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-107.js";

describe("BT3-107 Looking Back on the Good Times", () => {
  it("Q1145: de-digivolves a cost-5 target, then deletes it after its cost becomes 4 or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-059"], hand: [{ card: "BT3-107", as: "option" }] },
        1: { battleArea: [{ card: "BT3-048", as: "target", under: ["BT3-044"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q1146: deletes a cost-4-or-less level 3 even when De-Digivolve can't remove a source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-059"], hand: [{ card: "BT3-107", as: "option" }] },
        1: { battleArea: [{ card: "BT3-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-107", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });
});
