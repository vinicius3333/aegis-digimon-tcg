import {
  EffectTiming,
  type Permanent,
  type CardInstance,
  type Seat,
  type AttackTarget,
  type ServerEvent,
  type CardColor,
  getCardDefinition,
} from "@aegis/shared";
import type { GameStateAccess } from "../state/access.js";
import type { RemovalCause, SubTriggerEventName, TriggerInfo } from "../effects/EffectContext.js";
import { eligibleBlockers, hasCollision, type ContinuousLegalityReader } from "./legality.js";
import { fragmentCountOf } from "./keywords.js";
import { resolvePermanentBattle } from "./resolve.js";
import { recordDigimonAttack } from "../turnActivity.js";
import type { SecurityCheckReason } from "../security/securityCheck.js";

/**
 * The attack lifecycle + block window (subsystem: attack-and-block).
 *
 * source coroutine state machine (Attack -> Counter -> Block -> Battle -> End ->
 * CleanUp; documented behavior) becomes one linear `async` resolveAttack;
 * anywhere the original blocked a coroutine waiting on the defender to pick a
 * blocker, the TS version `await`s a block-window promise resolved by an incoming
 * declareBlock / declineBlock intent (ARCHITECTURE.md section 5; API-CONTRACT.md
 * section 6 "Attack into security").
 *
 * All presentation is stripped. The Digimon-vs-Digimon DP
 * battle is delegated to the pure resolver in resolve.ts; the player-directed
 * (security) case is handed off to the security-and-win-check subsystem via the
 * injected `checkSecurity` hook — this module does not own security resolution
 * (it only opens the door and lets that subsystem flip/resolve/declare).
 *
 * Effect timings (When Attacking, OnBlock, end-of-attack) fire through the
 * injected `fireTiming` seam so this module does not depend on the
 * effect-stack-resolution subsystem; until that lands the seam is a no-op and the
 * narration events below are the visible record of combat.
 */

/** A live block window awaiting the defending seat's declareBlock / declineBlock. */
/** Battle completion payload, published once the outer attack reaches cleanup. */
interface CompletedCombat {
  seat: Seat;
  attackerPermanentId: string;
  deletedPermanentIds: string[];
}

interface OpenBlockWindow {
  attackerPermanentId: string;
  defendingSeat: Seat;
  eligibleBlockerIds: Set<string>;
  /** Resolve with the chosen blocker permanent id, or null when the window is passed. */
  resolve: (blockerPermanentId: string | null) => void;
}

/** A live ＜Alliance＞ decision awaiting a seat's ally choice. */
interface AllianceDecisionWindow {
  permanentId: string;
  seat: Seat;
  eligibleAllyIds: Set<string>;
  resolve: (allyPermanentId: string | null) => void;
}

/** A live ＜Evade＞ decision for a single permanent. */
interface EvadeDecisionWindow {
  permanentId: string;
  seat: Seat;
  resolve: (accept: boolean) => void;
}

/** A live ＜Barrier＞ decision for a single permanent. */
interface BarrierDecisionWindow {
  permanentId: string;
  seat: Seat;
  resolve: (accept: boolean) => void;
}

/**
 * A live §11-3 Counter Timing window: open while the non-turn (defending) seat
 * may activate at most 1 [Counter] effect for this attack. `resolve` is called by
 * the matching `respondCounter` intent handler (either after passing, or after it
 * has already run the chosen [Counter] effect's body) — mirroring the block/
 * alliance/evade/barrier decision windows above.
 */
interface OpenCounterWindow {
  attackerPermanentId: string;
  defendingSeat: Seat;
  resolve: () => void;
}

/** Minimal trigger payload passed to the effect-stack seam for combat timings. */
export interface CombatTrigger {
  subjectPermanentId?: string;
  suspendedPermanentId?: string;
  attackerPermanentId?: string;
  attackSequence?: number;
  attackMechanic?: string;
  defenderPermanentId?: string;
  blockerPermanentId?: string;
  target?: AttackTarget;
  /** A permanent deleted by the battle (OnDestroyedAnyone). */
  deletedPermanentId?: string;
  /** Every permanent deleted by the same simultaneous battle outcome. */
  deletedPermanentIds?: string[];
  /** Controller and top-card facts captured before the battle losers leave play. */
  deletedPermanentSnapshots?: TriggerInfo["deletedPermanentSnapshots"];
  /** The sole surviving battle participant that caused the deletion; absent for ties. */
  deletingPermanentId?: string;
  /** Controller of the first deleted permanent. */
  deletedControllerSeat?: Seat;
  /** Why the permanent left play, for deletion-condition gates. */
  removalCause?: RemovalCause;
  deletedTopCardId?: string;
  deletedEffectiveColorsByInstanceId?: Record<string, CardColor[]>;
  /** The card instances that actually left the field in this battle's deletion window. */
  deletedInstanceIds?: string[];
  /** Subset of deletedInstanceIds that were stack cards (for inherited-effect gating). */
  deletedWasStackInstanceIds?: string[];
  /** Subset of deletedInstanceIds that were linked cards before deletion. */
  deletedWasLinkedInstanceIds?: string[];
  /** Deleted host top-card instance keyed by each linked card that left with it. */
  deletedLinkHostInstanceByLinkedInstanceId?: Record<string, string>;
  /** Top-card instance IDs that individually reached exactly 0 DP in this deletion window. */
  deletedByDpZeroInstanceIds?: string[];
  battleOpponentPermanentIdByInstanceId?: Record<string, string>;
  /** Retaliation holders actually deleted in battle, paired with their battled opponent. */
  retaliationTargetsByInstanceId?: Record<string, string>;
}

/**
 * Capabilities the controller needs from the engine: narration, the effect-stack
 * seam, and the security-and-win-check hand-off. Injected so combat stays
 * decoupled from transport and from sibling subsystems' internals.
 */
