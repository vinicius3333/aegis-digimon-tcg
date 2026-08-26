import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-100.js";

describe("BT4-100 Trident Revolver", () => {
  it("deletes a 6000 DP Digimon and plays a cost-4 Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT4-007"],
          hand: [
            { card: "BT4-100", as: "option" },
            { card: "BT4-092", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT4-044", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("activates its full Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT4-100", as: "securityOption", faceUp: true }],
          hand: [{ card: "BT4-092", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT4-044", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
  });

  it("plays an eligible Tamer even when there is no deletable opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT4-007"],
          hand: [
            { card: "BT4-100", as: "option" },
            { card: "BT4-092", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT4-044", as: "tooLarge", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
