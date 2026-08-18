import { getCardDefinition, type Keyword, type Permanent, type Seat } from "@aegis/shared";
import type { AttackTarget, RejectReason } from "@aegis/shared";
import type { Restriction } from "../effects/EffectContext.js";
import type { GameStateAccess } from "../state/access.js";
import { printedKeywordsOf } from "./keywords.js";

/**
 * Attack/block legality predicates. Pure functions over GameState (via
 * GameStateAccess), mirroring Permanent.CanAttack / CanAttackTargetDigimon /
 *
 * The continuous "can-/cannot-" layer is read through an optional
 * {@link ContinuousLegalityReader} (the shared ContinuousEffectLedger): a recorded
 * `attack`/`attackPlayers`/`block` restriction forbids the action, and — per
 * Comprehensive Rules §16-5 / §11-4 — a block requires the blocker to have ＜Blocker＞
 * (printed in its text or granted by an effect). When no reader is supplied the
 * predicates keep the pre-continuous behavior (no restrictions; any unsuspended
 * Digimon may block), so the pure combat unit tests and the controller's default
 * path are unchanged; the GameEngine passes the live reader so production enforces
 * the rules.
 *
 * Each returns `null` when legal, or a stable RejectReason when not, so the
 * GameEngine can surface the contract's rejection codes directly
 * (API-CONTRACT.md section 4, "Intent validation contract").
 */

/**
 * The continuous-rule reads combat legality needs (the shared ContinuousEffectLedger
 * satisfies this). Optional everywhere so callers without the ledger keep the base
 * rules.
 */
export interface ContinuousLegalityReader {
  hasRestriction(permanentId: string, restriction: Restriction): boolean;
  hasKeyword(permanentId: string, keyword: string): boolean;
  /** Target-scoped "this attacker can't attack this Digimon" prohibitions. */
  cannotAttackTarget?(attackerPermanentId: string, targetPermanentId: string): boolean;
  /**
   * Whether `permanentId` may also attack an opponent's UNSUSPENDED Digimon
   * (rule implementation grant, e.g. ST12-08). Optional so readers
   * without the grant store keep the base "only suspended defenders" rule.
   */
  canAttackUnsuspended?(permanentId: string): boolean;
  /**
   * Whether every active "can attack unsuspended" grant on `permanentId` is restricted to
   * defenders with NO digivolution cards (EX1-016/BT7-095). When true, the suspension relaxation
   * only applies to a defender with an empty digivolution stack. Optional so readers without the
   * grant store keep the unrestricted behavior.
   */
  canAttackUnsuspendedRequiresNoDigivolution?(permanentId: string): boolean;
  /** Whether an active grant accepts this exact unsuspended defender's constraints. */
  canAttackUnsuspendedTarget?(
    permanentId: string,
    defender: { level?: number; hasDigivolutionCards: boolean },
  ): boolean;
  /**
   * Whether `permanentId`'s ＜Vortex＞ attack may ALSO target a player
   * (VortexCanAttackPlayers grant, EX11-062). Optional so readers without the grant store keep the
   * base ＜Vortex＞ rule (Digimon-only attack targets, Comprehensive Rules §16-33).
   */
  vortexCanAttackPlayers?(permanentId: string): boolean;
  /**
   * Continuous kind grants ("treat as Digimon") on a permanent. A Tamer granted
   * Digimon kind is combat-eligible by effective type (HARD-01). Optional so
   * readers without the grant store keep the base (static-only) behavior.
   */
  grantedKinds?(permanentId: string): import("@aegis/shared").CardKind[];
}

function hasPrintedKeyword(permanent: Permanent, keyword: Keyword): boolean {
  if (permanent.topCard === undefined) return false;
  const def = getCardDefinition(permanent.topCard.cardId);
  return printedKeywordsOf(def?.effectText).includes(keyword);
}

/**
 * Whether `attacker` has ＜Vortex＞ — printed in its top card's effect text or granted by an
 * active continuous effect (the ledger keyword store). A ＜Vortex＞ attack declaration is only
 * Permanent.CanAttack(isVortex:true) routes through the ＜Vortex＞ keyword's CanActivate).
 */
function hasVortex(attacker: Permanent, reader: ContinuousLegalityReader | undefined): boolean {
  if (reader?.hasKeyword(attacker.permanentId, "Vortex")) return true;
  return hasPrintedKeyword(attacker, "Vortex");
}