export interface CombatHooks {
  emit: (event: ServerEvent) => void;
  /**
   * Fire an effect-timing window through the effect stack. No-op until
   * effect-stack-resolution lands; the attack/block flow runs and narrates either
   * way (subsystems: effect-framework, effect-stack-resolution).
   */
  fireTiming: (timing: EffectTiming, trigger: CombatTrigger) => Promise<void>;
  /** Resolve simultaneous [On Deletion]/<Ascension> reactions in controller-chosen order. */
  resolveDeletionReactions?: (
    trigger: CombatTrigger,
    ascensionCandidates: readonly { instanceId: string; seat: Seat }[],
    transientCandidates?: readonly CardInstance[],
  ) => Promise<void>;
  /** Effective colors captured immediately before a battle deletion. */
  effectiveColorsOf?: (permanentId: string) => CardColor[];
  /**
   * Fire the SubTrigger bus (System B) for a combat event, running armed watchers whose
   * captured sourceFilter matches the payload (delayed-and-rule-effects). Distinct from
   * `fireTiming` (System A): a `whenAttacking` / `whenOpponentAttacks` / `whenDeletesInBattle`
   * watcher was armed by an already-resolved effect and reacts to this attack/battle. Optional
   * so the combat unit tests (minimal hooks) need no change; absent => no watcher runs.
   */
  fireSubTrigger?: (event: SubTriggerEventName, payload: TriggerInfo) => Promise<void>;
  /**
   * Snapshot a SubTrigger event's armed watchers at the instant the event occurs, while
   * deferring their activation until the caller invokes the returned function. Attack
   * declarations use this to preserve the event-time watcher set while System-A
   * [When Attacking] effects resolve first.
   */
  prepareSubTrigger?: (event: SubTriggerEventName, payload: TriggerInfo) => () => Promise<void>;
  /** Capture event-time eligibility before battle losers leave, without resolving reactions. */
  prepareFrozenSubTrigger?: (event: SubTriggerEventName, payload: TriggerInfo) => () => Promise<void>;
  /** Refresh passive effects at the battle-deletion boundary, before reactions activate. */
  refreshContinuousEffects?: () => Promise<void>;
  /**
   * Consult card-authored deletion replacements before battle losers leave the field. The
   * effect-path primitive already uses the same shared consult; combat otherwise deletes by
   * raw state access and would pay a prevention cost without actually saving the Digimon.
   */
  consultLeavePrevention?: (permanentIds: string[]) => Promise<Set<string>>;
  /**
   * Drop a battle-deleted permanent's modifier / continuous / SubTrigger ledgers as it
   * leaves the field (subsystems: static-continuous-effects, delayed-and-rule-effects).
   * Combat deletes through raw state access, so it routes per-permanent teardown here to
   * stay single-sourced with the effect-path primitive — a stale reduceCost/prevent
   * replacement or watcher from a Digimon that died in battle must not survive to fire.
   * Optional so the combat unit tests (minimal hooks) keep the base behavior (no teardown).
   */
  dropPermanentSubscriptions?: (permanentId: string) => void;
  /**
   * Resolve a successful, unblocked player-directed attack against `defenderSeat`
   * by running the security check (subsystem: security-and-win-check). The engine
   * binds this to runSecurityCheck(...); combat never flips a security card itself.
   */
  checkSecurity: (defenderSeat: Seat, attackerPermanentId: string, reason: SecurityCheckReason) => Promise<void>;
  /**
   * Whether a permanent currently has ＜Piercing＞ (subsystem: keyword-abilities).
   * Read post-win in resolveDigimonBattle: a piercing attacker that deletes the
   * defending Digimon then performs the defending player's security check
   * (Comprehensive Rules §16-7 / source OnDetermineDoSecurityCheck). Optional so the
   * combat unit tests (minimal hooks) keep the base "no pierce" behavior.
   */
  hasPierce?: (permanentId: string) => boolean;
  /**
   * Expire the attack/battle-scoped duration modifiers (`UntilEndAttack` /
   * `UntilEndBattle`) and re-derive the continuous tier, at the end of an attack
   * (subsystems: static-continuous-effects, effect-primitives). The source cleared
   * its `UntilEndAttackEffects` / `UntilEndBattleEffects` lists here. Optional so the
   * combat unit tests (which pass a minimal hooks object) need no change.
   */
  sweepEndOfAttack?: () => void;
  /**
   * The shared continuous-rule reader (ContinuousEffectLedger). When supplied, the
   * block window only offers Digimon with ＜Blocker＞ and no `block` restriction
   * (Comprehensive Rules §16-5). Optional so the combat unit tests keep the base
   * "any unsuspended Digimon may block" behavior.
   */
  continuous?: ContinuousLegalityReader;
  /** Resolve a keyword from printed top-card text plus live continuous grants. */
  hasKeyword?: (permanentId: string, keyword: string) => boolean;
  /**
   * Add a battle-scoped DP modifier (UntilEndBattle). Used by ＜Alliance＞ (§16-24) to
   * boost the attacking Digimon's DP for the current battle. The modifier is cleaned
   * up by `sweepEndOfAttack`. Optional so combat unit tests (minimal hooks) keep the
   * base behavior.
   */
  addDpModifier?: (permanentId: string, delta: number) => void;
  /** Add Alliance's Security Attack +1 for this attack, independent of its source remaining active. */
  addSecurityAttack?: (permanentId: string) => void;
  /**
   * Once-per-turn prevention ledger (＜Barrier＞). `barrierFired` returns true
   * when the given per-permanent key has already prevented a removal this turn;
   * `markBarrierFired` records it after a successful prevent.
   */
  barrierFired?: (key: string) => boolean;
  markBarrierFired?: (key: string) => void;
  /**
   * Ask `seat` to optionally choose ONE of `candidateInstanceIds` (each the topCard instance
   * of an eligible permanent), or decline. Backs the ＜Raid＞ redirect choice (§16-23) and the
   * ＜Scapegoat＞ sacrifice choice (§16-32) — both are a single "pick one of these, or pass"
   * decision, so they share the generic selectCards decision channel instead of each keyword
   * inventing its own protocol intent. Optional so the combat unit tests (minimal hooks) skip
   * straight to "no choice offered" (undefined == decline).
   */
  selectOptionalInstance?: (
    seat: Seat,
    candidateInstanceIds: string[],
    promptText: string,
  ) => Promise<string | undefined>;
  /**
   * Replay a loose card instance (already moved to trash by the caller) as a fresh
   * battle-area permanent, without paying its cost. Backs ＜Fortitude＞'s mandatory
   * replay-on-deletion (§16-27). Optional so the combat unit tests (minimal hooks) leave a
   * Fortitude-holder's deletion a no-op replay (matching the pre-existing base behavior).
   */
  replayFromTrash?: (instanceId: string) => Promise<void>;
  /**
   * Ask `seat` to optionally choose exactly `count` of `candidateInstanceIds`, or decline
   * (anything short of `count` is a decline — the choice is all-or-nothing). Backs ＜Fragment
   * (N)＞'s "choose and trash N digivolution cards" cost (§16-37). Optional so the combat unit
   * tests (minimal hooks) skip straight to decline.
   */
  selectOptionalInstances?: (
    seat: Seat,
    candidateInstanceIds: string[],
    count: number,
    promptText: string,
  ) => Promise<string[] | undefined>;
  /**
   * Pay ＜Armor Purge＞'s cost on an already-accepted decision: trash this permanent's own
   * current top card, promoting the digivolution card beneath it to the new top (§16-19).
   * Optional so the combat unit tests (minimal hooks) leave it a no-op (the deletion is
   * already excluded from `toDelete` source by the same optional-hook pattern as Fortitude).
   */
  armorPurge?: (permanentId: string) => Promise<void>;
  /**
   * Trash `instanceIds` from `hostPermanentId`'s own digivolution stack as an already-accepted
   * cost. Backs ＜Fragment＞'s cost payment (§16-37). Optional, mirrors `armorPurge`.
   */
  trashDigivolutionCards?: (hostPermanentId: string, instanceIds: string[]) => Promise<void>;
  /** Eligible linked cards for a battle-only ＜Detach (trait)＞ prevention. */
  detachEligibleLinkedCards?: (permanentId: string) => CardInstance[];
  /** Trash the accepted eligible link through the ordinary trash/event/Overflow seam. */
  detachLinkedCard?: (permanentId: string, instanceId: string) => Promise<boolean>;
  /**
   * Place a card instance already loose in trash at the top of its owner's security stack, on
   * an already-accepted decision. Backs ＜Ascension＞'s reaction (§16-43). Optional, mirrors
   * `replayFromTrash`.
   */
  ascendToSecurity?: (instanceId: string) => Promise<void>;
  /**
   * ＜Material Save＞'s full reaction (§16-21): decision, Tamer choice, and card relocation, as
   * one atomic step (unlike Armor Purge/Fragment/Ascension, its decision tree has an internal
   * branch — a Tamer to place under — that does not fit the generic accept/decline hooks).
   * Must be called BEFORE the permanent's cards move to trash. Optional, mirrors
   * `replayFromTrash`.
   */
  materialSave?: (permanentId: string) => Promise<void>;
  /**
   * List `seat`'s currently-activatable [Counter] effects (Comprehensive Rules
   * §11-3-1), one entry per (source instance, effect) pair — mirrors the engine's
   * `syncActivatableEffects` but scoped to the defending seat and the
   * `EffectTiming.OnCounterTiming` window. Used to decide whether the counter
   * timing window needs a round trip at all: with nothing eligible, `runCounterWindow`
   * resolves immediately without prompting (mirrors `runBlockWindow`'s "no eligible
   * blocker" shortcut). Optional so the combat unit tests (minimal hooks) keep the
   * base "nothing eligible" behavior.
   */
  counterEligible?: (seat: Seat) => { instanceId: string; effectKey: string; description: string }[];
}

export class CombatController {
  private attackSequence = 0;
  private openWindow: OpenBlockWindow | undefined;
  private resolving = false;
  /**
   * The in-flight attack's mutable attacker/target, exposed so an effect resolving at
   * an attack timing (When Attacking, Counter) can REDIRECT it before the defender is
   * locked in (`redirectTarget`). Undefined when no attack is resolving.
   */
  private currentAttack:
    | { attackerPermanentId: string; attackerCardId: string; seat: Seat; target: AttackTarget }
    | undefined;
  /**
   * Set by {@link endAttack} when an effect (e.g. BT23-069) ends the in-flight attack: the
   * flow skips the block window and battle and transitions straight to end-of-attack
   * (AttackProcess.EndAttack). Reset by `cleanup`.
   */
  private endRequested = false;
  /** Permanents that have already attacked this turn (§11-2-3). */
  readonly attackedThisTurn = new Set<string>();
  /** Active ＜Alliance＞ decision window. */
  private allianceDecision: AllianceDecisionWindow | undefined;
  /** Active ＜Evade＞ decision window. */
  private evadeDecision: EvadeDecisionWindow | undefined;
  /** Active ＜Barrier＞ decision window. */
  private barrierDecision: BarrierDecisionWindow | undefined;
  /** Active §11-3 Counter Timing window. */
  private counterWindow: OpenCounterWindow | undefined;
  /** Battle completion payload held until the outer attack reaches cleanup. */
  private completedCombat: CompletedCombat | undefined;

  /**
   * Take the held battle-completion payload and clear it. Reading the field directly from
   * `resolveAttack` is not enough: that method clears the field on entry, so the compiler's
   * control-flow analysis narrows every later read to `undefined` and cannot see that the
   * intervening battle resolution repopulated it.
   */
  private takeCompletedCombat(): CompletedCombat | undefined {
    const completed = this.completedCombat;
    this.completedCombat = undefined;
    return completed;
  }
  /**
   * [Counter] effects activated so far THIS attack (§11-3-2 caps it at 1). Reset by
   * `cleanup` at the end of every attack.
   */
  private counterActivationsThisAttack = 0;

  constructor(
    private readonly access: GameStateAccess,
    private readonly hooks: CombatHooks,
  ) {}

  private hasKeyword(permanentId: string, keyword: string): boolean {
    return (
      this.hooks.hasKeyword?.(permanentId, keyword) ?? this.hooks.continuous?.hasKeyword(permanentId, keyword) ?? false
    );
  }

  /** True while an attack is mid-resolution (source AttackProcess.IsAttacking). */
  get isAttacking(): boolean {
    return this.resolving;
  }

  /**
   * Whether `seat` has an unsuspended Digimon with ＜Blitz＞ that hasn't attacked
   * this turn. Used to gate the turn-end check: when memory has crossed to the
   * opponent and a Blitz-eligible Digimon exists, the player gets one more attack
   * before the turn ends (Comprehensive Rules §16-22).
   */
  hasBlitzAttackAvailable(seat: Seat): boolean {
    return this.blitzEligiblePermanentIds(seat).length > 0;
  }

  /** Unsuspended Blitz holders that can legally receive the current one-shot window. */
  blitzEligiblePermanentIds(seat: Seat): string[] {
    const eligible: string[] = [];
    for (const perm of this.access.battleAreaPermanents(seat)) {
      if (perm.isSuspended) continue;
      if (!this.access.isBattleAreaDigimon(perm, this.hooks.continuous)) continue;
      if (this.attackedThisTurn.has(perm.permanentId)) continue;
      if (this.hasKeyword(perm.permanentId, "Blitz")) {
        eligible.push(perm.permanentId);
      }
    }
    return eligible;
  }

  /** The attacker permanent id of the in-flight attack, if any (for effect-driven redirect). */
  get currentAttackerId(): string | undefined {
    return this.currentAttack?.attackerPermanentId;
  }

  /** Unsuspending after an attack makes the Digimon eligible to declare another attack. */
  resetAttackEligibility(permanentId: string): void {
    this.attackedThisTurn.delete(permanentId);
  }

