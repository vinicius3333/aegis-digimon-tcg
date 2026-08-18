import type { GameState, Seat, IntentResult, RejectReason } from "@aegis/shared";
import type { GameStateAccess } from "../state/access.js";
import type { CombatController } from "../combat/controller.js";
import { canBlock, type ContinuousLegalityReader } from "../combat/legality.js";

/**
 * The `declareBlock` / `declineBlock` verbs (subsystem: attack-and-block).
 *
 * During an open block window the defending seat either names a blocker or passes.
 * Mirrors the blocker-selection step of AttackProcess.BlockTiming (cs:322-405):
 * the selectable set is the eligible blockers, and choosing one routes into
 * SwitchDefender. Here the controller holds the open window; these verbs just
 * validate that it is this seat's window and (for declare) that the chosen blocker
 * is legal, then resolve it. The block-window contract is modelled as first-class
 * intents (not a generic decisionId round-trip), exactly as API-CONTRACT.md
 * section 6 "Attack into security" describes.
 */

export interface BlockDeps {
  readonly state: GameState;
  readonly access: GameStateAccess;
  readonly combat: CombatController;
  /** Shared continuous-rule reader (ledger): ＜Blocker＞ requirement + "can't block". */
  readonly continuous?: ContinuousLegalityReader;
}

/** Declare `blockerPermanentId` as the blocker for the current attack. */
export function applyDeclareBlock(
  deps: BlockDeps,
  seat: Seat,
  intent: { blockerPermanentId: string },
): IntentResult {
  const reason = validateDeclareBlock(deps, seat, intent.blockerPermanentId);
  if (reason !== null) {
    return { ok: false, reason };
  }
  // resolveBlock re-checks the window/eligibility; a false return means the window
  // closed between validate and resolve (rare race) -> reject without mutation.
  const accepted = deps.combat.resolveBlock(seat, intent.blockerPermanentId);
  return accepted ? { ok: true } : { ok: false, reason: "illegal-target" };
}

/** Pass the open block window (the attack proceeds to the player / its target). */
export function applyDeclineBlock(deps: BlockDeps, seat: Seat): IntentResult {
  if (!deps.combat.hasOpenBlockWindow) {
    return { ok: false, reason: "wrong-phase" };
  }
  if (deps.combat.blockingSeat !== seat) {
    return { ok: false, reason: "not-your-turn" };
  }
  const accepted = deps.combat.resolveBlock(seat, undefined);
  return accepted ? { ok: true } : { ok: false, reason: "wrong-phase" };
}

/**
 * Validate a declareBlock. Returns null when legal, else a RejectReason:
 *   - no open window, or it is not this seat's window;
 *   - the named permanent is not a legal blocker for the current attacker.
 */
export function validateDeclareBlock(
  deps: BlockDeps,
  seat: Seat,
  blockerPermanentId: string,
): RejectReason | null {
  const { access, combat } = deps;

  if (!combat.hasOpenBlockWindow) {
    return "wrong-phase";
  }
  if (combat.blockingSeat !== seat) {
    return "not-your-turn";
  }

  const blocker = access.permanentById(blockerPermanentId);
  if (blocker === undefined) {
    return "illegal-target";
  }
  // Re-run canBlock against the live attacker for a precise rejection reason. The
  // attacker id is taken from the controller's open window (the authoritative
  // record of the in-flight attack), not guessed from the board.
  const attackerId = combat.attackingPermanentId;
  const attacker = attackerId === undefined ? undefined : access.permanentById(attackerId);
  if (attacker === undefined) {
    return "illegal-target";
  }
  return canBlock(access, attacker, blocker, deps.continuous);
}
