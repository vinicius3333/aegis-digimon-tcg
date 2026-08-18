import { describe, it, expect } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 behavioral test for BT15-012 (Shoutmon X2):
//   [On Play] Suspend 1 of your opponent's Digimon.
//
// Primary observable: playing BT15-012 causes the target opp Digimon to become suspended.
//
// FAILS-WHEN-REVERTED: remove the [On Play] resolve body → the opp Digimon stays unsuspended.

describe("BT15-012 Shoutmon X2 [On Play] suspend", () => {
  it("playing BT15-012 suspends 1 of the opponent's Digimon", async () => {
    const s = setup(
      {
        0: { hand: [{ card: "BT15-012", as: "shoutmonX2" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 1000, as: "oppDigimon" }] }, // Monodramon Lv.3
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const shoutmonX2 = s.inst("shoutmonX2");
    const oppDigimon = s.perm("oppDigimon");

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: shoutmonX2.instanceId,
    });
    expect(res).toEqual({ ok: true });

    // Wait for the opp Digimon to become suspended
    await settle(() => oppDigimon.isSuspended, 600);

    // The opp Digimon should be suspended
    expect(oppDigimon.isSuspended).toBe(true);
  });
});