  /**
   * Redirect the in-flight attack onto `target` (a Counter/When-Attacking effect
   * changing who is attacked). Mutates the resolving attack's target so the upcoming
   * block-window / battle resolution uses it (Comprehensive Rules §11-2-7-2: the
   * attack target may switch). A no-op when no attack is resolving. Re-narrates via
   * `attackDeclared` (the new target) so the client log reflects the switch.
   */
  redirectTarget(target: AttackTarget): boolean {
    if (this.currentAttack === undefined) return false;
    // "This Digimon's attack target can't change" (§15-1-3, LM-039/EX7-022/BT13-029). The
    // restriction sits on the ATTACKER, and every printed instance is unscoped — it blocks the
    // switch whoever is attempting it. Returning false lets the caller see the redirect failed.
    if (this.hooks.continuous?.hasRestriction(this.currentAttack.attackerPermanentId, "attackTargetChange") === true) {
      return false;
    }
    this.currentAttack.target = target;
    const targetCardId =
      target.kind === "permanent" ? this.access.permanentById(target.permanentId)?.topCard.cardId : undefined;
    this.hooks.emit({
      kind: "attackDeclared",
      seat: this.currentAttack.seat,
      attackerPermanentId: this.currentAttack.attackerPermanentId,
      attackerCardId: this.currentAttack.attackerCardId,
      target,
      ...(targetCardId === undefined ? {} : { targetCardId }),
    });
    return true;
  }

  /**
   * End the in-flight attack (BT23-069 "end that attack"): the upcoming block-window /
   * battle resolution is skipped and the flow transitions to end-of-attack. The attack
   * does NOT succeed (no block/counter/battle). A no-op when no attack is resolving.
   * Comprehensive Rules: this changes the TIMING, not the attacking Digimon (KB Q5340).
   */
  endAttack(): boolean {
    if (this.currentAttack === undefined) return false;
    this.endRequested = true;
    return true;
  }

  /** True while the defending seat may declare/decline a block. */
  get hasOpenBlockWindow(): boolean {
    return this.openWindow !== undefined;
  }

  /** The seat that must answer the open block window, if any. */
  get blockingSeat(): Seat | undefined {
    return this.openWindow?.defendingSeat;
  }

  /** The attacking permanent id of the open block window, if any. */
  get attackingPermanentId(): string | undefined {
    return this.openWindow?.attackerPermanentId;
  }

  /** True while an ＜Alliance＞ decision window is open. */
  get hasOpenAllianceDecision(): boolean {
    return this.allianceDecision !== undefined;
  }

  /** The seat that must answer the open Alliance decision, if any. */
  get allianceDecisionSeat(): Seat | undefined {
    return this.allianceDecision?.seat;
  }

  /** The permanent id the Alliance decision is for, if any. */
  get allianceDecisionPermanentId(): string | undefined {
    return this.allianceDecision?.permanentId;
  }

  /** The eligible ally ids for the open Alliance decision, if any. */
  get allianceDecisionEligibleAllyIds(): Set<string> | undefined {
    return this.allianceDecision?.eligibleAllyIds;
  }

  /** True while an ＜Evade＞ decision window is open. */
  get hasOpenEvadeDecision(): boolean {
    return this.evadeDecision !== undefined;
  }

  /** The permanent id the Evade decision is for, if any. */
  get evadeDecisionPermanentId(): string | undefined {
    return this.evadeDecision?.permanentId;
  }

  /** True while a ＜Barrier＞ decision window is open. */
  get hasOpenBarrierDecision(): boolean {
    return this.barrierDecision !== undefined;
  }

  /** The permanent id the Barrier decision is for, if any. */
  get barrierDecisionPermanentId(): string | undefined {
    return this.barrierDecision?.permanentId;
  }

  /** True while a §11-3 Counter Timing window is open. */
  get hasOpenCounterWindow(): boolean {
    return this.counterWindow !== undefined;
  }

  /** The defending seat that must answer the open Counter Timing window, if any. */
  get counterWindowSeat(): Seat | undefined {
    return this.counterWindow?.defendingSeat;
  }

  /** The attacking permanent id of the open Counter Timing window, if any. */
  get counterWindowAttackerPermanentId(): string | undefined {
    return this.counterWindow?.attackerPermanentId;
  }

  /** How many more [Counter] effects may be activated THIS attack (§11-3-2 caps it at 1). */
  get counterActivationsRemaining(): number {
    return this.counterActivationsThisAttack >= 1 ? 0 : 1;
  }

