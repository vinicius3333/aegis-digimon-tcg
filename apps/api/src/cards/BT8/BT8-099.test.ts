import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-099.js";

describe("BT8-099 Cocytus Breath", () => {
  it("suspends an unsuspended opposing Digimon before returning suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT8-012", "BT8-016"], hand: [{ card: "BT8-099", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT8-023", as: "unsuspendedTarget" },
            { card: "BT8-024", as: "suspendedTarget", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.length).toBeGreaterThanOrEqual(2);
  });

  it("uses only an unsuspended Digimon for the Security suspension", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT8-099", as: "securityOption", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT8-024", as: "suspendedTarget", suspended: true },
            { card: "BT8-023", as: "unsuspendedTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
  });
});