/**
 * Whether `permanent` has ＜Blocker＞ — printed in its top card's effect text or granted
 * by an active continuous effect (the ledger). Comprehensive Rules §16-5: only a
 * Digimon with ＜Blocker＞ may block.
 */
function hasBlocker(
  access: GameStateAccess,
  permanent: Permanent,
  reader: ContinuousLegalityReader | undefined,
): boolean {
  if (reader?.hasKeyword(permanent.permanentId, "Blocker")) return true;
  void access;
  return hasPrintedKeyword(permanent, "Blocker");
}

/**
 * Whether `permanent` has ＜Rush＞ — printed in its top card's effect text or granted
 * by an active continuous effect (the ledger). A Digimon with ＜Rush＞ may attack the
 * turn it enters the field.
 */
function hasRush(permanent: Permanent, reader: ContinuousLegalityReader | undefined): boolean {
  if (reader?.hasKeyword(permanent.permanentId, "Rush")) return true;
  return hasPrintedKeyword(permanent, "Rush");
}

/**
 * Whether `attacker` has ＜Collision＞ — printed in its top card's effect text or
 * granted by an active continuous effect (the ledger). Comprehensive Rules §16-30:
 * while a Digimon with this effect is attacking, all of the opponent's Digimon gain
 * ＜Blocker＞ (checked here, in {@link canBlock}) and the opponent is forced to
 * block whenever able (enforced at the block-decline chokepoint,
 * `CombatController.resolveBlock`, since a "must act" compulsion is a decision-flow
 * concern, not a target-legality one).
 */
export function hasCollision(attacker: Permanent, reader: ContinuousLegalityReader | undefined): boolean {
  if (reader?.hasKeyword(attacker.permanentId, "Collision")) return true;
  return hasPrintedKeyword(attacker, "Collision");
}

/**
 * Can `attacker` (controlled by `seat`) legally declare an attack right now,
 * irrespective of the chosen target? Mirrors the attacker-side guards shared by
 * CanAttack and CanAttackTargetDigimon (documented behavior 2214):
 *   - has a top card and is a Digimon in a battle area,
 *   - controlled by the active player,
 *   - not already suspended.
 *   - (summoning sickness) a Digimon that entered the field this turn may only
 *     attack if it has ＜Rush＞ (Comprehensive Rules §16-1).
 *
 * A continuous `attack` restriction ("can't attack") from the ledger forbids the
 * declaration outright (Comprehensive Rules §15: a "can't" rule wins).
 */
export function canAttackerDeclare(
  access: GameStateAccess,
  seat: Seat,
  attacker: Permanent,
  reader?: ContinuousLegalityReader,
  isVortex?: boolean,
  withoutSuspending = false,
): RejectReason | null {
  if (attacker.topCard === undefined) {
    return "illegal-target";
  }
  if (access.controllerOf(attacker) !== seat) {
    return "illegal-target";
  }
  if (!access.isBattleAreaDigimon(attacker, reader)) {
    return "illegal-target";
  }
  if (attacker.isSuspended) {
    return "illegal-target";
  }
  // A ＜Vortex＞-mode attack declaration is legal only from a Digimon that actually has the
  // the keyword). A normal (non-Vortex) declaration is unaffected.
  if (isVortex === true && !hasVortex(attacker, reader)) {
    return "illegal-target";
  }
  // Summoning sickness (§16-1): a Digimon that entered the field this turn may
  // only declare an attack if it has ＜Rush＞. Digivolving does NOT reset the
  // enterFieldTurnCount, so a Digimon that evolved onto an existing permanent
  // can attack (its host entered on a previous turn). §16-33-1: ＜Vortex＞ is
  // ALSO a same-turn-attack grant in its own right — a Vortex-mode declaration
  // from a Digimon with the keyword is exempt even without ＜Rush＞.
  if (
    access.game.turnCount > 0 &&
    attacker.enterFieldTurnCount === access.game.turnCount &&
    !hasRush(attacker, reader) &&
    !(isVortex === true && hasVortex(attacker, reader))
  ) {
    return "illegal-target";
  }
  if (reader?.hasRestriction(attacker.permanentId, "attack")) {
    return "illegal-target";
  }
  // A continuous "can't suspend" restriction blocks a normal attack declaration: declaring an
  // attack taps (suspends) the attacker (documented behavior), so a Digimon that can't
  // suspend can't declare a tapping attack (KB BT23-024 Q5247 — the restricted opponent Digimon
  // can't suspend, hence can't attack). A "without suspending" attack (an effect-driven untapped
  // declaration) does NOT tap and is handled by the combat verb's `withoutTap`, so it bypasses
  // this guard; the player-intent attack path always taps and is gated here.
  if (!withoutSuspending && reader?.hasRestriction(attacker.permanentId, "suspend")) {
    return "illegal-target";
  }
  return null;
}