  /**
   * Run a full attack to completion. The caller (the attack action) has already
   * validated legality. Phases mirror AttackProcess.Attack -> ProcessNextState:
   *   1. suspend the attacker (unless withoutTap) and fire When Attacking,
   *   2. open the §11-3 Counter Timing window: the defending seat may activate at
   *      most 1 [Counter] effect for this attack,
   *   3. open the block window; if a blocker is declared, switch the defender onto
   *      it (suspend it, fire OnBlock),
   *   4. resolve combat: vs a Digimon -> DP battle (delete loser/both on a tie);
   *      vs the player -> security-and-win-check hand-off,
   *   5. fire end-of-attack, then clean up.
   */
  async resolveAttack(
    attackerSeat: Seat,
    attacker: Permanent,
    target: AttackTarget,
    opts: {
      withoutTap?: boolean;
      attackMechanic?: string;
      afterAttackTriggers?: () => Promise<void>;
      drainTimingWindow?: () => Promise<void>;
    } = {},
  ): Promise<void> {
    this.resolving = true;
    this.completedCombat = undefined;
    const attackSequence = ++this.attackSequence;
    // Raid triggers at declaration; evolution during When Attacking cannot
    // retroactively add that trigger (EX9-001 / Q4751-Q4752).
    const raidTriggeredAtDeclaration = this.hasKeyword(attacker.permanentId, "Raid");
    this.currentAttack = {
      attackerPermanentId: attacker.permanentId,
      attackerCardId: attacker.topCard.cardId,
      seat: attackerSeat,
      target,
    };
    this.attackedThisTurn.add(attacker.permanentId);
    // Attack declarations are legal only for Digimon-kind permanents, so recording the seat
    // unconditionally here also covers Tamers temporarily treated as Digimon.
    recordDigimonAttack(this.access.game, attackerSeat);
    try {
      // 1. Suspend the attacker (documented behavior).
      const attackerSuspended = opts.withoutTap !== true ? this.suspendInCombat(attacker) : false;
      const targetCardId =
        target.kind === "permanent" ? this.access.permanentById(target.permanentId)?.topCard.cardId : undefined;
      this.hooks.emit({
        kind: "attackDeclared",
        seat: attackerSeat,
        attackerPermanentId: attacker.permanentId,
        attackerCardId: attacker.topCard.cardId,
        target,
        ...(targetCardId === undefined ? {} : { targetCardId }),
      });
      // The declaration is complete, so armed "when any Digimon suspend" watchers may run.
      await this.fireSuspended(attacker, attackerSuspended);

      // When Attacking. source fires OnAllyAttack here (documented behavior);
      // also fire OnUseAttack so "when this attacks" triggered/inherited effects
      // (e.g. the BT7-089 pierce builder) get their window once the stack lands.
      const attackTrigger: CombatTrigger = {
        attackerPermanentId: attacker.permanentId,
        target,
        ...(opts.attackMechanic === undefined ? {} : { attackMechanic: opts.attackMechanic }),
        ...(target.kind === "permanent" ? { defenderPermanentId: target.permanentId } : {}),
      };
      const attackSubTriggerPayload: TriggerInfo = {
        attackerPermanentId: attacker.permanentId,
        attackerDPAtDeclaration: attacker.currentDP,
        attackSequence,
        ...(attackTrigger.defenderPermanentId !== undefined
          ? { defenderPermanentId: attackTrigger.defenderPermanentId }
          : {}),
      };
      const preparedWhenAttacking = this.hooks.prepareSubTrigger?.("whenAttacking", attackSubTriggerPayload);
      const preparedWhenOpponentAttacks = this.hooks.prepareSubTrigger?.(
        "whenOpponentAttacks",
        attackSubTriggerPayload,
      );
      await this.hooks.fireTiming(EffectTiming.OnUseAttack, attackTrigger);
      await this.hooks.fireTiming(EffectTiming.OnAllyAttack, attackTrigger);

      // SubTrigger bus (System B): armed "when this attacks" / "when an opponent's Digimon
      // attacks" watchers. Fired EXACTLY ONCE here (not at both OnUseAttack and OnAllyAttack)
      // so a single attack runs each watcher's body once — these bus watchers are distinct
      // installs from the System-A timing-collected attack builders, so there is no
      // cross-system double-fire (RESEARCH Pitfall 4 / Assumption A3). The attacker is the
      // event subject for both events; a watcher's captured sourceFilter gates on it.
      if (preparedWhenAttacking !== undefined) await preparedWhenAttacking();
      else await this.hooks.fireSubTrigger?.("whenAttacking", attackSubTriggerPayload);
      if (preparedWhenOpponentAttacks !== undefined) await preparedWhenOpponentAttacks();
      else await this.hooks.fireSubTrigger?.("whenOpponentAttacks", attackSubTriggerPayload);
      // A suspension paid as the cost of an effect-driven forced attack triggers at the
      // same time as the attack declaration. Resolve the turn player's When Attacking
      // effects first, then the deferred non-turn suspension watchers (EX3-024/074,
      // Q3399/Q3401). The target was already fixed while Examon was still suspended.
      if (opts.afterAttackTriggers !== undefined) await opts.afterAttackTriggers();

      // ＜Alliance＞ (§16-24): when this Digimon attacks, you may suspend another
      // Digimon you control to add its DP to this Digimon for the battle.
      if (this.hasKeyword(attacker.permanentId, "Alliance")) {
        const allyIds = this.access
          .battleAreaPermanents(attackerSeat)
          .filter(
            (p) =>
              p.permanentId !== attacker.permanentId &&
              !p.isSuspended &&
              this.access.isBattleAreaDigimon(p, this.hooks.continuous),
          )
          .map((p) => p.permanentId);
        if (allyIds.length > 0) {
          const allyId = await this.runAllianceDecision(attackerSeat, attacker.permanentId, allyIds);
          if (allyId !== null) {
            const ally = this.access.permanentById(allyId);
            if (ally !== undefined) {
              // Cost then benefit, with no yield between them (§16-24 is one effect).
              const allySuspended = this.suspendInCombat(ally);
              this.hooks.addDpModifier?.(attacker.permanentId, ally.currentDP);
              this.hooks.addSecurityAttack?.(attacker.permanentId);
              await this.fireSuspended(ally, allySuspended);
              // Alliance suspends its chosen ally as an effect cost (§16-24), so the
              // effect-suspension bus must observe the actual transition after the keyword's
              // DP/security benefit has been installed. Carry the attacking card as the
              // producer so watchers such as EX4-032/033/034 can distinguish Alliance from
              // an unrelated suspension effect.
              if (allySuspended) {
                await this.hooks.fireSubTrigger?.("whenEffectSuspends", {
                  subjectPermanentId: ally.permanentId,
                  suspendedPermanentId: ally.permanentId,
                  effectSuspendSeat: attackerSeat,
                  byEffectCardId: attacker.topCard.cardId,
                });
              }
            }
          }
        }
      }

      // ＜Raid＞ (§16-23): when this Digimon attacks, you may switch the attack target onto
      // the opponent's UNSUSPENDED Digimon with the highest DP (§16-23-4: the attacker's
      // controller picks among any tied for highest).
      if (raidTriggeredAtDeclaration && this.attackerStillValid(attacker)) {
        const defendingSeat = this.access.opponentOf(attackerSeat);
        const unsuspended = this.access
          .battleAreaPermanents(defendingSeat)
          .filter(
            (p) =>
              !p.isSuspended && this.access.isBattleAreaDigimon(p, this.hooks.continuous) && p.topCard !== undefined,
          );
        if (unsuspended.length > 0) {
          const highestDP = Math.max(...unsuspended.map((p) => p.currentDP));
          const tied = unsuspended.filter((p) => p.currentDP === highestDP);
          const chosenInstanceId = await this.hooks.selectOptionalInstance?.(
            attackerSeat,
            tied.map((p) => p.topCard!.instanceId),
            "＜Raid＞: switch the attack target to this opponent's Digimon?",
          );
          if (chosenInstanceId !== undefined) {
            const chosen = tied.find((p) => p.topCard?.instanceId === chosenInstanceId);
            if (chosen !== undefined) {
              if (this.redirectTarget({ kind: "permanent", permanentId: chosen.permanentId })) {
                await this.hooks.fireSubTrigger?.("whenAttackTargetSwitched", {
                  subjectPermanentId: attacker.permanentId,
                  attackerPermanentId: attacker.permanentId,
                });
              }
            }
          }
        }
      }

      // A flagged forced attack can drain the remainder of its already-open timing
      // window here. Combat stays marked as resolving, so another forced attack from
      // that same simultaneous group is correctly a no-op instead of nesting.
      if (opts.drainTimingWindow !== undefined) await opts.drainTimingWindow();

      // The target may also have been switched by an effect resolved by the drain;
      // read it only after every pre-Counter redirect opportunity has completed.
      const effectiveTarget = this.currentAttack?.target ?? target;

      // 2. §11-3 Counter Timing (11-1-3's ordered list places it here: after the When
      // Attacking timings have fully resolved — 11-1-4's own example — and before block
      // timing). 11-1-5: this window still occurs even if the attacker later becomes
      // invalid, so it runs before the attacker-validity short-circuit below.
      //
      // `runCounterWindow` returns undefined (not a resolved Promise) when nothing is
      // eligible, so this conditionally skips the `await` entirely rather than awaiting an
      // already-resolved Promise — every attack pays this window's cost in a real await tick
      // ONLY when there is something to actually wait for. An unconditional await here (even
      // of `Promise.resolve()`) would add a microtask tick to EVERY attack, silently exhausting
      // the fixed microtask-tick budget `testkit/harness.ts`'s `settle()` gives already-deep
      // async chains elsewhere in the suite (mechanic.test.ts BLK-03, overflow.test.ts,
      // keywordBattle.test.ts all went from green to red on exactly that regression).
      const counterWait = this.runCounterWindow(attackerSeat, attacker);
      if (counterWait !== undefined) await counterWait;

      // source fires OnEndAttack (AttackProcess.EndAttack) whenever the attack reaches its
      // end, including an early end (Comprehensive Rules §11-5-1-4 / §11-6: an unsuccessful
      // attack "ends without anything happening" but still reaches the End of Attack timing).
      // The attacker-invalidation guards below must fire it too, mirroring the endRequested
      // sibling path, rather than returning silently and skipping the window.
      if (!this.attackerStillValid(attacker)) {
        await this.hooks.fireTiming(EffectTiming.OnEndAttack, {
          ...attackTrigger,
          target: effectiveTarget,
        });
        return;
      }

      // An effect (e.g. BT23-069) may have ended the attack during the When Attacking
      // timings: skip the block window and battle and transition straight to end-of-attack
      // (AttackProcess.EndAttack). The attack does not succeed.
      if (this.endRequested) {
        await this.hooks.fireTiming(EffectTiming.OnEndAttack, {
          ...attackTrigger,
          target: effectiveTarget,
        });
        return;
      }

      // 3. Block window (AttackProcess.BlockTiming, cs:322-405).
      let defender = this.currentDefender(effectiveTarget);
      const blockerId = await this.runBlockWindow(attackerSeat, attacker);
      if (blockerId !== null) {
        const blocker = this.access.permanentById(blockerId);
        if (blocker !== undefined) {
          defender = blocker;
          await this.switchDefenderToBlocker(attacker, blocker);
        }
      }

      if (!this.attackerStillValid(attacker)) {
        await this.hooks.fireTiming(EffectTiming.OnEndAttack, {
          ...attackTrigger,
          target: effectiveTarget,
        });
        return;
      }

      // An effect may end the attack specifically because the block switched its target
      // (BT16-032). That trigger resolves inside switchDefenderToBlocker, after the earlier
      // pre-block endRequested check, so honor the newly-requested end before comparing DP.
      if (this.endRequested) {
        await this.hooks.fireTiming(EffectTiming.OnEndAttack, {
          ...attackTrigger,
          target: effectiveTarget,
        });
        return;
      }

      // 4. Battle resolution (AttackProcess.DetermineAttackOutcome, cs:407-468).
      if (!this.defenderStillValid(effectiveTarget, defender)) {
        // Comprehensive Rules §11-2-6: even though the attack target Digimon was removed
        // mid-resolution (e.g. deleted/bounced during When Attacking or the block window),
        // that Digimon REMAINS the attack target — the attack simply fails. It must NOT fall
        // back to a player-directed security check just because `defender` is undefined.
      } else if (defender === undefined) {
        // Player-directed, unblocked: hand off to security-and-win-check.
        await this.hooks.checkSecurity(this.access.opponentOf(attackerSeat), attacker.permanentId, "attack");
      } else if (
        this.access.isBattleAreaDigimon(defender, this.hooks.continuous) &&
        this.access.isBattleAreaDigimon(attacker, this.hooks.continuous)
      ) {
        await this.resolveDigimonBattle(attacker, defender);
      }

      // 5. End of attack (AttackProcess.EndAttack, cs:473-484).
      await this.hooks.fireTiming(EffectTiming.OnEndAttack, {
        ...attackTrigger,
        target: effectiveTarget,
      });
    } finally {
      this.cleanup();
      const completedCombat = this.takeCompletedCombat();
      if (completedCombat !== undefined) this.hooks.emit({ kind: "combatResolved", ...completedCombat });
    }
  }

  /**
   * Resolve an open block window. Called by the GameEngine when a declareBlock or
   * declineBlock intent arrives from the defending seat (`blockerPermanentId`
   * undefined => decline). Returns whether the response was accepted (a window was
   * open for this seat and the choice was legal); the engine maps a false return to
   * a rejected intent.
   */
  resolveBlock(seat: Seat, blockerPermanentId: string | undefined): boolean {
    const window = this.openWindow;
    if (window === undefined || window.defendingSeat !== seat) {
      return false;
    }
    if (blockerPermanentId !== undefined && !window.eligibleBlockerIds.has(blockerPermanentId)) {
      return false;
    }
    // ＜Collision＞ (§16-30): while the attacker has this effect, the defending player
    // "is forced to block whenever possible" — a decline is only legal when no
    // eligible blocker exists (runBlockWindow already resolves the window immediately
    // in that case, so this only rejects a decline offered against a real choice).
    if (blockerPermanentId === undefined && window.eligibleBlockerIds.size > 0) {
      const attacker = this.access.permanentById(window.attackerPermanentId);
      if (attacker !== undefined && hasCollision(attacker, this.hooks.continuous)) {
        return false;
      }
    }
    this.openWindow = undefined;
    if (blockerPermanentId === undefined) {
      this.hooks.emit({ kind: "blockDeclined", attackerPermanentId: window.attackerPermanentId });
    }
    window.resolve(blockerPermanentId ?? null);
    return true;
  }

  /**
   * Resolve an open ＜Alliance＞ decision. `allyPermanentId` is the
   * chosen ally, or undefined to pass.
   */
  resolveAlliance(seat: Seat, allyPermanentId: string | undefined): boolean {
    const decision = this.allianceDecision;
    if (decision === undefined || decision.seat !== seat) return false;
    if (allyPermanentId !== undefined && !decision.eligibleAllyIds.has(allyPermanentId)) return false;
    this.allianceDecision = undefined;
    this.hooks.emit({ kind: "allianceResolved", permanentId: decision.permanentId });
    decision.resolve(allyPermanentId ?? null);
    return true;
  }

