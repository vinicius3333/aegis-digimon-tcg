import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import type { ContinuousEffectLedger } from "./effects/continuous.js";
import { setupEngine, settle, findPermanent } from "./testkit/harness.js";
// Importing the cards barrel self-registers every compiled-IR module (boot side-effect),
// so the engine can look up BT13-077's compiled [On Play] IR by card id.
import "../cards/index.js";

/**
 * End-to-end proof of the "until the end of your opponent's turn" DURATION mapping.
 *
 * Vehicle — BT13-077 Craniamon. Its [On Play] grants "until the end of your opponent's
 * turn, this Digimon isn't affected by the effects of your opponent's Digimon". The
 * compiled IR carries `duration: "untilOpponentTurnEnd"`, which the interpreter's
 * toDuration must map to EffectDuration.UntilOpponentTurnEnd (NOT permanent, NOT the
 * shorter UntilEachTurnEnd).
 *
 * The grant is installed on the CONTROLLER's OWN turn (On Play), yet must survive to the
 * END of the opponent's next turn. The critical subtlety is the boundary framing: an
 * UntilOpponentTurnEnd restriction is anchored to the granter's seat, so
 *   - the granter's OWN turn-end sweep (ownerTurnEnd, sweepSeat = granter) must NOT clear it, and
 *   - the OPPONENT's turn-end sweep (opponentTurnEnd, sweepSeat = opponent) MUST clear it.
 *
 * FAILS-WHEN-REVERTED levers:
 *   - Revert the compiler fix (GrantStatic keeps `duration: "permanent"`) OR revert the
 *     toDuration mapping: the immunity becomes Permanent/UntilEachTurnEnd and the
 *     "cleared at opponent's turn end" assertion (or the "survives own turn end" one) fails.
 */

const IMMUNITY_CARD = "BT13-077"; // [On Play] immune to opponent Digimon effects until opp turn end

describe("'until the end of your opponent's turn' immunity duration (BT13-077 [On Play])", () => {
  it("installed on the granter's own turn, the immunity survives the granter's own turn-end and clears at the opponent's turn-end", async () => {
    // Seat 0 is the turn player: BT13-077's [On Play] resolves on the granter's OWN turn.
    const s = setupEngine({
      0: { hand: [{ card: IMMUNITY_CARD, faceUp: false, as: "card" }] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const ledger = (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
    s.state.memory = 13; // BT13-077 costs 13; start funded so the play is legal

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(result).toEqual({ ok: true });

    // Settle until BT13-077 has landed and its [On Play] immunity restriction is recorded.
    await settle(
      () =>
        p0.battleArea.some((perm) => perm.topCard?.cardId === IMMUNITY_CARD) &&
        p0.battleArea.some((perm) => ledger.hasRestriction(perm.permanentId, "beAffected", "Digimon")),
    );

    const permanentId = findPermanent(s, 0, IMMUNITY_CARD).permanentId;

    // The [On Play] immunity is installed (blocks opponent Digimon-sourced effects).
    expect(ledger.hasRestriction(permanentId, "beAffected", "Digimon")).toBe(true);

    // Granter's OWN turn end (seat 0): an "until opponent's turn end" grant MUST survive —
    // it is anchored to the granter's seat, so its own turn-end sweep does not clear it.
    ledger.sweep(s.state, "ownerTurnEnd", 0);
    expect(ledger.hasRestriction(permanentId, "beAffected", "Digimon")).toBe(true);

    // Opponent's turn end (seat 1): the grant now clears.
    ledger.sweep(s.state, "opponentTurnEnd", 1);
    expect(ledger.hasRestriction(permanentId, "beAffected", "Digimon")).toBe(false);
  });

  it("negative control: the immunity is not permanent — an opponent turn-end sweep removes it after both boundaries pass", async () => {
    const s = setupEngine({
      0: { hand: [{ card: IMMUNITY_CARD, faceUp: false, as: "card" }] },
    });
    const p0 = s.state.players[0] as PlayerState;
    const ledger = (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
    s.state.memory = 13;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(result).toEqual({ ok: true });

    await settle(() =>
      p0.battleArea.some(
        (perm) =>
          perm.topCard?.cardId === IMMUNITY_CARD && ledger.hasRestriction(perm.permanentId, "beAffected", "Digimon"),
      ),
    );

    const permanentId = findPermanent(s, 0, IMMUNITY_CARD).permanentId;

    // Run a full owner-then-opponent turn cycle of sweeps: a permanent grant would still be
    // present here; this one is gone, proving it was not mis-encoded as permanent.
    ledger.sweep(s.state, "ownerTurnEnd", 0);
    ledger.sweep(s.state, "opponentTurnEnd", 1);
    expect(ledger.hasRestriction(permanentId, "beAffected", "Digimon")).toBe(false);
  });
});
