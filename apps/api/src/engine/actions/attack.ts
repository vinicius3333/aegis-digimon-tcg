import {
  Phase,
  type GameState,
  type Seat,
  type AttackTarget,
  type IntentResult,
  type RejectReason,
} from "@aegis/shared";
import type { GameStateAccess } from "../state/access.js";
import type { CombatController } from "../combat/controller.js";
import { canAttackerDeclare, canAttackTarget, type ContinuousLegalityReader } from "../combat/legality.js";

/**
 * The `attack` player verb (subsystem: attack-and-block).
 *
 * Mirrors the source attack entry: TurnStateMachine.OnClick_SetAttack_RPC ->
 * AttackPermanentAction -> SetAttackingPermaent -> AttackProcess.Attack
 * already chosen the attacker and the target; the server re-validates everything.
 *
 * Validation order matches the API-CONTRACT "Intent validation contract"
 * (section 4): seat/turn -> phase -> no open decision/attack -> legality. On any
 * failure it returns a stable RejectReason and mutates nothing. On success it
 * kicks off combat (which may open a block window and await the defender) and
 * returns ok immediately; combat's state changes sync as Colyseus deltas.
 */

export interface AttackIntent {
  attackerPermanentId: string;
  target: AttackTarget;
  /** A ＜Vortex＞ keyword attack declaration (Digimon-only target unless relaxed); see legality. */
  vortex?: boolean;
}

export interface AttackDeps {
  readonly state: GameState;
  readonly access: GameStateAccess;
  readonly combat: CombatController;
  /** Surface a fatal error from the async combat continuation (the room logs it). */
  onCombatError: (err: unknown) => void;
  /** Re-evaluate phase ownership only after every attack effect has finished resolving. */
  onCombatComplete?: () => void;
  /** Shared continuous-rule reader (ledger): "can't attack"/"can't attack players". */
  readonly continuous?: ContinuousLegalityReader;
  /** Permanents that have already attacked this turn (§11-2-3). */
  readonly attackedThisTurn?: ReadonlySet<string>;
}

/**
 * Validate an attack against current state. Returns `null` when legal, or the
 * RejectReason for the first failed check. Exposed for reuse/testing.
 */
export function validateAttack(deps: AttackDeps, seat: Seat, intent: AttackIntent): RejectReason | null {
  const { state, access } = deps;

  // 1. Seat / turn / phase. Attacking is a Main-phase verb of the turn player.
  if (state.turnSeat !== seat) {
    return "not-your-turn";
  }
  if (state.phase !== Phase.Main) {
    return "wrong-phase";
  }
  // Vortex is an end-of-your-turn keyword attack; its public declaration is
  // synthesized by the end-turn effect rather than accepted as a forged Main intent.
  if (intent.vortex === true) {
    return "wrong-phase";
  }

  // 2. No attack may begin while an effect is waiting on a Decision. Attacking is a Main-phase
  //    action like play/digivolve/activate, and every one of those gates here (the API-CONTRACT
  //    validation contract, and this function's own doc comment above). Attacking is the worst
  //    one to let through: it opens a combat window — block, counter, battle, security — on top
  //    of an effect resolution that is still suspended waiting for its answer.
  if (state.pendingDecision !== undefined) {
    return "decision-pending";
  }

  // 3. No attack may begin while another is mid-resolution (source
  //    Permanent.CanAttack: `if (attackProcess.IsAttacking) return false`).
  if (deps.combat.isAttacking) {
    return "wrong-phase";
  }

  // 4. Attacker legality (own, battle-area Digimon, unsuspended).
  const attacker = access.permanentById(intent.attackerPermanentId);
  if (attacker === undefined) {
    return "illegal-target";
  }
  const attackerReject = canAttackerDeclare(access, seat, attacker, deps.continuous, intent.vortex);
  if (attackerReject !== null) {
    return attackerReject;
  }

  // 5. §11-2-3: each Digimon may attack at most once per turn.
  if (deps.attackedThisTurn?.has(attacker.permanentId)) {
    return "illegal-target";
  }

  // 6. Target legality (player, or an opponent's suspended battle-area Digimon). A ＜Vortex＞
  //    declaration (intent.vortex) restricts the player target unless a grant relaxes it.
  return canAttackTarget(access, seat, attacker, intent.target, deps.continuous, intent.vortex);
}

/**
 * Apply a validated attack: start the combat lifecycle. Returns ok synchronously;
 * the (possibly block-window-awaiting) resolution runs as a continuation.
 */
export function applyAttack(deps: AttackDeps, seat: Seat, intent: AttackIntent): IntentResult {
  const reason = validateAttack(deps, seat, intent);
  if (reason !== null) {
    return { ok: false, reason };
  }

  const attacker = deps.access.permanentById(intent.attackerPermanentId);
  if (attacker === undefined) {
    return { ok: false, reason: "illegal-target" };
  }

  void deps.combat
    .resolveAttack(seat, attacker, intent.target)
    .then(() => deps.onCombatComplete?.())
    .catch(deps.onCombatError);
  return { ok: true };
}