  /**
   * Resolve an open ＜Evade＞ decision. `accept: true` suspends the permanent to
   * prevent deletion; `false` lets it be deleted.
   */
  resolveEvade(seat: Seat, permanentId: string, accept: boolean): boolean {
    const decision = this.evadeDecision;
    if (decision === undefined || decision.seat !== seat || decision.permanentId !== permanentId) return false;
    this.evadeDecision = undefined;
    this.hooks.emit({ kind: "evadeResolved", permanentId, accepted: accept });
    decision.resolve(accept);
    return true;
  }

  /**
   * Resolve an open ＜Barrier＞ decision. `accept: true` trashes top security to
   * prevent deletion; `false` lets it be deleted.
   */
  resolveBarrier(seat: Seat, permanentId: string, accept: boolean): boolean {
    const decision = this.barrierDecision;
    if (decision === undefined || decision.seat !== seat || decision.permanentId !== permanentId) return false;
    this.barrierDecision = undefined;
    this.hooks.emit({ kind: "barrierResolved", permanentId, accepted: accept });
    decision.resolve(accept);
    return true;
  }

  /**
   * Pass the open §11-3 Counter Timing window without activating a [Counter]
   * effect. Called by the `respondCounter` intent handler when the response has
   * no chosen source.
   */
  resolveCounterPass(seat: Seat): boolean {
    const window = this.counterWindow;
    if (window === undefined || window.defendingSeat !== seat) return false;
    this.counterWindow = undefined;
    this.hooks.emit({ kind: "counterResolved", attackerPermanentId: window.attackerPermanentId, activated: false });
    window.resolve();
    return true;
  }

  /**
   * Close the open §11-3 Counter Timing window AFTER the intent handler has
   * already run the chosen [Counter] effect's body, registering the §11-3-2 cap
   * (1 activated [Counter] effect per attack). The window doesn't reopen for a
   * second choice — the cap is spent.
   */
  resolveCounterActivated(seat: Seat): boolean {
    const window = this.counterWindow;
    if (window === undefined || window.defendingSeat !== seat) return false;
    this.counterWindow = undefined;
    this.counterActivationsThisAttack += 1;
    this.hooks.emit({ kind: "counterResolved", attackerPermanentId: window.attackerPermanentId, activated: true });
    window.resolve();
    return true;
  }

  // --- internals -----------------------------------------------------------

  private currentDefender(target: AttackTarget): Permanent | undefined {
    if (target.kind === "player") {
      return undefined;
    }
    return this.access.permanentById(target.permanentId);
  }

  /**
   * source guards `AttackingPermanent.TopCard == null || !IsDigimon` at every
   * state transition (documented behavior 325, 386, 410): if the attacker has
   * left play or stopped being a Digimon mid-resolution, skip straight to end.
   */
  private attackerStillValid(attacker: Permanent): boolean {
    return this.access.isBattleAreaDigimon(attacker, this.hooks.continuous);
  }

  /**
   * Whether the attack's target is still resolvable at battle-resolution time. A
   * player target is always valid; a permanent target is valid only if that
   * permanent is still around. Mirrors {@link attackerStillValid} on the defender
   * side: Comprehensive Rules §11-2-6 — if the attack target Digimon is removed
   * during an attack (deleted/bounced by a When-Attacking effect or during the
   * block window), it REMAINS the attack target and the attack fails, rather than
   * being reinterpreted as a player-directed attack.
   */
  private defenderStillValid(target: AttackTarget, defender: Permanent | undefined): boolean {
    return target.kind === "player" || defender !== undefined;
  }

  /**
   * Open the block window and await the defending seat's response. When no
   * eligible blocker exists, resolve immediately with null (no round trip),
   * mirroring the source guard that only prompts when >= 1 blocker is available
   * (documented behavior). `blockWindowOpened` is a protocol promise that a real
   * response is pending, so an empty candidate set must not publish it.
   */
  private runBlockWindow(attackerSeat: Seat, attacker: Permanent): Promise<string | null> {
    const defendingSeat = this.access.opponentOf(attackerSeat);
    const blockers = eligibleBlockers(this.access, attacker, this.hooks.continuous);
    const eligibleBlockerIds = blockers.map((b) => b.permanentId);

    if (blockers.length === 0) {
      return Promise.resolve(null);
    }

    // ＜Collision＞ forces the block (§16-30), and `resolveBlock` rejects a decline while a
    // blocker is left. The window says so, so the defender is never offered that refusal.
    const mustBlock = hasCollision(attacker, this.hooks.continuous);
    this.hooks.emit({
      kind: "blockWindowOpened",
      attackerPermanentId: attacker.permanentId,
      eligibleBlockerIds,
      ...(mustBlock ? { mustBlock: true } : {}),
    });

    return new Promise<string | null>((resolve) => {
      this.openWindow = {
        attackerPermanentId: attacker.permanentId,
        defendingSeat,
        eligibleBlockerIds: new Set(eligibleBlockerIds),
        resolve,
      };
    });
  }

  /**
   * Open an ＜Alliance＞ decision window: ask `seat` to choose an
   * ally to suspend from `eligibleAllyIds`. Resolves immediately with null when
   * no eligible allies exist.
   */
  private runAllianceDecision(seat: Seat, permanentId: string, eligibleAllyIds: string[]): Promise<string | null> {
    if (eligibleAllyIds.length === 0) return Promise.resolve(null);

    this.hooks.emit({
      kind: "alliancePrompt",
      permanentId,
      eligibleAllyIds,
    });

    return new Promise<string | null>((resolve) => {
      this.allianceDecision = {
        permanentId,
        seat,
        eligibleAllyIds: new Set(eligibleAllyIds),
        resolve,
      };
    });
  }

  /**
   * Open an ＜Evade＞ decision for a single permanent: ask the controller whether
   * to suspend it to prevent deletion. Public so both the combat (battle-loss) path
   * and the effect-deletion path (effects/primitives.ts `deletePermanent`) share the
   * same prompt/decision-window machinery rather than each auto-applying the keyword.
   */
  runEvadeDecision(seat: Seat, permanentId: string): Promise<boolean> {
    this.hooks.emit({ kind: "evadePrompt", permanentId });
    return new Promise<boolean>((resolve) => {
      this.evadeDecision = { permanentId, seat, resolve };
    });
  }

  /**
   * Open a ＜Barrier＞ decision for a single permanent: ask the controller whether
   * to trash top security to prevent deletion. Public for the same reason as
   * {@link runEvadeDecision}.
   */
  runBarrierDecision(seat: Seat, permanentId: string): Promise<boolean> {
    this.hooks.emit({ kind: "barrierPrompt", permanentId });
    return new Promise<boolean>((resolve) => {
      this.barrierDecision = { permanentId, seat, resolve };
    });
  }

  /**
   * Open the §11-3 Counter Timing window and return a Promise for the caller to
   * await the defending seat's response — or `undefined` when
   * `hooks.counterEligible` reports nothing activatable, so the caller can skip
   * awaiting altogether (no round trip AND no extra microtask tick; see the call
   * site's comment). As with blocking, `counterWindowOpened` promises that a real
   * response is pending and is emitted only when at least one effect is eligible.
   */
  private runCounterWindow(attackerSeat: Seat, attacker: Permanent): Promise<void> | undefined {
    const defendingSeat = this.access.opponentOf(attackerSeat);
    const eligibleCounters = this.hooks.counterEligible?.(defendingSeat) ?? [];

    if (eligibleCounters.length === 0) {
      return undefined;
    }

    this.hooks.emit({
      kind: "counterWindowOpened",
      attackerPermanentId: attacker.permanentId,
      defendingSeat,
      eligibleCounters,
    });

    return new Promise<void>((resolve) => {
      this.counterWindow = { attackerPermanentId: attacker.permanentId, defendingSeat, resolve };
    });
  }

  /**
   * Suspend a permanent as part of combat and open the "when this Digimon suspends" window.
   *
   * Combat suspension bypasses the `fx.suspend` primitive (it must not be gated by a
   * "can't be suspended by effects" restriction — KB BT19-101 Q3185), which left the
   * `whenSuspended` bus silent for the most common way a Digimon suspends: attacking. A
   * generic "when any Digimon suspend" watcher must see it. KB BT17-089 puts the boundary
   * exactly here: "suspending from an attack declaration is due to the rules", so it is a
   * real suspension but NOT an effect-driven one — `whenEffectSuspends` stays unfired.
   *
   * ＜Alliance＞ and ＜Evade＞ suspend as a keyword-effect cost rather than by the rules. Alliance
   * explicitly carries its effect attribution through the dedicated call site, while Evade's
   * battle-only path remains a combat transition without an effect producer.
   */
  private suspendInCombat(permanent: Permanent): boolean {
    if (permanent.isSuspended) return false;
    this.access.suspend(permanent);
    return true;
  }

  /**
   * Open the `whenSuspended` window for a permanent {@link suspendInCombat} just suspended.
   *
   * Split from the suspension itself because awaiting a watcher yields control: firing
   * inline would let an armed effect run BETWEEN a keyword's cost and its benefit — ＜Alliance＞
   * suspends the ally and only then adds its DP, and those two are one atomic effect (§16-24).
   * Each call site fires once its own step is complete.
   */
  private async fireSuspended(permanent: Permanent, didSuspend: boolean): Promise<void> {
    if (!didSuspend) return;
    await this.hooks.fireTiming(EffectTiming.OnTappedAnyone, {
      subjectPermanentId: permanent.permanentId,
      suspendedPermanentId: permanent.permanentId,
    });
    await this.hooks.fireSubTrigger?.("whenSuspended", {
      subjectPermanentId: permanent.permanentId,
      suspendedPermanentId: permanent.permanentId,
    });
  }

