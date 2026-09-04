import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-067.js";
import "../BT14/BT14-062.js";

describe("EX2-067 Fire Ball", () => {
  it("draws 2 when it can't delete an opposing 3000-DP-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["EX2-056"], hand: [{ card: "EX2-067", as: "option" }], deck: ["BT1-001", "BT1-002"] },
        1: { battleArea: ["EX2-029"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("deletes a 3000-DP target and does not draw when deletion succeeds", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["EX2-056"], hand: [{ card: "EX2-067", as: "option" }], deck: ["BT1-001", "BT1-002"] },
        1: { battleArea: [{ card: "EX2-019", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX2-067", as: "securityOption", faceUp: true }] },
      1: { battleArea: [{ card: "EX2-019", as: "target", dp: 3000 }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("draws 2 when an eligible 3000-DP Digimon is immune to the deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["EX2-056"], hand: [{ card: "EX2-067", as: "option" }], deck: ["BT1-001", "BT1-002"] },
        1: { battleArea: [{ card: "BT14-062", as: "immuneTarget", dp: 3000 }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.perm("immuneTarget").topCard.cardId).toBe("BT14-062");
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });
});
