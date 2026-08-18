import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
// Importing the cards root barrel self-registers every compiled-IR / hand-written card
// module so the engine can look up On Play / When Attacking effects by card id.
import "../../cards/index.js";

/**
 * Per-cluster A3 — security-stack + activate-foreign mechanic (CARD-01, plan 04-09).
 *
 * Drives the activate-foreign-effect path's canonical card (BT23-060 Machinedramon)
 * through the REAL GameEngine (real interpreter + real createPrimitives + the new
 * interpreter case "ActivateForeignEffect"), asserting the resulting GameState delta of
 * the BORROWED effect.
 *
 * BT23-060 [When Attacking] [Once Per Turn]: "Activate 1 [On Play] effect on a face-up
 * [Zaxon] trait Digimon card in your security stack as an effect of this Digimon."
 *   - Lender: BT23-015 (Phoenixmon), a face-up [Zaxon] security card whose [On Play] is
 *     "Delete 1 of your opponent's Digimon with 9000 DP or less" (KB Q5331 — the borrowed
 *     effect runs fully under the activating card's control/timing).
 *   - Observable: an opponent Digimon (DP <= 9000) is deleted when BT23-060 declares an
 *     attack — i.e. the borrowed [On Play] resolved as BT23-060's effect.
 *
 * FAILS-WHEN-REVERTED lever: stub the interpreter's `runActivateForeignEffect` body to a
 * no-op (`return;` at its top) and the borrowed Delete never runs — the opponent Digimon
 * survives and the deletion assertion goes RED. (Verified locally during authoring.)
 */

describe("A3 activate-foreign — BT23-060 borrows a face-up [Zaxon] security card's [On Play]", () => {
  it("BT23-060 [When Attacking] activates BT23-015's [On Play] as its own (deletes an opponent Digimon)", async () => {
    const s = setupEngine(
      {
        0: {
          // The activating Digimon (Machinedramon) unsuspended on seat 0's battle area.
          battleArea: [{ card: "BT23-060", dp: 13000, as: "machinedramon" }],
          // The lender: BT23-015 (Phoenixmon) FACE-UP in seat 0's security stack. Its [On Play]
          // deletes 1 opponent Digimon with DP <= 9000 — the only borrowable candidate, so the
          // foreign-card pick auto-resolves.
          security: [{ card: "BT23-015", faceUp: true }],
        },
        1: {
          // The borrowed [On Play]'s target: a seat-1 Digimon with DP <= 9000.
          battleArea: [{ card: "AD1-001", dp: 4000, as: "victim" }],
          // Keep seat 1 alive (a security card) so the post-attack win check does not end the
          // game before the borrowed deletion settles.
          security: ["BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const machinedramon = s.perm("machinedramon");
    const victim = s.perm("victim");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: machinedramon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === victim.permanentId));

    // The borrowed [On Play] resolved AS BT23-060's effect: the opponent Digimon is deleted.
    expect(p1.battleArea.some((p) => p.permanentId === victim.permanentId)).toBe(false);
    assertNoLoudGap(s);
  });

  // Guardrail: with NO eligible foreign card (no face-up [Zaxon] security card), the
  // [When Attacking] effect is a faithful no-op — the opponent Digimon survives. This proves
  // the path only fires off a genuinely eligible lender (it does not delete unconditionally).
  it("BT23-060 [When Attacking] does nothing when there is no face-up [Zaxon] security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", dp: 13000, as: "machinedramon" }],
          // A face-DOWN security card is not borrowable (source `!cardSource.IsFlipped`).
          security: ["BT23-015"],
        },
        1: {
          battleArea: [{ card: "AD1-001", dp: 4000, as: "survivor" }],
          security: ["BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const machinedramon = s.perm("machinedramon");
    const survivor = s.perm("survivor");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: machinedramon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => false, 40);

    // No eligible lender -> the borrowed Delete never runs -> the opponent Digimon survives.
    expect(p1.battleArea.some((p) => p.permanentId === survivor.permanentId)).toBe(true);
    assertNoLoudGap(s);
  });
});