  /**
   * Switch the attack onto the declared blocker: suspend the blocker, then fire
   * OnBlock and OnAttackTargetChanged (AttackProcess.SwitchDefender, cs:514-626).
   */
  private async switchDefenderToBlocker(attacker: Permanent, blocker: Permanent): Promise<void> {
    const blockerSuspended = this.suspendInCombat(blocker);
    this.hooks.emit({ kind: "blocked", blockerPermanentId: blocker.permanentId });
    await this.fireSuspended(blocker, blockerSuspended);

    const trigger: CombatTrigger = {
      attackerPermanentId: attacker.permanentId,
      defenderPermanentId: blocker.permanentId,
      blockerPermanentId: blocker.permanentId,
    };
    await this.hooks.fireTiming(EffectTiming.OnBlockAnyone, trigger);
    await this.hooks.fireTiming(EffectTiming.OnAttackTargetChanged, trigger);
    await this.hooks.fireSubTrigger?.("whenAttackTargetSwitched", {
      ...trigger,
      subjectPermanentId: attacker.permanentId,
    });
    // Kept alive as a genuine SubTrigger event (distinct from the OnBlockAnyone timing
    // above) to serve BT4-098's temporary grant shape ("[Your Turn] when this Digimon is
    // blocked, gain <effect> until end of turn") — a shape the timing dispatch alone can't
    // express since it needs to install a SubTrigger watcher, not react from a card module.
    await this.hooks.fireSubTrigger?.("whenBlocked", {
      attackerPermanentId: attacker.permanentId,
      defenderPermanentId: blocker.permanentId,
      blockerPermanentId: blocker.permanentId,
    });
    await this.hooks.fireSubTrigger?.("whenBlockerActivated", {
      attackerPermanentId: attacker.permanentId,
      defenderPermanentId: blocker.permanentId,
      blockerPermanentId: blocker.permanentId,
      subjectPermanentId: blocker.permanentId,
    });
  }

  /**
   * Attacker vs. defender Digimon: compare currentDP and delete the loser(s).
   * Source IBattle.CompareStats/Battle (documented behavior): winner > loser
   * deletes the loser; an equal-DP tie deletes both. The pure decision lives in
   * resolve.ts; here we apply it to authoritative state and narrate.
   */
  async resolveBattle(attacker: Permanent, defender: Permanent): Promise<void> {
    // An effect-created direct battle is not an attack. In particular, a Piercing
    // winner does not perform a security check here (EX11-074 Q5955-Q5959).
    await this.resolveDigimonBattle(attacker, defender, false);
  }

