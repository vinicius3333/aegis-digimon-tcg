import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-099.js";

describe("BT4-099 Heir of Dragons", () => {
  it("draws 2 and deletes a 4000 DP Digimon while Greymon is present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-015"], hand: [{ card: "BT4-099", as: "option" }], deck: ["BT4-001", "BT4-002"] },
        1: { battleArea: [{ card: "BT4-009", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("activates its full Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-015"],
          security: [{ card: "BT4-099", as: "securityOption", faceUp: true }],
          deck: ["BT4-001", "BT4-002"],
        },
        1: { battleArea: [{ card: "BT4-009", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete when only an excluded Greymon name is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-013", as: "excludedGreymon" }],
          hand: [{ card: "BT4-099", as: "option" }],
          deck: ["BT4-001", "BT4-002"],
        },
        1: { battleArea: [{ card: "BT4-009", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
