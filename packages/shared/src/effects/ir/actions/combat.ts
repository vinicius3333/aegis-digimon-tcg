// Attack declaration, battle resolution, and attack redirection.

import type { ActionBase } from "./base.js";
import type { EffectDurationRef } from "../durations.js";
import type { Controller, Target } from "../filters.js";

export interface AttackAction extends ActionBase {
  kind: "Attack";
  target: Target; // who attacks ("this Digimon", "1 of your Digimon")
  withoutSuspending?: boolean;
  /** True when the attack may target the player directly. */
  attackPlayer?: boolean;
  /** The attack subject. */
  subject?: Target;
  /** The attacker (alternative name for target). */
  attacker?: Target;
  /**
   * The Digimon that attacks is the same one chosen by the immediately preceding
   * action in this effect's sequence — no new target selection prompt.
   * The `target.sameTarget` field on `Target` carries this at the target level;
   * this top-level alias is surfaced for card authors who put it on the action
   * (BT19-091). The interpreter reads `target.sameTarget` in `resolvePermanentTargets`.
   */
  sameTarget?: boolean;
  /**
   * The resolved Digimon must attack if it is legally able to — the player cannot
   * decline (KB Q3163 on BT19-091: "must attack if possible").
   * `forceAttack` already enforces the attack unconditionally; this field is
   * declarative state (recorded for auditing/logging) and causes no additional
   * runtime gate.
   */
  mandatory?: boolean;
  /** Drain the remaining effects in this timing window while the declared attack is still open. */
  drainTimingWindowDuringAttack?: boolean;
}

/**
 * "1 of your Digimon may battle 1 of your opponent's Digimon" — a DIRECT battle (a §14 DP
 * comparison; the loser, or both on a tie, is deleted), NOT an attack: no attack declaration,
 * Per KB (Q6348/Q6278/Q5955) the battle is a rule, so it bypasses effect-immunity on the
 * chosen permanents. Distinct from AttackAction (which runs the full attack lifecycle).
 */
export interface BattleAction extends ActionBase {
  kind: "Battle";
  /** Who battles ("this Digimon", or a chosen friendly Digimon). */
  attacker: Target;
  /** Whom it battles (a chosen opponent Digimon). */
  defender: Target;
  /** Alternative: combined target specification. */
  target?: Target;
}

/** "Change the attack target to <target>" — redirect the current attack. */
export interface RedirectAttackAction extends ActionBase {
  kind: "RedirectAttack";
  /** The new attack target (a Digimon to be attacked instead). */
  target: Target;
  /**
   * Who chooses the new target. `"controller"` (the DEFAULT, and the only behavior the
   * existing RedirectAttack cards rely on) means the source card's controller picks.
   * `"opponent"` means the DEFENDING/attacked player chooses (BT4-075: "[When Attacking]
   * your opponent may choose 1 of their unsuspended Digimon ... switch the attack target
   * to it"). Absent => `"controller"`, so existing cards do not change behavior.
   */
  chooser?: "controller" | "opponent";
  /**
   * true` select), and on decline the attack proceeds unchanged. Absent => mandatory.
   */
  optional?: boolean;
  /** Mode: "mustAttack" => the target must attack. */
  mode?: string;
  /** Controller whose Digimon does the redirecting. */
  controller?: Controller;
}

/**
 * Select a permanent purely to BIND it under a handle for a later action to reference
 * ("Choose 1 of your [Shoutmon] Digimon. Delete 1 of your opponent's Digimon with DP equal
 * to or less than the chosen Digimon"). The first `Mode.Custom` select captures the chosen
 * permanent (`selectedPermanent = permanent`) without acting on it; a downstream action's
 * `Filter.relativeTo` / `PlaceUnder.underSelectionRef` reads the binding. The interpreter
 * resolves `target` (prompting the controller), stores the chosen permanentId under
 * `target.bindAs`, and performs no other effect. When nothing can be chosen the binding is
 * left empty and dependents that require it do not resolve.
 */
export interface SelectBindAction extends ActionBase {
  kind: "SelectBind";
  target: Target;
  /** Which player makes the binding choice; defaults to the effect controller. */
  chooser?: "controller" | "opponent";
}

/**
 * Positive attack-legality grant: the target Digimon MAY also attack the opponent's
 * UNSUSPENDED Digimon while active (rule implementation, e.g. ST12-08
 * "This Digimon may also attack your opponent's unsuspended Digimon for the turn"). The
 * base rule allows attacking only a suspended defender; this relaxes it for the target.
 */
export interface GrantCanAttackUnsuspendedAction extends ActionBase {
  kind: "GrantCanAttackUnsuspended";
  target: Target;
  duration: EffectDurationRef;
  /**
   * When true, the grant only relaxes the suspension requirement for opponent Digimon that
   * have NO digivolution cards under them (documented behavior DefenderCondition `defender.HasNoDigivolutionCards`,
   * e.g. EX1-016/EX1-020/BT7-095 "...unsuspended Digimon with no digivolution cards"). Omitted/false
   * = any unsuspended opponent Digimon (ST12-08/P-058 "...unsuspended Digimon").
   */
  noDigivolutionCards?: boolean;
}

export interface GrantVortexCanAttackPlayersAction extends ActionBase {
  kind: "GrantVortexCanAttackPlayers";
  target: Target;
  duration: EffectDurationRef;
}

/**
 * "End that attack" (AttackProcess.EndAttack, e.g. BT23-069): transition the current
 * attack straight to the end-of-attack timing. A no-op when no attack is resolving. The
 * attacking Digimon is NOT affected — this changes the TIMING, not the Digimon (KB
 * BT23-069 Q5339/Q5340), so it ends even an effect-immune attacker's attack.
 */
export interface EndAttackAction extends ActionBase {
  kind: "EndAttack";
}

/**
 * Arm the "suspend-restriction-with-superlative-exception" (BT23-024): "other than their
 * highest play cost Digimon, none of your opponent's Digimon can suspend until their turn
 * ends." This is NOT a plain per-target Restrict — the EXEMPT set (the highest-play-cost
 * opponent Digimon) is RECOMPUTED each continuous pass as the board changes (KB BT23-024
 * Q5250/Q5252; Q6025/Q6026: if none has a play cost, ALL are restricted). The action arms a
 * duration-scoped source marker (default UntilOpponentTurnEnd, "until their turn ends"); the
 * continuous-recompute pass re-derives the affected opponent set from the live board and
 * records the per-target `suspend` restriction each pass. The consume-site is
 * combat/legality.canAttackerDeclare (a Digimon that can't suspend can't declare a tapping
 * attack).
 */
export interface ArmSuspendRestrictionAction extends ActionBase {
  kind: "ArmSuspendRestriction";
  /** Duration the arming holds (default "untilOpponentTurnEnd" — "until their turn ends"). */
  duration?: EffectDurationRef;
}