  private async resolveDigimonBattle(attacker: Permanent, defender: Permanent, allowPiercing = true): Promise<void> {
    const continuous = this.hooks.continuous;
    const outcome = resolvePermanentBattle({
      attackerPermanentId: attacker.permanentId,
      attackerDP: attacker.currentDP,
      defenderPermanentId: defender.permanentId,
      defenderDP: defender.currentDP,
      // ＜Iceclad＞ (§16-35): compare digivolution-card counts instead of DP.
      attackerHasIceclad: this.hasKeyword(attacker.permanentId, "IceClad"),
      defenderHasIceclad: this.hasKeyword(defender.permanentId, "IceClad"),
      attackerDigivolutionCount: attacker.stack.length,
      defenderDigivolutionCount: defender.stack.length,
      // A "can't be deleted in battle" grant (BT16-018/BT19-023/BT3-099-style
      // `beDeletedInBattle` restriction) spares the loser from actually being deleted.
      attackerSparedFromDeletion: continuous?.hasRestriction(attacker.permanentId, "beDeletedInBattle") ?? false,
      defenderSparedFromDeletion: continuous?.hasRestriction(defender.permanentId, "beDeletedInBattle") ?? false,
    });

    // Capture the winner now, but publish only after every "would be deleted/leave" replacement
    // has resolved (Q7022). The win is based on the comparison, not successful deletion (Q7023).
    const winningPermanentId =
      outcome.comparison === "attackerWins"
        ? attacker.permanentId
        : outcome.comparison === "defenderWins"
          ? defender.permanentId
          : undefined;
    const winningSeat =
      outcome.comparison === "attackerWins"
        ? attacker.controllerSeat
        : outcome.comparison === "defenderWins"
          ? defender.controllerSeat
          : undefined;
    const fireBattleWon = async (): Promise<void> => {
      if (winningPermanentId === undefined) return;
      await this.hooks.fireSubTrigger?.("whenBattleWon", {
        attackerPermanentId: attacker.permanentId,
        defenderPermanentId: defender.permanentId,
        subjectPermanentId: winningPermanentId,
      });
    };

    const finalDeletedIds = [...outcome.deletedPermanentIds];

    // ＜Evade＞ (§16-35): when this Digimon would be deleted by battle, you may
    // suspend it to prevent that deletion. Only usable when unsuspended (the
    // suspension IS the cost). Prompt the controller for each eligible permanent.
    const evadedIds = new Set<string>();
    const evadeSuspended: Permanent[] = [];
    for (const permanentId of finalDeletedIds) {
      if (!this.hasKeyword(permanentId, "Evade")) continue;
      const perm = this.access.permanentById(permanentId);
      if (perm === undefined || perm.isSuspended) continue;
      const accepted = await this.runEvadeDecision(perm.controllerSeat, permanentId);
      if (accepted) {
        // Cost then prevention, with no yield between them; watchers run once the whole
        // ＜Evade＞ resolution is settled.
        if (this.suspendInCombat(perm)) evadeSuspended.push(perm);
        evadedIds.add(permanentId);
      }
    }
    for (const perm of evadeSuspended) await this.fireSuspended(perm, true);
    const resolvedDeletedIds = finalDeletedIds.filter((id) => !evadedIds.has(id));

    // ＜Barrier＞ (§16-25): when this Digimon would be deleted in battle, by
    // trashing the top card of your security stack, prevent that deletion (once
    // per turn per permanent — that gate is deferred to the leave-prevention
    // system).
    const barrieredIds = new Set<string>();
    for (const permanentId of resolvedDeletedIds) {
      if (!this.hasKeyword(permanentId, "Barrier")) continue;
      const perm = this.access.permanentById(permanentId);
      if (perm === undefined) continue;
      if (this.access.securityCount(perm.controllerSeat) === 0) continue;
      const barrierKey = `${permanentId}/barrier`;
      if (this.hooks.barrierFired?.(barrierKey) === true) continue;
      const accepted = await this.runBarrierDecision(perm.controllerSeat, permanentId);
      if (accepted) {
        this.access.flipTopSecurityToTrash(perm.controllerSeat);
        this.hooks.markBarrierFired?.(barrierKey);
        barrieredIds.add(permanentId);
      }
    }
    const postBarrierDeletedIds = resolvedDeletedIds.filter((id) => !barrieredIds.has(id));

    // ＜Detach (trait)＞ (Q6964): immediately before this Digimon is deleted IN BATTLE,
    // its controller may trash 1 eligible link card to prevent only this deletion. The
    // link leaves now — before the opponent is deleted and before Piercing is read — so
    // linked effects from that card are no longer active when battle deletion settles.
    const detachedIds = new Set<string>();
    for (const permanentId of postBarrierDeletedIds) {
      const perm = this.access.permanentById(permanentId);
      if (perm === undefined) continue;
      const eligible = this.hooks.detachEligibleLinkedCards?.(permanentId) ?? [];
      if (eligible.length === 0) continue;
      const chosenInstanceId = await this.hooks.selectOptionalInstance?.(
        perm.controllerSeat,
        eligible.map((card) => card.instanceId),
        "＜Detach＞: trash 1 eligible link card to prevent this Digimon's battle deletion?",
      );
      if (chosenInstanceId === undefined) continue;
      if ((await this.hooks.detachLinkedCard?.(permanentId, chosenInstanceId)) === true) {
        detachedIds.add(permanentId);
      }
    }
    const postDetachDeletedIds = postBarrierDeletedIds.filter((id) => !detachedIds.has(id));

    // ＜Armor Purge＞ (§16-19): by trashing this Digimon's own top card (promoting the
    // digivolution card beneath it to the new top), prevent this Digimon's deletion. Requires
    // >= 1 digivolution card to promote.
    const armorPurgedIds = new Set<string>();
    for (const permanentId of postDetachDeletedIds) {
      if (!this.hasKeyword(permanentId, "Armor Purge")) continue;
      const perm = this.access.permanentById(permanentId);
      if (perm === undefined || perm.topCard === undefined || perm.stack.length === 0) continue;
      const chosenInstanceId = await this.hooks.selectOptionalInstance?.(
        perm.controllerSeat,
        [perm.topCard.instanceId],
        "＜Armor Purge＞: trash this Digimon's top card to prevent its deletion?",
      );
      if (chosenInstanceId === undefined) continue;
      await this.hooks.armorPurge?.(permanentId);
      armorPurgedIds.add(permanentId);
    }
    const postArmorPurgeDeletedIds = postDetachDeletedIds.filter((id) => !armorPurgedIds.has(id));

    // ＜Fragment (N)＞ (§16-37): by choosing and trashing N of ITS OWN digivolution cards,
    // prevent this Digimon's deletion. All-or-nothing: fewer than N chosen is a decline.
    const fragmentSavedIds = new Set<string>();
    for (const permanentId of postArmorPurgeDeletedIds) {
      if (!this.hasKeyword(permanentId, "Fragment")) continue;
      const perm = this.access.permanentById(permanentId);
      if (perm === undefined || perm.topCard === undefined) continue;
      const n = fragmentCountOf(perm.topCard.cardId);
      if (n === undefined || n === 0 || perm.stack.length < n) continue;
      const chosenIds = await this.hooks.selectOptionalInstances?.(
        perm.controllerSeat,
        perm.stack.map((card) => card.instanceId),
        n,
        `＜Fragment (${n})＞: trash ${n} of this Digimon's digivolution cards to prevent its deletion?`,
      );
      if (chosenIds === undefined || chosenIds.length < n) continue;
      await this.hooks.trashDigivolutionCards?.(permanentId, chosenIds);
      fragmentSavedIds.add(permanentId);
    }
    const postFragmentDeletedIds = postArmorPurgeDeletedIds.filter((id) => !fragmentSavedIds.has(id));

    // ＜Scapegoat＞ (§16-32): by deleting 1 of the controller's OTHER Digimon, prevent this
    // Digimon's deletion. A battle death is never "by one of your [own] effects" (§16-32-1),
    // so — unlike the effect-deletion path in primitives.ts — no cause check is needed here.
    const scapegoatSavedIds = new Set<string>();
    for (const permanentId of postFragmentDeletedIds) {
      if (!this.hasKeyword(permanentId, "Scapegoat")) continue;
      const perm = this.access.permanentById(permanentId);
      if (perm === undefined) continue;
      const candidates = this.access
        .battleAreaPermanents(perm.controllerSeat)
        .filter(
          (p) =>
            p.permanentId !== permanentId &&
            p.topCard !== undefined &&
            this.access.isBattleAreaDigimon(p, this.hooks.continuous),
        );
      if (candidates.length === 0) continue;
      const chosenInstanceId = await this.hooks.selectOptionalInstance?.(
        perm.controllerSeat,
        candidates.map((p) => p.topCard!.instanceId),
        "＜Scapegoat＞: delete 1 of your other Digimon to prevent this deletion?",
      );
      if (chosenInstanceId === undefined) continue;
      const sacrifice = candidates.find((p) => p.topCard?.instanceId === chosenInstanceId);
      if (sacrifice === undefined) continue;
      const sacrificeStackIds = sacrifice.stack.map((c) => c.instanceId);
      const sacrificeMoved = this.access.deletePermanent(sacrifice.permanentId);
      this.hooks.dropPermanentSubscriptions?.(sacrifice.permanentId);
      if (sacrificeMoved.length > 0) {
        await this.hooks.fireTiming(EffectTiming.OnDestroyedAnyone, {
          deletedPermanentId: sacrifice.permanentId,
          deletedPermanentIds: [sacrifice.permanentId],
          deletedControllerSeat: sacrifice.controllerSeat,
          deletedPermanentSnapshots: sacrifice.topCard
            ? [
                {
                  permanentId: sacrifice.permanentId,
                  controllerSeat: sacrifice.controllerSeat,
                  topCardId: sacrifice.topCard.cardId,
                },
              ]
            : [],
          deletedInstanceIds: sacrificeMoved,
          deletedWasStackInstanceIds: sacrificeStackIds,
        });
      }
      scapegoatSavedIds.add(permanentId);
    }
    const postScapegoatDeletedIds = postFragmentDeletedIds.filter((id) => !scapegoatSavedIds.has(id));

    const cardPreventedIds = (await this.hooks.consultLeavePrevention?.(postScapegoatDeletedIds)) ?? new Set<string>();
    const postCardPreventionDeletedIds = postScapegoatDeletedIds.filter((id) => !cardPreventedIds.has(id));

    const resolveBattleWon =
      winningPermanentId === undefined
        ? fireBattleWon
        : (this.hooks.prepareFrozenSubTrigger?.("whenBattleWon", {
            attackerPermanentId: attacker.permanentId,
            defenderPermanentId: defender.permanentId,
            subjectPermanentId: winningPermanentId,
          }) ?? fireBattleWon);
    const deletionReactions: (() => Promise<void>)[] = [];
    const prepareDeletionReaction = (event: SubTriggerEventName, payload: TriggerInfo): void => {
      deletionReactions.push(
        this.hooks.prepareFrozenSubTrigger?.(event, payload) ??
          (async () => {
            await this.hooks.fireSubTrigger?.(event, payload);
          }),
      );
    };

    // CR 16-13: all prevention settles before the holder can be deleted in battle.
    // Retaliation belongs to the subsequent On Deletion window, not this battle's
    // simultaneous deletion set. Its target is later deleted by an effect.
    const retaliationTargetsByInstanceId: Record<string, string> = {};
    for (const [holder, opponent] of [
      [attacker, defender],
      [defender, attacker],
    ] as const) {
      if (
        postCardPreventionDeletedIds.includes(holder.permanentId) &&
        !postCardPreventionDeletedIds.includes(opponent.permanentId) &&
        holder.topCard !== undefined &&
        this.hasKeyword(holder.permanentId, "Retaliation")
      ) {
        retaliationTargetsByInstanceId[holder.topCard.instanceId] = opponent.permanentId;
      }
    }

    // ＜Fortitude＞ (§16-27): a Digimon with digivolution cards AND this effect, when deleted,
    // is replayed for free (mandatory — no decision). Captured pre-deletion so "had
    // digivolution cards" reads the live stack.
    const fortitudeReplayInstanceIds = new Map<string, string>();
    for (const permanentId of postCardPreventionDeletedIds) {
      if (!this.hasKeyword(permanentId, "Fortitude")) continue;
      const perm = this.access.permanentById(permanentId);
      if (perm === undefined || perm.topCard === undefined || perm.stack.length === 0) continue;
      fortitudeReplayInstanceIds.set(permanentId, perm.topCard.instanceId);
    }

    // ＜Ascension＞ (§16-43): the controller may place the deleted card at the top of their
    // security stack instead of leaving it in trash (optional trigger-type reaction, no cost —
    // captured pre-deletion for the same reason as Fortitude).
    const ascensionCandidates = new Map<string, Seat>();
    for (const permanentId of postCardPreventionDeletedIds) {
      if (!this.hasKeyword(permanentId, "Ascension")) continue;
      const perm = this.access.permanentById(permanentId);
      if (perm === undefined || perm.topCard === undefined) continue;
      ascensionCandidates.set(perm.topCard.instanceId, perm.controllerSeat);
    }

    // Match deletion watchers while losers are live, but defer their bodies until
    // after removal and the Piercing snapshot. This preserves event-time traits and
    // source counts without allowing a reaction to change battle-trigger eligibility.
    const deletedPermanentSnapshots = postCardPreventionDeletedIds.flatMap((permanentId) => {
      const permanent = this.access.permanentById(permanentId);
      return permanent?.topCard === undefined
        ? []
        : [
            {
              permanentId,
              controllerSeat: permanent.controllerSeat,
              topCardId: permanent.topCard.cardId,
            },
          ];
    });
    for (const permanentId of postCardPreventionDeletedIds) {
      if (this.access.permanentById(permanentId)?.topCard === undefined) continue;
      prepareDeletionReaction("onDeletionOf", {
        deletedPermanentId: permanentId,
        deletedPermanentIds: postCardPreventionDeletedIds,
        deletedPermanentSnapshots,
        deletedControllerSeat: this.access.permanentById(permanentId)?.controllerSeat,
        deletedTopCardId: this.access.permanentById(permanentId)?.topCard?.cardId,
        deletedDigivolutionCardCount: this.access.permanentById(permanentId)?.stack.length,
        removalCause: "byBattle",
      });
      // whenLeavesPlay is the delete∪bounce superset; fire it here too so a watcher reacts to
      // a battle deletion, matching the effect-path primitive (otherwise a card works when
      // deleted by an effect but silently not when deleted in combat).
      prepareDeletionReaction("whenLeavesPlay", {
        deletedPermanentId: permanentId,
        deletedControllerSeat: this.access.permanentById(permanentId)?.controllerSeat,
        deletedTopCardId: this.access.permanentById(permanentId)?.topCard?.cardId,
        deletedDigivolutionCardCount: this.access.permanentById(permanentId)?.stack.length,
        removalCause: "byBattle",
      });
    }

    const attackerTopCardId = attacker.topCard?.cardId;
    const defenderTopCardId = defender.topCard?.cardId;
    const deleted: string[] = [];
    const deletedInstanceIds: string[] = [];
    const deletedWasStackInstanceIds: string[] = [];
    const deletedWasLinkedInstanceIds: string[] = [];
    const deletedLinkHostInstanceByLinkedInstanceId: Record<string, string> = {};
    const battleOpponentPermanentIdByInstanceId: Record<string, string> = {};
    const deletedEffectiveColorsByInstanceId: Record<string, CardColor[]> = {};
    const tokenDeletionCandidates = postCardPreventionDeletedIds.flatMap((permanentId) => {
      const top = this.access.permanentById(permanentId)?.topCard;
      return top !== undefined && getCardDefinition(top.cardId)?.isToken === true ? [top] : [];
    });
    for (const permanentId of postCardPreventionDeletedIds) {
      // ＜Material Save＞ (§16-21): a plain "when deleted" reaction (no cause restriction), so
      // it applies to a battle death exactly like an effect deletion. Must run BEFORE the
      // stack-id capture / movement below — it relocates the chosen cards out from under this
      // still-live permanent, so they are correctly excluded from what gets trashed. Gated on
      // the keyword HERE (a cheap synchronous check) rather than inside the hook so a battle
      // death with no Material Save holder — the overwhelming majority — never pays for the
      // extra microtask hop of an awaited hook call it doesn't need.
      if (this.hasKeyword(permanentId, "MaterialSave")) {
        await this.hooks.materialSave?.(permanentId);
      }
      const stackIds = this.access.permanentById(permanentId)?.stack.map((c) => c.instanceId) ?? [];
      const linkedIds = this.access.permanentById(permanentId)?.linked.map((c) => c.instanceId) ?? [];
      const hostInstanceId = this.access.permanentById(permanentId)?.topCard?.instanceId;
      const effectiveColors = this.hooks.effectiveColorsOf?.(permanentId) ?? [];
      const moved = this.access.deletePermanent(permanentId);
      const battleOpponentId = permanentId === attacker.permanentId ? defender.permanentId : attacker.permanentId;
      for (const instanceId of moved) battleOpponentPermanentIdByInstanceId[instanceId] = battleOpponentId;
      for (const instanceId of moved) deletedEffectiveColorsByInstanceId[instanceId] = effectiveColors;
      deletedInstanceIds.push(...moved);
      deletedWasStackInstanceIds.push(...stackIds);
      deletedWasLinkedInstanceIds.push(...linkedIds);
      if (hostInstanceId !== undefined) {
        for (const linkedInstanceId of linkedIds) {
          deletedLinkHostInstanceByLinkedInstanceId[linkedInstanceId] = hostInstanceId;
        }
      }
      // Drop the leaving permanent's modifier/continuous/subTrigger ledgers as it leaves the
      // field; combat deletes through raw state access and so routes its own teardown.
      this.hooks.dropPermanentSubscriptions?.(permanentId);
      deleted.push(permanentId);
    }

    // The deletion itself can grant conditional Piercing (EX8-023 Q3883). Read after
    // passive recomputation, but before any captured win/deletion reaction can grant
    // it too late or remove it through Fortitude (EX8-045 Q3931).
    await this.hooks.refreshContinuousEffects?.();
    const piercingTriggered = allowPiercing && this.hooks.hasPierce?.(attacker.permanentId) === true;
    if (winningSeat === attacker.controllerSeat) await resolveBattleWon();
    for (const resolveReaction of deletionReactions) await resolveReaction();

    // ＜Fortitude＞ replay: only for cards that actually left the field, each as its own fresh
    // permanent (top card only — the digivolution stack stays trashed as loose cards).
    for (const [permanentId, instanceId] of fortitudeReplayInstanceIds) {
      if (!deleted.includes(permanentId)) continue;
      await this.hooks.replayFromTrash?.(instanceId);
    }

    // ＜Ascension＞ reaction: only for cards that actually left the field (in deletedInstanceIds).
    for (const [instanceId, seat] of this.hooks.resolveDeletionReactions ? [] : ascensionCandidates) {
      if (!deletedInstanceIds.includes(instanceId)) continue;
      const chosenInstanceId = await this.hooks.selectOptionalInstance?.(
        seat,
        [instanceId],
        "＜Ascension＞: place this card at the top of your security stack?",
      );
      if (chosenInstanceId === undefined) continue;
      await this.hooks.ascendToSecurity?.(instanceId);
    }

    // Battle deletion (is-deleted): the losers have left the field, so fire OnDestroyedAnyone
    // over the deleted set, mirroring documented behavior stacking the window after the
    // battle outcome is fixed. A single fire lets resolveTiming batch a both-combatants tie and
    // order the triggers turn-player-first; the trashed cards become [On Deletion] candidates.
    if (deleted.length > 0) {
      const deletingPermanentId = deleted.includes(attacker.permanentId)
        ? deleted.includes(defender.permanentId)
          ? undefined
          : defender.permanentId
        : deleted.includes(defender.permanentId)
          ? attacker.permanentId
          : undefined;
      const deletionTrigger = {
        deletedPermanentId: deleted[0],
        deletedPermanentIds: deleted,
        deletedControllerSeat: deletedPermanentSnapshots.find(({ permanentId }) => permanentId === deleted[0])
          ?.controllerSeat,
        deletedPermanentSnapshots,
        deletedInstanceIds,
        deletedWasStackInstanceIds,
        deletedWasLinkedInstanceIds,
        deletedLinkHostInstanceByLinkedInstanceId,
        deletedEffectiveColorsByInstanceId,
        battleOpponentPermanentIdByInstanceId,
        retaliationTargetsByInstanceId,
        ...(deletingPermanentId === undefined ? {} : { deletingPermanentId }),
        removalCause: "byBattle" as const,
      };
      if (this.hooks.resolveDeletionReactions) {
        await this.hooks.resolveDeletionReactions(
          deletionTrigger,
          [...ascensionCandidates].flatMap(([instanceId, seat]) =>
            deletedInstanceIds.includes(instanceId) ? [{ instanceId, seat }] : [],
          ),
          tokenDeletionCandidates,
        );
      } else {
        await this.hooks.fireTiming(EffectTiming.OnDestroyedAnyone, deletionTrigger);
      }
    }
    if (winningSeat !== undefined && winningSeat !== attacker.controllerSeat) await resolveBattleWon();

    // SubTrigger bus (System B): "when this Digimon deletes [an opponent's Digimon] in
    // battle" watchers — DISTINCT from `onDeletionOf` (which fires for the DELETED card via
    // the deletePermanent seam). This fires for the battle WINNER that deleted an opponent:
    // the attacker, when the defender was deleted and the attacker survived (not a both-die
    // tie). The winner is the event subject (it is still on the field).
    const attackerSurvived = this.access.permanentById(attacker.permanentId) !== undefined;
    const defenderDeleted = deleted.includes(defender.permanentId);
    if (attackerSurvived && defenderDeleted) {
      // System A: fire the top-level WhenBattleDeleteOpponent timing for the surviving attacker.
      // The trigger carries both the attacker (who fires the effect) and the deleted defender.
      await this.hooks.fireTiming(EffectTiming.OnBattleDeleteOpponent, {
        attackerPermanentId: attacker.permanentId,
        deletedPermanentId: defender.permanentId,
        ...(defenderTopCardId !== undefined ? { deletedTopCardId: defenderTopCardId } : {}),
        deletedInstanceIds,
        deletedWasStackInstanceIds,
      });

      await this.hooks.fireSubTrigger?.("whenDeletesInBattle", {
        subjectPermanentId: attacker.permanentId,
        attackerPermanentId: attacker.permanentId,
        deletedPermanentId: defender.permanentId,
        deletedControllerSeat: defender.controllerSeat,
        ...(defenderTopCardId !== undefined ? { deletedTopCardId: defenderTopCardId } : {}),
        deletedInstanceIds,
        deletedWasStackInstanceIds,
      });

      // ＜Piercing＞ (consume seam): a piercing attacker that won a permanent battle and
      // deleted the defender performs the defending player's security check before
      // end-of-attack. Port of CardController.OnDetermineDoSecurityCheck (the mandatory
      // pre-end-of-attack check, Comprehensive Rules §16-7); reuses the validated
      // runSecurityCheck hand-off rather than building a new security path. The pierce
      // grant is server-only state (ModifierLedger.hasPierce), never client-supplied.
      if (piercingTriggered) {
        // "piercing": this attack was successful against a DIGIMON, so an empty security
        // stack must not end the game (Comprehensive Rules 11-5-1-2 / 16-7).
        await this.hooks.checkSecurity(
          this.access.opponentOf(attacker.controllerSeat),
          attacker.permanentId,
          "piercing",
        );
      }
    }

    // A defending Digimon can also be the surviving battle winner and delete the attacker.
    // Effects such as BT5-062 say "when this Digimon deletes an opponent's Digimon in battle"
    // without requiring it to be attacking, so publish the same winner reaction for the
    // defender. Piercing is intentionally not processed here because no defender attack exists.
    const defenderSurvived = this.access.permanentById(defender.permanentId) !== undefined;
    const attackerDeleted = deleted.includes(attacker.permanentId);
    if (defenderSurvived && attackerDeleted) {
      await this.hooks.fireTiming(EffectTiming.OnBattleDeleteOpponent, {
        attackerPermanentId: defender.permanentId,
        deletedPermanentId: attacker.permanentId,
        ...(attackerTopCardId !== undefined ? { deletedTopCardId: attackerTopCardId } : {}),
        deletedInstanceIds,
        deletedWasStackInstanceIds,
      });

      await this.hooks.fireSubTrigger?.("whenDeletesInBattle", {
        subjectPermanentId: defender.permanentId,
        attackerPermanentId: defender.permanentId,
        deletedPermanentId: attacker.permanentId,
        deletedControllerSeat: attacker.controllerSeat,
        ...(attackerTopCardId !== undefined ? { deletedTopCardId: attackerTopCardId } : {}),
        deletedInstanceIds,
        deletedWasStackInstanceIds,
      });
    }

    // Comprehensive Rules §14-2-5: "If an effect is triggered by the end of the battle
    // timing when a battle ends, that effect is to be resolved." This is a distinct window
    // from OnDestroyedAnyone (the battle's own destruction trigger, §14-2-4) and from
    // OnBattleDeleteOpponent (fired ONLY for a surviving attacker that deleted the
    // defender, above): the end-of-battle timing fires for every Digimon-vs-Digimon battle
    // regardless of outcome — win, loss, or tie — so a card's own "[end of battle]"-filed
    // clause (e.g. BT11-059's unsuspend-on-delete-in-battle) gets its real window even
    // though it also independently gates on having won.
    await this.hooks.fireTiming(EffectTiming.OnEndBattle, {
      attackerPermanentId: attacker.permanentId,
      defenderPermanentId: defender.permanentId,
      target: { kind: "permanent", permanentId: defender.permanentId },
      deletedPermanentId: deleted[0],
      deletedInstanceIds,
      deletedWasStackInstanceIds,
    });

    // Hold the completion payload until resolveAttack reaches its outer cleanup boundary.
    // Consumers use combatResolved as the end-of-attack seam, so publishing here would let
    // a second attack race the remaining OnEndAttack timing and controller cleanup.
    this.completedCombat = {
      seat: attacker.controllerSeat,
      attackerPermanentId: attacker.permanentId,
      deletedPermanentIds: deleted,
    };
  }

  /**
   * Reset the attack flags (AttackProcess.Cleanup, cs:486-512). Effects scoped to
   * "until end of attack" are expired by the effect-duration subsystem; this only
   * tears down the controller's own combat state.
   */
  private cleanup(): void {
    this.openWindow = undefined;
    this.allianceDecision = undefined;
    this.evadeDecision = undefined;
    this.barrierDecision = undefined;
    this.counterWindow = undefined;
    this.counterActivationsThisAttack = 0;
    this.resolving = false;
    this.currentAttack = undefined;
    this.endRequested = false;
    // Expire UntilEndAttack/UntilEndBattle modifiers and refresh the continuous tier.
    this.hooks.sweepEndOfAttack?.();
  }
}
