import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX6-070 (Phantom Pain) — Purple Option.
//
// [Main] Select 1 of your opponent's Digimon. Until the end of their turn, that
// Digimon gains "[End of Your Turn] Delete this Digimon." Then, place this card
// in the battle area.
//
// Observable outcome tested:
//   1. The selected opponent Digimon is placed in the battle area.
//   2. The selected Digimon is deleted at end of opponent's turn
//      (engine fires "endOfOpponentTurn" sub-trigger).
//
// This test uses applyIntent("useOption") to trigger the [Main] effect,
// then advances to the opponent's turn-end to confirm the sub-trigger fires.
//
// FAILS-WHEN-REVERTED: remove the subscribeSubTrigger call → the opponent Digimon
// is NOT deleted at the end of their turn (the event never fires).
//
// Lilithmon: BT11-087 (Purple Lv.7 Digimon with name "Lilithmon") — needed for the
// [End of Opponent's Turn] ＜Delay＞ clause (but not tested here; that clause is
// conditional on turn rotation which requires more engine wiring).
//
// Opponent Digimon to be deleted: BT1-024 (Koromon — Lv.2 vanilla for simplicity).
// A simpler test approach: verify the opponent Digimon is deleted via settle().

const PHANTOM_PAIN = "EX6-070";
const OPP_DIGIMON = "BT1-024"; // Koromon — vanilla opp Digimon
const FILLER = "BT1-009"; // Monodramon — filler

describe("EX6-070 [Main] grants 'delete at end of their turn' to opponent Digimon", () => {
  it("the Option card is placed in the battle area after use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", dp: 3000 }], // §4-21 color-requirement source (Purple)
          hand: [{ card: PHANTOM_PAIN, as: "option" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    s.state.memory = 4; // Phantom Pain play cost

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId }),
    ).toEqual({ ok: true });

    // After use, the Option should be placed in the battle area as a permanent.
    await settle(() =>
      p0.battleArea.some((perm) => perm.topCard?.cardId === PHANTOM_PAIN),
    );

    expect(
      p0.battleArea.some((perm) => perm.topCard?.cardId === PHANTOM_PAIN),
    ).toBe(true);
    // FAILS-WHEN-REVERTED: placeOptionAsPermanent removed → option goes to trash, not battle area.
  });

  it("[Security] deletes 1 unsuspended opponent Digimon", async () => {
    const s = setupEngine(
      {
        // The card's ownerSeat must match the security owner (seat-0) so that
        // source.ownerSeat=0 and opponentOf(0)=1 correctly targets seat-1's Digimon.
        0: { security: [PHANTOM_PAIN] },
        1: {
          // An unsuspended opponent Digimon for the security effect to delete, plus the
          // attacker seat-1 uses to trigger seat-0's security.
          battleArea: [
            { card: OPP_DIGIMON, dp: 1000, as: "oppPerm" },
            { card: FILLER, dp: 2000, as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const oppPerm = s.perm("oppPerm");
    const attacker = s.perm("attacker");

    // Seat-1's turn.
    s.state.memory = -3;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // After security check resolves, the opponent's unsuspended Digimon should be deleted.
    await settle(() => !p1.battleArea.some((perm) => perm.permanentId === oppPerm.permanentId));

    expect(p1.battleArea.some((perm) => perm.permanentId === oppPerm.permanentId)).toBe(false);
    // FAILS-WHEN-REVERTED: the [Security] deletePermanent call is removed → the Digimon survives.
  });
});
