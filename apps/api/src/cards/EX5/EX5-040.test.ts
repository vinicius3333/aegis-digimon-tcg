import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX5-040 (Kumbhiramon) — [On Play] Draw 1, then you may play 1 [Deva] Digimon
// from your hand WITHOUT paying its cost INTO THE BREEDING AREA.
// source: documented behavior (PlayWithoutCost, breeding destination).
//
// FAILS-WHEN-REVERTED: the Deva lands in the breeding area (not the battle area / still in
// hand) only because PlayWithoutCost.breeding:true routes playInstances to breeding. Dropping
// the breeding route would land it in the battle area instead.

describe("EX5-040 [On Play] play a [Deva] from hand without cost into the breeding area", () => {
  it("the chosen [Deva] Digimon lands in the breeding area, free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-040", as: "kumbhi" }, { card: "BT10-079", as: "deva" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    s.state.memory = 7; // exact play cost of EX5-040

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kumbhi").instanceId }),
    ).toEqual({ ok: true });

    await settle(() => p0.breeding?.topCard?.cardId === "BT10-079");

    // The Deva was played into BREEDING (not the battle area), and left the hand.
    expect(p0.breeding?.topCard?.cardId).toBe("BT10-079");
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT10-079")).toBe(false);
    expect(p0.hand.some((c) => c.instanceId === s.inst("deva").instanceId)).toBe(false);
  });
});