/**
 * Is `target` a legal object for `attacker`'s attack? Mirrors the target side of
 * CanAttackTargetDigimon (documented behavior) for the core slice:
 *   - { kind: "player" } is always legal (the security/player-direct attack);
 *   - { kind: "permanent" } must be an opponent's battle-area Digimon that is
 *     SUSPENDED, unless a "can attack unsuspended" grant relaxes that (see below).
 *
 * The `cantBeAttacked` restriction (ICanNotAttackTargetDefendingPermanentEffect) is read
 * from the continuous ledger below. ICanAttackTargetDefendingPermanentEffect
 * (attack-unsuspended grants) is modelled via `reader.canAttackUnsuspended` /
 * `reader.canAttackUnsuspendedRequiresNoDigivolution`, backed by the
 * `grantCanAttackUnsuspended` primitive.
 */
export function canAttackTarget(
  access: GameStateAccess,
  seat: Seat,
  attacker: Permanent,
  target: AttackTarget,
  reader?: ContinuousLegalityReader,
  isVortex?: boolean,
): RejectReason | null {
  if (target.kind === "player") {
    // A continuous `attackPlayers` restriction ("can't attack the player /
    // can't attack players") forbids a player-directed attack.
    if (reader?.hasRestriction(attacker.permanentId, "attackPlayers")) {
      return "illegal-target";
    }
    // canAttackPlayerCondition): a ＜Vortex＞ attack targets an opponent's DIGIMON only. A player
    // target is legal ONLY when a VortexCanAttackPlayers grant relaxes it for this attacker
    // (EX11-062, KB Q5920). A NON-Vortex (normal) attack is unaffected — players stay
    // unconditionally legal, so existing combat is unchanged.
    if (isVortex === true && reader?.vortexCanAttackPlayers?.(attacker.permanentId) !== true) {
      return "illegal-target";
    }
    return null;
  }

  const defender = access.permanentById(target.permanentId);
  if (defender === undefined) {
    return "illegal-target";
  }
  if (access.controllerOf(defender) !== access.opponentOf(seat)) {
    return "illegal-target";
  }
  if (!access.isBattleAreaDigimon(defender, reader)) {
    return "illegal-target";
  }
  // "Can't attack Digimon" is target-specific: the attacker may still declare an attack
  // against a player, and a later block may still redirect that attack into a battle.
  if (reader?.hasRestriction(attacker.permanentId, "cantAttackDigimon")) {
    return "illegal-target";
  }
  // A continuous "can't be attacked" restriction on the defender forbids targeting it,
  // regardless of suspension (GainCanNotBeAttacked, e.g. P-086).
  if (reader?.hasRestriction(target.permanentId, "cantBeAttacked")) {
    return "illegal-target";
  }
  if (reader?.cannotAttackTarget?.(attacker.permanentId, target.permanentId) === true) {
    return "illegal-target";
  }
  if (!defender.isSuspended) {
    // Base rule: only suspended Digimon may be attacked — UNLESS the attacker carries a
    // "can also attack unsuspended Digimon" grant (rule implementation,
    // e.g. ST12-08), or this is a ＜Vortex＞ declaration (Comprehensive Rules §16-33-1:
    // ＜Vortex＞'s core ability IS "attack an opponent's Digimon" — unsuspended included,
    // no separate grant needed), either of which relaxes the suspension requirement.
    const defenderLevel =
      defender.topCard === undefined ? undefined : getCardDefinition(defender.topCard.cardId)?.level;
    const exactGrantAllows = reader?.canAttackUnsuspendedTarget?.(attacker.permanentId, {
      level: defenderLevel,
      hasDigivolutionCards: defender.stack.length > 0,
    });
    if (isVortex !== true) {
      if (reader?.canAttackUnsuspendedTarget !== undefined) {
        if (exactGrantAllows !== true) return "illegal-target";
      } else if (reader?.canAttackUnsuspended?.(attacker.permanentId) !== true) {
        return "illegal-target";
      }
    }
    // A "with no digivolution cards" grant (EX1-016/BT7-095) only relaxes the rule for a
    // defender whose digivolution stack is empty.
    // Vortex's own unsuspended-target permission carries no such restriction.
    if (
      isVortex !== true &&
      exactGrantAllows === undefined &&
      reader?.canAttackUnsuspendedRequiresNoDigivolution?.(attacker.permanentId) === true &&
      defender.stack.length > 0
    ) {
      return "illegal-target";
    }
  }
  return null;
}

/**
 * Can `blocker` (an opponent permanent) block the current `attacker`? Mirrors
 * Permanent.CanBlock (documented behavior):
 *   - blocker has a top card, is a battle-area Digimon, and is NOT suspended;
 *   - blocker is controlled by the attacker's opponent;
 *   - the attacker is a Digimon (so it can be blocked);
 *   - (with a reader) the blocker has ＜Blocker＞ and no `block` restriction.
 *
 * Comprehensive Rules §16-5 / §11-4: only a Digimon WITH ＜Blocker＞ may block. When a
 * reader is supplied this is enforced (printed ＜Blocker＞ or a granted one), along with
 * the `block` "can't block" restriction. Without a reader the base behavior stands
 * (any unsuspended opponent Digimon may block) so the pure unit tests are unchanged.
 * ＜Collision＞ on the attacker (§16-30) grants every opponent Digimon ＜Blocker＞ for
 * this purpose, so a non-Blocker blocker is still eligible while the attacker has it.
 *
 * The companion "forced to block whenever possible" half of ＜Collision＞ is NOT a
 * target-legality question (it doesn't change who CAN block) — it is enforced where the
 * defending seat's decline is accepted or rejected: `CombatController.resolveBlock`.
 */
export function canBlock(
  access: GameStateAccess,
  attacker: Permanent,
  blocker: Permanent,
  reader?: ContinuousLegalityReader,
): RejectReason | null {
  if (blocker.topCard === undefined) {
    return "illegal-target";
  }
  if (!access.isBattleAreaDigimon(blocker, reader)) {
    return "illegal-target";
  }
  if (blocker.isSuspended) {
    return "illegal-target";
  }
  const attackerSeat = access.controllerOf(attacker);
  if (access.controllerOf(blocker) !== access.opponentOf(attackerSeat)) {
    return "illegal-target";
  }
  if (!access.isBattleAreaDigimon(attacker, reader)) {
    return "illegal-target";
  }
  if (reader !== undefined) {
    // A continuous "can't be blocked" rule on the ATTACKER forbids every block
    // (GainCanNotBlockPlayerEffect, e.g. BT6-028 ＜Digi-Burst 2＞): the opponent's
    // Digimon can't change the target of attack by blocking (KB BT6-028 Q1419).
    if (reader.hasRestriction(attacker.permanentId, "cantBeBlocked")) {
      return "illegal-target";
    }
    // BT1-034: only blockers with at least one digivolution card may block this attacker.
    // Keep this distinct from blanket `cantBeBlocked`; a sourced blocker remains legal.
    if (reader.hasRestriction(attacker.permanentId, "cantBeBlockedByNoDigivolution") && blocker.stack.length === 0) {
      return "illegal-target";
    }
    // A block IS an attack-target switch (§12-1-1: "a rule that allows a player to switch an
    // attack target"), so a continuous "this Digimon's attack target can't change" on the
    // ATTACKER forbids every block too (LM-039, EX7-022, BT13-029).
    if (reader.hasRestriction(attacker.permanentId, "attackTargetChange")) {
      return "illegal-target";
    }
    if (reader.hasRestriction(blocker.permanentId, "block")) {
      return "illegal-target";
    }
    if (!hasBlocker(access, blocker, reader) && !hasCollision(attacker, reader)) {
      return "illegal-target"; // §16-5: a block requires ＜Blocker＞, unless the attacker's ＜Collision＞ grants it (§16-30)
    }
  }
  return null;
}

/** Opponent battle-area Digimon that may legally block the attacker right now. */
export function eligibleBlockers(
  access: GameStateAccess,
  attacker: Permanent,
  reader?: ContinuousLegalityReader,
): Permanent[] {
  const attackerSeat = access.controllerOf(attacker);
  const defendingSeat = access.opponentOf(attackerSeat);
  return access
    .battleAreaPermanents(defendingSeat)
    .filter((blocker) => canBlock(access, attacker, blocker, reader) === null);
}
