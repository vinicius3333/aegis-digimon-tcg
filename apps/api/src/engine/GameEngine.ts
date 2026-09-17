import { ContinuousEffectScope } from "./effects/ContinuousEffectScope.js";
import { isTimingActivationDisabled } from "./effects/timingActivation.js";
import type { Client } from "colyseus";
import {
  CardKind,
  EffectTiming,
  Zone,
  getCardDefinition,
  GameState,
  PlayerState,
  EffectDuration,
  Phase,
  Permanent,
  type CardColor,
  type CardInstance,
  type ServerEvent,
  type Seat,
} from "@aegis/shared";
import type { Intent, IntentResult } from "@aegis/shared";
import { MemoryGauge } from "./MemoryGauge.js";
import {
  buildStateView,
  exposeCardInZone,
  refreshStateView as refreshStateViewInto,
  syncPublicCounts,
} from "./state/visibility.js";
import { installVisibilityPort, type VisibilityZone, type VisibilityPort } from "./state/access.js";
import { GameStateAccess, insertCard, markRoutedUsedOption, takeTop } from "./state/access.js";
import { CombatController } from "./combat/controller.js";
import { detachLeaveReplacements, detachTraitTokens } from "./effects/detach.js";
import { guardLeaveReplacements } from "./effects/guard.js";
import { canAttackerDeclare } from "./combat/legality.js";
import { printedKeywordsOf, resolveKeywords } from "./combat/keywords.js";
import { WinCheck } from "./security/index.js";
import { SecurityDpLedger } from "./security/securityDp.js";
import { DeletionMaxDpLedger } from "./deletionMaxDp.js";
import { DpDeleteBudgetLedger } from "./dpDeleteBudget.js";
import { lookupDefinition, definitionOf, colorsOf, isDigimon } from "./cards/cardData.js";
import { DecisionManager } from "./decisions/index.js";
import { createDecisionApi } from "./decisions/decisionApi.js";
import { createResolverDecisions, type ResolverDecisions } from "./decisions/resolverDecisions.js";
import { MainPhaseController } from "./MainPhaseController.js";
import { BreedingPhaseController } from "./BreedingPhaseController.js";
import { createPrimitives, ModifierLedger } from "./effects/primitives.js";
import {
  ContinuousEffectLedger,
  effectiveColors,
  effectiveKinds,
  effectiveNames,
  effectiveTraits,
} from "./effects/continuous.js";
import { linkMax } from "./effects/mindLink.js";
import { SubTriggerRegistry, type SubTriggerSubscription } from "./effects/subtriggers.js";
import { consultLeavePrevention } from "./effects/leavePrevention.js";
import { consultDigivolutionTrashRedirect } from "./effects/digivolutionTrashRedirect.js";
import {
  createGameAccess,
  createCardStateLookup,
  createEffectContext,
  gatherTriggeredEffects,
} from "./effects/context.js";
import { createCardSource, type CardStateLookup } from "./cards/CardSource.js";
import { UseTracker, canActivate, canTrigger } from "./effects/kernel.js";
import { buildResolutionEnv, permanentIdentityOf, type EffectEnvironment } from "./effects/index.js";
import { collectConferredEffects, collectGrantedCustomEffects, effectsOf } from "./effects/collect.js";
import { grantedTokenEffectsForTiming, resolveSelfWhenTrashedFromDeck } from "./effects/interpreter.js";
import type { CardSource } from "./effects/CardSource.js";
import type { Effect } from "./effects/Effect.js";
import type { CollectedEffect } from "./effects/collect.js";
import type {
  EffectContext,
  GameAccess,
  Primitives,
  DecisionApi,
  TriggerInfo,
  RemovalCause,
  SubTriggerEventName,
  SubTriggerSourceScope,
} from "./effects/EffectContext.js";
import { TurnStateMachine, type DurationBoundary as TurnBoundary } from "./TurnStateMachine.js";
import { logError } from "../logger.js";
import { runSetup, finalizeSecurity, mulliganRedraw, type Rng, type Decklist } from "./setup.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { validateDecklist } from "./deckValidation.js";
import { MulliganCoordinator } from "./mulligan.js";
import { canHatch, canMove } from "./actions/breeding.js";
import { mergeRuleDeletions, type PooledRuleDeletion } from "./gameEngine/ruleDeletions.js";
import { DigivolveSupport } from "./gameEngine/digivolveSupport.js";
import { BoardProjection } from "./gameEngine/projections.js";
import { RuleChecks } from "./gameEngine/ruleChecks.js";
import { sameNumericMap } from "./gameEngine/schemaSync.js";
import { securityStrikeCount } from "./gameEngine/securityStrike.js";
import { subTriggerIdentity, type ArmedSubTrigger } from "./gameEngine/subTriggerIdentity.js";
import type { GameEngineHooks, SeatJoinOptions } from "./gameEngine/types.js";
import { engineRunSecurityCheck, payBarrierSecurityCost } from "./gameEngine/securityCheck.js";
import {
  attackDeps,
  buildTurnFlowHooks,
  digivolveDeps,
  linkCardDeps,
  playCardDeps,
  resolutionDeps,
} from "./gameEngine/actionDeps.js";
import {
  applyIntent,
  counterEligibleSources,
  findInstance,
  findLooseInstance,
  isNewlyPlayedRushAttacker,
  validateAppFusion,
} from "./gameEngine/intents.js";
import {
  combatTriggerInfo,
  drainPendingAttackTriggers,
  fireBeforePayCost,
  fireEnteredByEffectTiming,
  fireTiming,
  fireTimingForInstance,
  fireTimingForPermanent,
  prepareDigiXrosPlay,
  prepareDigiXrosPlays,
  projectLooseUseCost,
  reactivateOnPlay,
  resolveDeletionReactions,
  runTimingWindow,
} from "./gameEngine/timing.js";
import {
  fireSubTrigger,
  fireSubTriggerSnapshot,
  prepareFrozenSubTrigger,
  prepareSubTrigger,
  runSubTriggersInChosenOrder,
  withPendingSubTriggers,
} from "./gameEngine/subTriggers.js";

export { mergeRuleDeletions, securityStrikeCount };
export type { GameEngineHooks, SeatJoinOptions };

/**
 * The brain of a single match. The ONLY object permitted to mutate GameState
 * (ARCHITECTURE.md section 3). It validates every intent, applies costs, mutates
 * the synchronized schema, runs the effect stack, and emits the event log.
 *
 * This is a scaffold: the public surface the room depends on is defined and the
 * boot path compiles/runs, but the rules engine itself is intentionally stubbed.
 * Each subsystem below maps to an entry in historical migration ledger
 *
 * Members without a `private` marker are the engine's INTERNAL seam, not its public API:
 * the `gameEngine/` modules hold method bodies that were cut out of this class and take
 * the engine as their first parameter, so the members those bodies read cannot stay
 * `private`. The room and the tests use only the documented public surface
 * (`seatPlayer`, `startMatch`, `applyIntent`, the view and connection methods); reach for
 * anything else from outside `engine/` and you are reaching into the engine's own wiring.
 */

export class GameEngine {
  readonly memory: MemoryGauge;
  private readonly turnMachine: TurnStateMachine;
  readonly access: GameStateAccess;
  readonly win: WinCheck;
  readonly combat: CombatController;
  /** Decision request/response correlation (subsystem: intent-protocol-and-room). */
  readonly decisions: DecisionManager;
  /** The interactive Main-phase verb loop the turn machine awaits. */
  readonly mainPhase: MainPhaseController;
  /** The interactive Breeding-phase window the turn machine awaits. */
  readonly breeding: BreedingPhaseController;
  /** Per-turn use ledger for maxPerTurn accounting (shared with the effect stack). */
  readonly tracker: UseTracker;
  /** Duration-scoped modifier store backing the effect primitives. */
  readonly modifiers: ModifierLedger;
  /**
   * Continuous-rule store (can't-X restrictions, name/trait aliases, keyword grants,
   * color waivers) the effect primitives write and combat/turn/cost reads. Shared
   * (not the per-primitives private fallback) so what a static effect records is what
   * the rest of the engine consults.
   */
  readonly continuous: ContinuousEffectLedger;
  /** Delayed / triggered sub-effect + replacement registry, shared with the primitives. */
  readonly subTriggers: SubTriggerRegistry;

  /**
   * Monotonic source for `windowToken` identities (KB Q2814 / BT2-053), bumped once per
   * OUTERMOST resolving-effect window opened by {@link fireTiming} / {@link
   * fireTimingForInstance} (see `beginResolvingWindow`/`endResolvingWindow`).
   */
  private windowTokenSeq = 0;
  /**
   * The `windowToken` for the resolving-effect window currently in progress, or
   * `undefined` when no `fireTiming`/`fireTimingForInstance` call is on the stack.
   * `beginResolvingWindow` mints a fresh value only for the OUTERMOST call and leaves it
   * untouched for any NESTED call (e.g. a played token's own On Play firing while the
   * playing effect's resolve is still on the stack) — so every SubTrigger fire that
   * happens while resolving ONE top-level effect (however many nested timings it
   * triggers) shares the same token, while two genuinely separate top-level
   * resolutions get distinct tokens. Read by {@link fireSubTrigger}.
   */
  activeWindowToken: number | undefined = undefined;
  /** Async Main verbs accepted by the server but not yet fully resolved. */
  mainVerbContinuationsInFlight = 0;
  counterResolutionInFlight = false;
  /** Nesting guard that defers state-based actions until a used Option finishes routing. */
  optionResolutionDepth = 0;
  /** Nesting guard that keeps rule checks outside an effect body's atomic resolution. */
  effectResolutionDepth = 0;
  /**
   * Main is open but its start-of-main timing has not finished yet. The input controller
   * deliberately opens before that asynchronous work completes, so this marks the interval
   * in which the phase LOOKS ready but the turn has not actually been handed to the player.
   */
  mainEntryPending = false;
  /** A voluntary pass submitted during {@link mainEntryPending}, replayed once entry finalizes. */
  deferredEndPhaseSeat: Seat | undefined;
  /**
   * Tail of the serialized Main-verb chain: each accepted verb starts only once the
   * previous one has fully settled, so two effect resolutions are never in flight at
   * once (see {@link continueMainVerb}).
   */
  mainVerbChain: Promise<void> = Promise.resolve();
  /**
   * Watchers already resolved by the timing window that shares their event (see
   * {@link withPendingSubTriggers}), keyed by {@link subTriggerIdentity} rather than by
   * subscription id: a continuous recompute tears down and RE-INSTALLS every continuous watcher
   * under a fresh id, so an id-keyed ledger would stop recognizing the watcher it just resolved
   * and the trailing bus fire would run it a second time. Populated only inside such a window and
   * cleared when the outermost one closes.
   */
  readonly consumedSubTriggerKeys = new Set<string>();
  /**
   * How many resolution loops that DRAIN the pending pool ({@link pendingWindowCollected}) are on
   * the stack. Parking a watcher only makes sense while one of them is running: with no draining
   * loop above it, a parked watcher would never be resolved at all.
   */
  pendingPoolDrainDepth = 0;
  /** Nesting depth of {@link withPendingSubTriggers} windows. */
  subTriggerWindowDepth = 0;
  /** Watchers armed for the event of the enclosing window, offered to that window's resolver. */
  pendingWindowSubTriggers: ArmedSubTrigger[] = [];
  /**
   * Watchers parked next to {@link pendingNestedTimingEffects} by
   * {@link parkArmedForEnclosingWindow}. Kept in a field of its own rather than in
   * {@link pendingWindowSubTriggers}: that list is SWAPPED per window, so a nested window would
   * drop entries pushed into the copy it discards on exit, while the parked half of an event
   * must survive exactly as long as the printed half it is simultaneous with.
   */
  parkedEntrySubTriggers: ArmedSubTrigger[] = [];
  /** Printed timing effects triggered inside the currently resolving effect body. */
  pendingNestedTimingEffects: CollectedEffect[] = [];
  /**
   * What each parked nested trigger's source card WAS when the trigger was collected (see
   * `permanentIdentityOf`), or `null` when it was not on a permanent at all. CR §15-4-4-3/-5
   * retire a pending trigger whose source left its area before activation; the resolver already
   * enforces that inside the window it is draining, but a trigger parked BETWEEN windows is
   * replayed from a captured list, so the residency check has to happen again at flush time.
   */
  readonly nestedTriggerSourceIdentity = new WeakMap<CollectedEffect, string | null>();
  /**
   * True while a play's pay-time window is running its reducers' costs. A Digimon deleted to
   * pay a "when this card would be played, by deleting 1 of your Digimon, reduce the cost"
   * clause is deleted as part of the play, so its [On Deletion] triggers SIMULTANEOUSLY with
   * the played card's [On Play] (KB Q5131) and the turn player orders the two. Without this
   * flag the deletion opens its own window during cost payment and resolves before the play
   * even happens, so no ordering choice is ever offered.
   */
  payingPlayCost = false;
  /**
   * [On Deletion] effects collected from a play-cost deletion, waiting for that play's entry
   * window so the turn player orders them against the played card's [On Play] (Q5131). Kept
   * apart from {@link pendingNestedTimingEffects}, which any outermost window may drain.
   */
  pendingPlayCostDeletionEffects: CollectedEffect[] = [];

  /** Security-removal reactions wait until the currently resolving effect finishes. */
  readonly deferredSecurityRemovalTriggers: Array<{
    payload: TriggerInfo;
    subscriptions: SubTriggerSubscription[];
    /**
     * Contexts bound when the removal HAPPENED, not when the reaction runs. The trigger has
     * already activated by then (KB Q2611/Q2629), so a watcher whose anchor dies in the battle
     * that follows the removal — an inherited ＜Draw 1＞ on the attacker's Digi-Egg, BT14-001 —
     * still resolves instead of being dropped for a missing anchor at flush time.
     */
    contexts: Map<number, EffectContext>;
  }> = [];
  flushingDeferredSecurityRemovalTriggers = false;
  /** Trigger windows created inside a resolving effect and activated only after that effect ends. */
  readonly deferredTimingWindows: Array<{
    timing: EffectTiming;
    trigger: TriggerInfo;
    transientCandidates: readonly CardInstance[];
    ascensionCandidates?: readonly { instanceId: string; seat: Seat }[];
  }> = [];
  flushingDeferredTimingWindows = false;

  /**
   * Open (or transparently join) a "resolving-effect window" identifying ONE top-level
   * effect resolution for `activeWindowToken` (subsystem: delayed-and-rule-effects, KB
   * Q2814 / BT2-053). Only the OUTERMOST caller mints a fresh token — a call nested
   * inside an already-open window (e.g. `fireTimingForInstance` firing a played
   * permanent's own On Play from within another effect's still-resolving body)
   * transparently reuses the ambient token instead of opening a new one. This is what
   * lets a single effect that plays two same-named Digimon in one go (e.g. Keramon
   * playing 2 Diaboromon Tokens) dedupe an `oncePerTiming` watcher's fire across both
   * plays, while two SEPARATE top-level plays/effects still get distinct tokens and each
   * fires the watcher. Deliberately plain synchronous bookkeeping (not an async wrapper
   * around the caller's body) so it adds no extra microtask tick to the existing
   * `fireTiming`/`fireTimingForInstance` await chains — callers must pair this with
   * {@link endResolvingWindow} in a `finally`.
   *
   * @returns Whether THIS call minted the token (pass to `endResolvingWindow`).
   */
  beginResolvingWindow(): boolean {
    const isOutermost = this.activeWindowToken === undefined;
    if (isOutermost) this.activeWindowToken = ++this.windowTokenSeq;
    return isOutermost;
  }

  /**
   * Run one resolution loop, marking that a pool-draining loop is on the stack while it does
   * (see {@link pendingPoolDrainDepth}).
   */
  async withPendingPoolDrain(draining: boolean, body: () => Promise<void>): Promise<void> {
    if (!draining) return body();
    this.pendingPoolDrainDepth += 1;
    try {
      await body();
    } finally {
      this.pendingPoolDrainDepth -= 1;
    }
  }

  /** Close a window opened by `beginResolvingWindow`; a no-op for a non-outermost (nested) call. */
  endResolvingWindow(wasOutermost: boolean): void {
    if (!wasOutermost) return;
    this.pendingNestedTimingEffects = [];
    this.pendingWindowSubTriggers = [];
    this.parkedEntrySubTriggers = [];
    // Claims outlive an inner window when parked watchers are still queued (see
    // `parkArmedForEnclosingWindow`); the queue itself ends here, so the claims do too — but only
    // once no timing window is still folding watchers, since such a window's trailing bus fire
    // relies on the claims its own resolver just recorded.
    if (this.subTriggerWindowDepth === 0) this.consumedSubTriggerKeys.clear();
    this.activeWindowToken = undefined;
  }

  async flushDeferredSecurityRemovalTriggers(): Promise<void> {
    if (this.flushingDeferredSecurityRemovalTriggers) return;
    this.flushingDeferredSecurityRemovalTriggers = true;
    try {
      while (this.deferredSecurityRemovalTriggers.length > 0) {
        const deferred = this.deferredSecurityRemovalTriggers.shift();
        if (deferred !== undefined) {
          await fireSubTriggerSnapshot(this, deferred.subscriptions, deferred.payload, deferred.contexts);
        }
      }
    } finally {
      this.flushingDeferredSecurityRemovalTriggers = false;
    }
  }

  /**
   * Everything that must happen between two effects of one resolution loop, after the rule
   * sweep: drain the windows a resolving effect deferred (an [On Deletion] caused mid-body) and
   * the deferred security-removal reactions. Both were parked precisely because an effect was
   * running; between effects none is, and their triggers must activate BEFORE the effects that
   * were already pending (CR §15-4-5-2/3, KB Q3430).
   */
  async settleBetweenEffects(): Promise<void> {
    await this.flushDeferredTimingWindows();
    await this.flushDeferredSecurityRemovalTriggers();
  }

  async flushDeferredTimingWindows(): Promise<void> {
    if (this.flushingDeferredTimingWindows) return;
    // Deferred windows belong between effect bodies. A nested entry seam can reach this
    // helper while its enclosing card body is still resolving; keep that queue parked until
    // the genuine between-effects boundary.
    if (this.effectResolutionDepth > 0) return;
    this.flushingDeferredTimingWindows = true;
    try {
      while (this.deferredTimingWindows.length > 0) {
        const deferred = this.deferredTimingWindows.shift();
        if (deferred !== undefined) {
          if (deferred.ascensionCandidates !== undefined) {
            await resolveDeletionReactions(
              this,
              deferred.trigger,
              deferred.ascensionCandidates,
              (trigger) => runTimingWindow(this, deferred.timing, trigger, deferred.transientCandidates),
              deferred.transientCandidates,
            );
          } else {
            await fireTiming(this, deferred.timing, deferred.trigger, deferred.transientCandidates);
          }
        }
      }
    } finally {
      this.flushingDeferredTimingWindows = false;
    }
  }

  shouldDeferNestedTiming(): boolean {
    return this.effectResolutionDepth > 0 && this.activeWindowToken !== undefined;
  }

  collectNestedTimingEffects(
    timing: EffectTiming,
    trigger: TriggerInfo,
    candidateInstances: readonly CardInstance[],
  ): CollectedEffect[] {
    const capturedTrigger = { ...trigger };
    return gatherTriggeredEffects(this.effectEnvironment(capturedTrigger), timing, candidateInstances).map(
      (collected) => ({ ...collected, timing, triggerInfo: capturedTrigger }),
    );
  }

  deferNestedTimingEffects(
    timing: EffectTiming,
    trigger: TriggerInfo,
    candidateInstances: readonly CardInstance[],
  ): void {
    const collected = this.collectNestedTimingEffects(timing, trigger, candidateInstances);
    for (const entry of collected) {
      this.nestedTriggerSourceIdentity.set(entry, permanentIdentityOf(entry.source) ?? null);
    }
    this.pendingNestedTimingEffects.push(...collected);
  }

  /**
   * Cards a cross-permanent play-cost reducer committed at BeforePayCost (BT10-093: purple Digimon
   * pulled from under the player's Tamers), keyed by the played card's instanceId. Applied — placed
   * under the new permanent — by the play action once that permanent exists, before On Play fires.
   */
  readonly pendingPlayReducerPlacements = new Map<string, string[]>();

  /**
   * Battle-area permanent ids a SELF `wouldBePlayed` reducer's cost body (BT12-112: "by placing 1 of
   * your [Shoutmon] as a digivolution card under this Digimon") selected at BeforePayCost, keyed by
   * the played card's instanceId — relocated UNDER the new permanent once it exists (same timing
   * constraint, and the same post-creation seam, as `pendingPlayReducerPlacements`; the two are
   * separate maps because this one relocates a whole PERMANENT via `relocatePermanent`, not loose
   * card instances via `placeUnder`).
   */
  readonly pendingSelfReducerRelocations = new Map<string, { permanentId: string; shedOwnCards?: boolean }[]>();

  /** The effect verbs (effect-primitives) bound to this match. */
  readonly primitives: Primitives;
  /** The §17-1-3 state-based-action sweeps (the fixpoint that drives them stays here). */
  private readonly ruleChecks: RuleChecks;
  /** The client-visible derivations of the board (keywords, affordances, targets). */
  readonly projection: BoardProjection;
  /** The digivolution paths that are not the digivolve verb itself. */
  readonly digivolveSupport: DigivolveSupport;
  /** The player-decision API (ctx.ask.*) backed by the DecisionManager. */
  readonly decisionApi: DecisionApi;
  /** The stack-resolver's controller prompts (chooseOrder / askOptional). */
  readonly resolverDecisions: ResolverDecisions;
  /** Lobby readiness per seat (analogue of RoomManager AllPlayerIsReady). */
  readonly readySeats = new Set<Seat>();
  /** Blitz opportunities answered during this turn, separate from attack eligibility. */
  readonly resolvedBlitzOpportunities = new Set<string>();
  /** Blitz attackers explicitly accepted by their controller and awaiting declaration. */
  readonly acceptedBlitzAttackers = new Set<string>();
  /** Publicly played Rush attackers whose play crossed memory and still have their one action window. */
  readonly crossedMemoryRushAttackers = new Set<string>();
  blitzDecisionInFlight = false;
  private matchSetupStarted = false;
  /** Guards {@link GameEngineHooks.onBothReady} against firing more than once. */
  bothReadyFired = false;
  /** The opening-hand mulligan window (subsystem: deck-and-setup). */
  readonly mulligan: MulliganCoordinator;
  /** Decklists staged at seatPlayer, consumed by startMatch (index === seat). */
  private readonly stagedDecks: (Decklist | undefined)[] = [undefined, undefined];
  /** Per-seat shuffle PRNG produced by setup (so a mulligan reshuffles deterministically). */
  private rngForSeat: ((seat: Seat) => Rng) | undefined;
  /** Monotonic source of permanentIds unique within the match. */
  private permanentSeq = 0;
  /** Shared completion barrier for the current continuous recompute batch. */
  private recomputeInFlight: Promise<void> | undefined;
  /** Coalesces external recompute requests that arrive while a pass is rebuilding the ledgers. */
  private recomputeQueued = false;

  /**
   * Cards linked since the last over-limit rule check (fed by the link verb through
   * `PrimitivesEngine.noteLinked`). Comprehensive Rules §4-9-5 trashes EXISTING link cards
   * "at the same time as the newly linked cards", so {@link chooseExcessLinkCards} keeps
   * these out of the candidate pool. Cleared after every completed rule-check fixpoint,
   * including quiet checks with no excess.
   */
  private readonly justLinked = new Set<string>();
  /** Last resolved continuous DP contribution, used only to preserve dependency inputs between passes. */
  private readonly continuousDpSeedState = new Map<string, number>();

  /**
   * Which tier the code running RIGHT HERE belongs to, carried down the async call chain
   * rather than held in a field.
   *
   * A shared field alone cannot answer the question once two flows interleave: a
   * recompute is a long `await` chain, and a timing window resolving concurrently with it
   * (a play whose trailing recompute is still in flight while the next window opens) would
   * read the recompute's flag and tag its own one-shot modifiers `continuous` — the next
   * recompute clears that tier and the "for the turn" DP grant vanishes the instant it
   * lands. A flag flipped around the window instead has the mirror failure: the recompute's
   * own statics would stop being tagged and accumulate forever. Only per-flow state
   * separates them, which is what this store is.
   *
   * `undefined` (no enclosing scope) means the code is NOT on a continuous chain, and is
   * read as such — see {@link inContinuousPass}.
   */
  private readonly continuousScope = new ContinuousEffectScope();

  /**
   * Run a TRIGGERED effect body outside the continuous tier.
   *
   * A triggered, duration-scoped effect is never a continuous one (Comprehensive Rules
   * §15-8-2: persistent effects are the ones "constantly activated without being
   * triggered"), so nothing it records may carry the `continuous` tag. This holds even
   * when the body was reached FROM a recompute — a watcher discovered while the engine was
   * re-deriving statics (BT8-081's inherited Digi-Burst reaction) — and when a recompute
   * starts elsewhere while the body is mid-await.
   */
  withTriggeredMutations<T>(body: () => Promise<T>): Promise<T> {
    return this.continuousScope.run(false, body);
  }

  /** Whether what is being recorded right here belongs to the continuous tier. */
  private inContinuousPass(): boolean {
    // No store means this code is not on a continuous-recompute chain, and it must NOT fall
    // back to a shared "a recompute is running somewhere" flag: a triggered body interleaving
    // with an in-flight recompute would tag its one-shot modifiers `continuous`, and the next
    // recompute would erase them (EX13-060's re-run [When Digivolving] -8000 vanished whenever
    // a Tamer play woke its watcher while the play's own recompute was still in flight).
    return this.continuousScope.getStore() ?? false;
  }
  /** Trigger payload for the timing window currently resolving. */
  /** Transient security-DP modifiers during an active security check. */
  readonly securityDp = new SecurityDpLedger((seat, delta) => {
    const player = this.state.players[seat];
    if (player) player.securityDpDelta = delta;
  });
  private battleScopeSequence = 0;
  /** Continuous DP-based-deletion maximum bonuses (rebuilt each continuous recompute). */
  private readonly deletionMaxDp = new DeletionMaxDpLedger();
  /** Continuous DP-based-deletion BUDGET bonuses (BT19-011's inherited modifier; rebuilt each continuous recompute). */
  private readonly dpDeleteBudget = new DpDeleteBudgetLedger();
  /** Monotonic source of instanceIds for token spawn. */
  private instanceSeq = 0;

  constructor(
    readonly state: GameState,
    readonly hooks: GameEngineHooks,
  ) {
    // Every zone move is narrated through `hooks.emit`: the one place that sees a card leave
    // the field. Wrapped before the collaborators below capture `this.hooks.emit` by value.
    this.hooks = {
      ...hooks,
      emit: (event) => {
        this.forgetUsesOfCardsLeavingField(event);
        // The same seam marks the movement that routes a used Option out of its no-area slot,
        // whichever area the Option's own effect sent it to.
        hooks.emit(markRoutedUsedOption(this.state, event));
      },
    };
    // TODO(effect-framework): import "../cards" is done at boot for side-effect
    //   registration; wire the registry into the resolution path here.
    this.continuous = new ContinuousEffectLedger(
      (permanentId) => {
        for (const player of this.state.players) {
          const permanent = player.battleArea.find((candidate) => candidate.permanentId === permanentId);
          if (permanent !== undefined) {
            const definition = lookupDefinition(permanent.topCard.cardId);
            if (definition !== undefined && isDigimon(definition)) return permanent.controllerSeat;
          }
        }
        return undefined;
      },
      (permanentId) => {
        for (const player of this.state.players) {
          const permanent = [...player.battleArea, ...(player.breeding === undefined ? [] : [player.breeding])].find(
            (candidate) => candidate.permanentId === permanentId,
          );
          if (permanent === undefined) continue;
          const keywords = new Set(printedKeywordsOf(lookupDefinition(permanent.topCard.cardId)?.effectText));
          for (const card of permanent.stack) {
            for (const keyword of printedKeywordsOf(lookupDefinition(card.cardId)?.inheritedEffectText)) {
              keywords.add(keyword);
            }
          }
          return [...keywords];
        }
        return [];
      },
      (permanentId) => {
        for (const player of this.state.players) {
          const permanent = player.battleArea.find((candidate) => candidate.permanentId === permanentId);
          if (permanent !== undefined) return permanent.controllerSeat;
        }
        return undefined;
      },
    );
    this.memory = new MemoryGauge(this.state, this.hooks.emit, (seat, opts) => {
      const kinds = opts.isTamerEffect ? [CardKind.Tamer] : [CardKind.Digimon];
      return this.continuous.canGainMemoryFromEffect(seat, {
        definition: { kinds },
      });
    });
    this.access = new GameStateAccess(this.state, this.memory, this.hooks.emit);
    this.win = new WinCheck(this.state, this.hooks.emit);
    this.tracker = new UseTracker();
    this.modifiers = new ModifierLedger();
    this.modifiers.bindContinuous(this.continuous);
    this.subTriggers = new SubTriggerRegistry();
    this.decisions = new DecisionManager(this.state, {
      requestDecision: (seat, req) => this.hooks.requestDecision(seat, req),
    });
    this.decisionApi = createDecisionApi(this.decisions);
    this.resolverDecisions = createResolverDecisions(this.decisions);
    this.mulligan = new MulliganCoordinator(this.state, {
      requestDecision: (seat, req) => this.hooks.requestDecision(seat, req),
    });
    this.primitives = this.buildPrimitives();
    this.digivolveSupport = new DigivolveSupport({
      state: this.state,
      access: this.access,
      continuous: this.continuous,
      tracker: this.tracker,
      decisions: this.decisions,
      decisionApi: this.decisionApi,
      primitives: this.primitives,
      declinedAttackArts: this.declinedAttackArts,
      cardSourceOf: (instance) => this.cardSourceOf(instance),
      buildEffectContext: (source, trigger) => this.buildEffectContext(source, trigger),
      effectiveColorsOf: (permanent) => this.effectiveColorsOf(permanent),
      collectRuleProcessMovements: () => this.collectRuleProcessMovements(),
      flushRuleTriggerPool: (pool) => this.flushRuleTriggerPool(pool),
      recomputeContinuousEffects: () => this.recomputeContinuousEffects(),
    });
    this.projection = new BoardProjection({
      state: this.state,
      access: this.access,
      continuous: this.continuous,
      modifiers: this.modifiers,
      memory: this.memory,
      tracker: this.tracker,
      continuousDpSeedState: this.continuousDpSeedState,
      acceptedBlitzAttackers: this.acceptedBlitzAttackers,
      effectEnvironment: (trigger) => this.effectEnvironment(trigger),
      buildEffectContext: (source, trigger) => this.buildEffectContext(source, trigger),
      isNewlyPlayedRushAttacker: (permanentId) => isNewlyPlayedRushAttacker(this, permanentId),
      listCandidateInstances: () => this.listCandidateInstances(),
      validateAppFusion: (seat, intent) => validateAppFusion(this, seat, intent),
      attackDeps: () => attackDeps(this),
      digivolveDeps: () => digivolveDeps(this),
      playCardDeps: () => playCardDeps(this),
      linkCardDeps: () => linkCardDeps(this),
    });
    this.ruleChecks = new RuleChecks({
      state: this.state,
      access: this.access,
      continuous: this.continuous,
      modifiers: this.modifiers,
      decisions: this.decisions,
      win: this.win,
      primitives: () => this.primitives,
      justLinked: this.justLinked,
      linkMaxOf: (permanent) => this.linkMaxOf(permanent),
      isRuleProcessing: () => this.ruleProcessing,
    });
    this.combat = new CombatController(this.access, {
      emit: this.hooks.emit,
      // Forward the FULL combat trigger so "when this blocks" / "when this deletes in
      // battle" watchers read the right ids (previously only deletedPermanentId survived).
      fireTiming: async (timing, trigger) => {
        // [When Attacking] must be scoped to the attacking permanent only — a global fire
        // would collect every permanent's [When Attacking] effect, including the opponent's,
        // on any attack. The `attackerPermanentId` is always present in a CombatTrigger.
        if (
          (timing === EffectTiming.OnUseAttack || timing === EffectTiming.OnBattleDeleteOpponent) &&
          trigger.attackerPermanentId !== undefined
        ) {
          const att = this.access.permanentById(trigger.attackerPermanentId);
          if (att !== undefined) {
            await fireTimingForPermanent(this, timing, att, combatTriggerInfo(this, trigger));
            return;
          }
        }
        await fireTiming(this, timing, {
          subjectPermanentId: trigger.subjectPermanentId,
          suspendedPermanentId: trigger.suspendedPermanentId,
          ...combatTriggerInfo(this, trigger),
        });
      },
      fireAttackTiming: async (trigger, allianceCount, opts = {}) => {
        const includeSubTriggers = opts.includeSubTriggers === true;
        const attacker =
          trigger.attackerPermanentId === undefined
            ? undefined
            : this.access.permanentById(trigger.attackerPermanentId);
        const top = attacker?.topCard;
        // A window opened INSIDE another effect's resolution is not the outermost one, so the
        // resolver drops `extraPending` (and `fireTimingForPermanent` may defer the window
        // wholesale). The synthetic Alliance effects would silently vanish with it, so decline
        // the combined window here and let the caller run the legacy inline Alliance loop.
        if (attacker === undefined || top === undefined || this.activeWindowToken !== undefined) {
          await fireTiming(this, EffectTiming.OnUseAttack, combatTriggerInfo(this, trigger));
          return { allianceResolvedInWindow: false, subTriggersResolvedInWindow: false };
        }
        // Each ＜Alliance＞ instance enters the attacker's [When Attacking] window as one more
        // simultaneous trigger, so the controller orders it against the printed effects instead
        // of always resolving it last (Q5257). Distinct effectKeys keep the two instances
        // independent in the resolver's `resolved` ledger; each is optional and may be declined
        // on its own. `resolveAllianceEffect` re-reads the board when it runs, so an instance
        // ordered after a derived On Play / DNA evolution sees the post-evolution allies.
        const allianceEffects: CollectedEffect[] = Array.from({ length: allianceCount }, (_, index) => ({
          source: this.cardSourceOf(top),
          timing: EffectTiming.OnUseAttack,
          effect: {
            effectKey: `${top.instanceId}/alliance/${index}`,
            description: "＜Alliance＞: Suspend another Digimon you control.",
            // Not `optional`: the ally prompt itself carries the decline (a null response),
            // exactly as the legacy path does. Marking it optional would insert a second,
            // separate "use this effect?" decision that ＜Alliance＞ does not have.
            optional: false,
            isInherited: false,
            isSecurity: false,
            isLinked: false,
            maxPerTurn: -1,
            canTrigger: () => true,
            // ＜Alliance＞ TRIGGERS with the attack whether or not an ally is available right
            // now (CR §15-4): it takes its place in the ordered set, and the controller may
            // put it after an effect that first creates the ally. `resolveAllianceEffect`
            // re-reads the board and does nothing when no ally is there at resolution time.
            canActivate: () => true,
            resolve: async () => this.combat.resolveAllianceEffect(attacker.permanentId),
          },
        }));
        const attackPayload = opts.subTriggerPayload ?? combatTriggerInfo(this, trigger);
        const attackEnvironment = buildResolutionEnv(this.effectEnvironment(attackPayload), resolutionDeps(this));
        const allyAttackEffects = attackEnvironment.collect(EffectTiming.OnAllyAttack);
        const pendingAttackEffects = [...allyAttackEffects, ...allianceEffects];
        const timingWindow = async () =>
          fireTimingForPermanent(this, EffectTiming.OnUseAttack, attacker, attackPayload, pendingAttackEffects);
        const subTriggerPayload = opts.subTriggerPayload ?? combatTriggerInfo(this, trigger);
        if (includeSubTriggers) {
          await withPendingSubTriggers(
            this,
            ["whenAttacking", "whenOpponentAttacks"],
            subTriggerPayload,
            timingWindow,
            {
              onlyInitiallyArmed: true,
              busTrigger: () => subTriggerPayload,
            },
          );
        } else {
          await timingWindow();
        }
        return { allianceResolvedInWindow: allianceCount > 0, subTriggersResolvedInWindow: includeSubTriggers };
      },
      fireSubTrigger: async (event, payload) => this.fireSubTrigger(event, payload),
      prepareSubTrigger: (event, payload) => prepareSubTrigger(this, event, payload),
      withPendingAttackSubTriggers: (payload, runWindows) =>
        withPendingSubTriggers(this, ["whenAttacking", "whenOpponentAttacks"], payload, runWindows, {
          onlyInitiallyArmed: true,
        }),
      prepareFrozenSubTrigger: (event, payload) => prepareFrozenSubTrigger(this, event, payload),
      refreshContinuousEffects: () => this.recomputeContinuousEffects(),
      resolveDeletionReactions: async (trigger, candidates, transientCandidates = []) =>
        resolveDeletionReactions(
          this,
          trigger,
          candidates,
          (deletionTrigger) => fireTiming(this, EffectTiming.OnDestroyedAnyone, deletionTrigger, transientCandidates),
          transientCandidates,
        ),
      effectiveColorsOf: (permanentId) => {
        const permanent = this.access.permanentById(permanentId);
        return permanent === undefined ? [] : this.effectiveColorsOf(permanent);
      },
      consultLeavePrevention: async (permanentIds, opts) =>
        this.consultLeavePrevention(permanentIds, "byBattle", undefined, opts),
      dropPermanentSubscriptions: (permanentId) => this.dropPermanentSubscriptions(permanentId),
      snapshotCustomEffectGrants: (departingInstanceIds) =>
        this.continuous.listCustomEffectGrants().map((grant) => {
          if (!departingInstanceIds.includes(grant.instanceId)) return grant;
          const activeAtDeletion = grant.isActive?.() ?? true;
          return { ...grant, isActive: () => activeAtDeletion };
        }),
      checkSecurity: async (defenderSeat, attackerPermanentId, reason) =>
        engineRunSecurityCheck(this, defenderSeat, attackerPermanentId, reason),
      // The pierce read seam: combat consults both the temporary modifier ledger and
      // the resolved printed/continuous keyword state. Printed ＜Piercing＞ lives in the
      // latter; only effect-granted, battle-scoped Piercing lives in the former.
      hasPierce: (permanentId) =>
        this.modifiers.hasPierce(permanentId) ||
        (() => {
          const permanent = this.access.permanentById(permanentId);
          return permanent !== undefined && resolveKeywords(permanent, this.continuous).includes("Piercing");
        })(),
      addDpModifier: (permanentId, delta) =>
        this.modifiers.addDpModifier(this.state, permanentId, delta, EffectDuration.UntilEndAttack),
      addSecurityAttack: (permanentId) =>
        this.continuous.addKeywordGrant(permanentId, "SecurityAttack", EffectDuration.UntilEndAttack, 1),
      barrierFired: (key) => this.tracker.count(key, "replacement") > 0,
      markBarrierFired: (key) => this.tracker.register(key, "replacement"),
      trashTopSecurityForBarrier: (seat) => payBarrierSecurityCost(this, seat),
      sweepEndOfAttack: () => this.sweepCombatDurations(),
      beginBattleScope: () => this.beginBattleScope(),
      sweepEndOfBattle: (scopeId) => this.sweepBattleDurations(scopeId),
      endBattleScope: (scopeId) => this.endBattleScope(scopeId),
      recomputeBattleEffects: () => this.recomputeContinuousEffects(),
      continuous: this.continuous,
      hasKeyword: (permanentId, keyword) => {
        const permanent = this.access.permanentById(permanentId);
        return permanent !== undefined && resolveKeywords(permanent, this.continuous).includes(keyword);
      },
      // Q5257: ＜Alliance＞ printed twice on the same Digimon (typically once on the top card
      // and once inherited from a digivolution source) is TWO independent keywords, each
      // suspending its own ally for its own DP/security benefit. A printed keyword reaches the
      // permanent as one continuous grant per granting effect, so the grants ARE the instances;
      // the fallback covers a permanent that has the keyword through some path that leaves no
      // countable grant, which is always a single instance.
      allianceCount: (permanentId) => {
        const permanent = this.access.permanentById(permanentId);
        if (permanent?.topCard === undefined) return 0;
        const granted = this.continuous
          .grantedKeywords(permanentId)
          .filter((grant) => grant.keyword === "Alliance").length;
        if (granted > 0) return granted;
        return resolveKeywords(permanent, this.continuous).includes("Alliance") ? 1 : 0;
      },
      combineAllianceTiming: (permanentId) => {
        const permanent = this.access.permanentById(permanentId);
        if (permanent?.topCard === undefined) return false;
        // An inherited [When Attacking] effect is as simultaneous with ＜Alliance＞ as a printed
        // one (Q5257), so the digivolution cards and link cards count too. Reading only the top
        // card left an attacker whose sole When Attacking effect is inherited on the legacy
        // path, where Alliance always resolved last and could never be ordered against it.
        return [permanent.topCard, ...permanent.stack, ...permanent.linked].some(
          (card) => effectsOf(EffectTiming.OnUseAttack, this.cardSourceOf(card)).length > 0,
        );
      },
      // Shared "pick one of these, or pass" decision channel for ＜Raid＞'s redirect choice and
      // ＜Scapegoat＞'s sacrifice choice (both battle-path consumers of combat/controller.ts) —
      // the same generic selectCards decision `ask.selectInstances` uses in primitives.ts, so no
      // bespoke per-keyword protocol intent is needed.
      selectOptionalInstance: async (seat, candidateInstanceIds, promptText) => {
        if (candidateInstanceIds.length === 0) return undefined;
        const response = await this.decisions.request({
          seat,
          kind: "selectCards",
          promptText,
          options: { candidateInstanceIds, min: 0, max: 1 },
        });
        return response.kind === "selectCards" ? response.instanceIds[0] : undefined;
      },
      // ＜Fragment＞'s "choose exactly N, or decline" cost decision (§16-37): the same
      // selectCards decision channel as selectOptionalInstance, but requiring the full count
      // (a partial pick reads as a decline — no partial trash).
      selectOptionalInstances: async (seat, candidateInstanceIds, count, promptText) => {
        if (candidateInstanceIds.length < count) return undefined;
        const response = await this.decisions.request({
          seat,
          kind: "selectCards",
          promptText,
          options: { candidateInstanceIds, min: 0, max: count },
        });
        if (response.kind !== "selectCards") return undefined;
        return response.instanceIds.length === count ? response.instanceIds : undefined;
      },
      armorPurge: async (permanentId) => {
        await this.primitives.armorPurge(permanentId);
      },
      trashDigivolutionCards: async (hostPermanentId, instanceIds) => {
        await this.primitives.trashDigivolutionCards(hostPermanentId, instanceIds);
      },
      ascendToSecurity: async (instanceId) => {
        await this.primitives.ascendToSecurity(instanceId);
      },
      materialSave: async (permanentId) => {
        await this.primitives.materialSave(permanentId);
      },
      // §11-3 Counter Timing: whether the defending seat has anything to activate,
      // so `runCounterWindow` can skip the round trip when nothing is eligible.
      counterEligible: (seat) => counterEligibleSources(this, seat),
    });
    this.mainPhase = new MainPhaseController(this.state, this.memory);
    this.breeding = new BreedingPhaseController(this.state);
    this.turnMachine = new TurnStateMachine(this.state, buildTurnFlowHooks(this), this.memory, this.hooks.emit);
  }

  /**
   * Build the concrete effect Primitives bound to this match (subsystem boundary:
   * effect-primitives owns the verbs, intent-protocol-and-room owns the decision
   * channel they call). The SelectionPort adapts the DecisionManager into the
   * seat-keyed form selection verbs use.
   */
  private buildPrimitives(): Primitives {
    // `combat` is assigned after the primitives are built (the controller is itself
    // wired with this engine's fireTiming seam), so expose it lazily via a getter; the
    // attack verbs only dereference it at call time, by which point it is set.
    const getCombat = () => this.combat;
    return createPrimitives({
      state: this.state,
      artsDigivolve: (seat, instance, definition, duringAttack) =>
        this.digivolveSupport.resolveArtsDigivolve(seat, instance, definition, duringAttack),
      beginEffectBody: () => {
        this.effectResolutionDepth += 1;
      },
      finishEffectBody: () => {
        this.effectResolutionDepth = Math.max(0, this.effectResolutionDepth - 1);
      },
      drainPendingAttackTriggers: () => drainPendingAttackTriggers(this),
      resolveAttackTimingWindow: async (drain) => {
        // An effect-directed attack pauses its enclosing effect bodies while the
        // attack's pending effects resolve. State-based rules run between those
        // effects, even though the enclosing card will resume after combat.
        const pausedDepth = this.effectResolutionDepth;
        this.effectResolutionDepth = 0;
        try {
          await this.settleBetweenEffects();
          await drain();
        } finally {
          this.effectResolutionDepth = pausedDepth;
        }
      },
      baseGrantedDigivolve: (seat, base, evolving, sourceZone) =>
        this.digivolveSupport.matchBaseGrantedDigivolve(seat, base, evolving, sourceZone),
      emit: (event) => this.hooks.emit(event),
      inSecurityCheck: () => this.securityCheckDepth > 0,
      nextPermanentId: () => this.nextPermanentId(),
      nextInstanceId: () => this.nextInstanceId(),
      memory: this.memory,
      modifiers: this.modifiers,
      continuous: this.continuous,
      subTriggers: this.subTriggers,
      securityDp: this.securityDp,
      deletionMaxDp: this.deletionMaxDp,
      dpDeleteBudget: this.dpDeleteBudget,
      win: this.win,
      fireTiming: (timing, trigger) => fireTiming(this, timing, trigger),
      resolveDeletionReactions: (trigger, candidates, transientCandidates = []) =>
        resolveDeletionReactions(
          this,
          trigger,
          candidates,
          (deletionTrigger) => fireTiming(this, EffectTiming.OnDestroyedAnyone, deletionTrigger, transientCandidates),
          transientCandidates,
        ),
      fireSubTrigger: (event, payload, sourceScope) => this.fireSubTrigger(event, payload, sourceScope),
      trashTopSecurityForBarrier: (seat) => payBarrierSecurityCost(this, seat),
      recomputeContinuousEffects: () => this.recomputeContinuousEffects(),
      processRulesBeforeWhenDigivolving: async () => {
        await this.recomputeContinuousEffects();
        if (this.ruleProcessing || this.ruleTriggerPool !== undefined) {
          // A trash replacement is entered from the active rule pass. Run only the DP
          // movement processes: the outer pass owns the pooled reactions and its latch.
          await this.ruleChecks.trashNoDpPermanents();
          await this.ruleChecks.deleteZeroDpDigimon();
        } else {
          const pool = await this.collectRuleProcessMovements();
          if (!this.state.gameOver) await this.flushRuleTriggerPool(pool);
        }
      },
      finalizeEffectPlayCost: async (instanceId, baseCost, useAsOption, originZone, projectOnly) => {
        // A selected security card can still be face down in its origin zone.
        // Locate only this instance; do not expose hidden security to timing scans.
        const instance =
          originZone === "security"
            ? Array.from(this.state.players)
                .flatMap((player) => Array.from(player.security))
                .find((card) => card.instanceId === instanceId)
            : findLooseInstance(this, instanceId);
        return instance === undefined
          ? baseCost
          : fireBeforePayCost(this, instance, baseCost, useAsOption, originZone, projectOnly);
      },
      prepareDigiXrosPlay: (instanceId) => prepareDigiXrosPlay(this, instanceId),
      prepareDigiXrosPlays: (instanceIds) => prepareDigiXrosPlays(this, instanceIds),
      finalizeEffectDigivolveCost: async (target, evolvingInstanceId, into, baseCost) => {
        const deps = digivolveDeps(this);
        const adjusted = deps.adjustedDigivolveCost?.(this.state, target, baseCost, into, { consumeOnce: true });
        const passiveCost = adjusted ?? baseCost;
        const interactiveReduction =
          (await deps.activateInteractiveDigivolveReduction?.(
            this.state,
            target.controllerSeat,
            target,
            into,
            evolvingInstanceId,
          )) ?? 0;
        return Math.max(0, passiveCost - interactiveReduction);
      },
      effectiveLooseUseCost: (instanceId, controllerSeat) => projectLooseUseCost(this, instanceId, controllerSeat),
      fireWhenLinking: async (instanceIds, targetPermanentId) => {
        for (const instanceId of instanceIds) {
          await fireTimingForInstance(this, EffectTiming.OnLinking, instanceId, {
            subjectPermanentId: targetPermanentId,
            linkedInstanceIds: instanceIds,
          });
        }
      },
      resolveSelfWhenTrashedFromDeck: async (instanceId, byEffectCardId) => {
        const instance = findLooseInstance(this, instanceId);
        if (instance === undefined) return;
        await resolveSelfWhenTrashedFromDeck(
          this.buildEffectContext(this.cardSourceOf(instance), {
            trashedFromDeckCardId: instance.cardId,
            ...(byEffectCardId === undefined ? {} : { trashedFromDeckByEffectCardId: byEffectCardId }),
          }),
        );
      },
      dnaDigivolveMemoryGains: (materialPermanentIds, into) =>
        this.subTriggers.dnaMemoryGainsFor(materialPermanentIds, into),
      fireDiscardedFromSecurity: async (instanceIds) => {
        for (const instanceId of instanceIds) {
          await fireTimingForInstance(this, EffectTiming.OnDiscardSecurity, instanceId);
        }
      },
      reactivateOnPlay: (permanentId, opts) => reactivateOnPlay(this, permanentId, opts),
      fireEnteredByEffect: (timing, instanceId, ownerSeat, opts) =>
        fireEnteredByEffectTiming(this, timing, instanceId, ownerSeat, opts),
      fireWhenDigivolving: (seat, permanent, previousLevel) =>
        digivolveDeps(this).fireWhenDigivolving!(this.state, seat, permanent, previousLevel),
      prepareAppFusion: async (seat, target, result, into) => {
        const deps = digivolveDeps(this);
        await deps.prepareDigivolveCost?.(this.state, seat, target, result, into);
      },
      appFusionTargetAllowed: (seat, target, result) => {
        const deps = digivolveDeps(this);
        return (
          deps.digivolveBaseRestricted?.(this.state, target, result) !== true &&
          deps.digivolveIntoAllowed?.(this.state, target, result) !== false
        );
      },
      fireWouldDigivolve: (seat, target, into) =>
        digivolveDeps(this).fireWouldDigivolve!(this.state, seat, target, into),
      consultLeavePrevention: (ids, cause, resolvingSeat, opts) =>
        this.consultLeavePrevention(ids, cause, resolvingSeat, opts),
      consultDigivolutionTrashRedirect: (ids) => this.consultDigivolutionTrashRedirect(ids),
      get combat() {
        return getCombat();
      },
      ask: {
        selectInstances: async (seat, candidateInstanceIds, min, max, promptText, provenance) => {
          const response = await this.decisions.request({
            seat,
            kind: "selectCards",
            promptText,
            sourceCardId: provenance?.sourceCardId,
            options: {
              candidateInstanceIds,
              min,
              max,
              timing: provenance?.timing,
              effectText: provenance?.effectText,
            },
          });
          return response.kind === "selectCards" ? response.instanceIds : [];
        },
      },
      controllerSeat: () => this.state.turnSeat,
      inContinuousPass: () => this.inContinuousPass(),
      inResolvingWindow: () => this.activeWindowToken !== undefined,
      barrierFired: (key) => this.tracker.count(key, "replacement") > 0,
      markBarrierFired: (key) => this.tracker.register(key, "replacement"),
      noteLinked: (instanceIds) => {
        for (const instanceId of instanceIds) this.justLinked.add(instanceId);
      },
    });
  }

  /**
   * Build the runtime EffectContext for a card instance at a timing window
   * (subsystem boundary: this is the seam the activateEffect verb and, once wired,
   * fireTiming share). Binds the source's CardSource, the trigger payload, read-only
   * game access, the effect primitives (fx), and the decision API (ask).
   */
  /**
   * The board-query facade handed to every effect.
   *
   * Every closure it binds reads `this`, and `this.state` is readonly for the engine's life, so
   * one facade serves the whole match. It used to be rebuilt for each effect of each continuous
   * recompute — eight closures and an object per effect, several times per player action, all of
   * it immediately garbage.
   */
  private gameAccess: GameAccess | undefined;

  /**
   * The primitive verbs handed to an effect, one cached object per owning seat.
   *
   * Only `gainMemory` varies with the source's owner, and a seat is 0 or 1, so the spread of the
   * whole primitives object — previously redone on every context build — collapses to two.
   */
  private readonly primitivesBySeat: (Primitives | undefined)[] = [];

  private effectAccess(): GameAccess {
    this.gameAccess ??= createGameAccess(
      this.state,
      (id) => this.continuous.linkMaxDelta(id),
      (id, traits) => this.continuous.linkCostReduction(id, traits),
      (id, keyword) => {
        const permanent = this.access.permanentById(id);
        return (
          (permanent !== undefined && resolveKeywords(permanent, this.continuous).includes(keyword)) ||
          (keyword.toLowerCase() === "piercing" && this.modifiers.hasPierce(id))
        );
      },
      (seat) => this.tracker.count(`seat:${seat}`, "digivolvedThisTurn") > 0,
      (permanentId, timing) => isTimingActivationDisabled(this.continuous, permanentId, timing),
      (permanent) => this.effectiveColorsOf(permanent),
      (instanceId) => this.continuous.hasColorWaiver(instanceId),
      (instanceId) => this.continuous.colorRequirementAlternatives(instanceId),
      (permanent) => canAttackerDeclare(this.access, permanent.controllerSeat, permanent, this.continuous) === null,
      (permanentId, printedTraits) => effectiveTraits(this.continuous, permanentId, printedTraits),
      (permanentId, printedKinds) => effectiveKinds(this.continuous, permanentId, printedKinds),
      (seat, base, evolving, sourceZone) =>
        this.digivolveSupport.matchBaseGrantedDigivolve(seat, base, evolving, sourceZone),
      undefined,
      (id, traits) =>
        this.continuous.linkCostReductionGrant(
          id,
          traits,
          (key) => this.tracker.count(`link-cost/${key}`, "replacement") > 0,
        ),
      (permanent, printedName) => effectiveNames(this.continuous, permanent, printedName),
      (id) => this.combat.battleOpponentOf(id),
    );
    return this.gameAccess;
  }

  private effectPrimitives(ownerSeat: Seat): Primitives {
    // `gainMemory` is written from the resolving card's perspective ("gain N memory").
    // Most windows belong to the turn player, but Security and opponent-turn effects may
    // resolve for the non-turn player. Bind the convenience verb to the source owner here;
    // explicit cross-seat effects continue to use `gainMemoryForSeat` directly.
    this.primitivesBySeat[ownerSeat] ??= {
      ...this.primitives,
      gainMemory: (amount: number) => this.primitives.gainMemoryForSeat(ownerSeat, amount),
    };
    return this.primitivesBySeat[ownerSeat];
  }

  buildEffectContext(source: CardSource, trigger: TriggerInfo, askOverride?: DecisionApi): EffectContext {
    return createEffectContext({
      source,
      trigger,
      game: this.effectAccess(),
      fx: this.effectPrimitives(source.ownerSeat),
      ask: askOverride ?? this.decisionApi,
      usage: this.tracker,
    });
  }

  /**
   * The state lookup a CardSource delegates its placement/turn questions to.
   *
   * Built once per state rather than once per call: it closes over nothing but `this.state`,
   * and `cardSourceOf` runs for every candidate instance on every continuous recompute — several
   * times per player action — so rebuilding its closure set was pure allocation churn.
   */
  private cardStateLookup: CardStateLookup | undefined;

  /**
   * CardSource is a value object over an instance's immutable identity (instanceId, cardId,
   * ownerSeat) whose placement queries are lazy closures, so one per instance stays correct for
   * the instance's whole life. Keyed weakly on the instance itself: an instance that leaves the
   * match takes its entry with it. `cardId`/`ownerSeat` are only ever assigned while building a
   * fresh instance (setup.ts, primitives' token creation), never re-assigned on a live one.
   */
  private readonly cardSourceByInstance = new WeakMap<CardInstance, CardSource>();

  /** Resolve the CardSource for a CardInstance against live state (placement/turn lookup). */
  cardSourceOf(instance: CardInstance): CardSource {
    const cached = this.cardSourceByInstance.get(instance);
    if (cached !== undefined) return cached;
    this.cardStateLookup ??= createCardStateLookup(this.state);
    const source = createCardSource(instance, this.cardStateLookup);
    this.cardSourceByInstance.set(instance, source);
    return source;
  }

  /** Guards each immediate prevention from reactivating during its own resolution. */
  private preventReentryGuard = { activeReplacementKeys: new Set<string>() };

  /**
   * Consult active "prevent" leave/delete replacements for the permanents an effect is about to
   * remove (subsystem: delayed-and-rule-effects). Delegates to the standalone
   * `consultLeavePrevention` (testable in isolation), supplying this engine's registry,
   * permanent lookup, and context builder. Returns the subset whose removal was prevented;
   * default-safe (empty when no prevent replacement is active).
   */
  async consultLeavePrevention(
    permanentIds: string[],
    cause: RemovalCause = "byEffect",
    resolvingSeat?: Seat,
    opts?: { isBounce?: boolean; insteadOnly?: boolean; playerAction?: boolean; isDigiXros?: boolean },
  ): Promise<Set<string>> {
    // Immediate reactions must observe the rebuilt continuous registry, never its
    // clear-before-refill interval during an overlapping effect-resolution flow.
    await this.recomputeContinuousEffects();
    return consultLeavePrevention(
      {
        subTriggers: this.subTriggers,
        keywordReplacements: (ids) => [
          ...detachLeaveReplacements(ids, {
            permanentById: (id) => this.access.permanentById(id),
            hasDetach: (id) => this.continuous.hasKeyword(id, "Detach"),
            traitTokens: (id) => {
              const permanent = this.access.permanentById(id);
              if (permanent?.topCard === undefined) return [];
              const printed = detachTraitTokens(definitionOf(permanent.topCard));
              const granted = this.continuous.keywordGrantSources(id, "Detach").flatMap((source) => {
                const definition =
                  source.sourceCardId === undefined ? undefined : getCardDefinition(source.sourceCardId);
                return detachTraitTokens({ effectText: source.effectText ?? definition?.effectText });
              });
              return [...new Set([...printed, ...granted])];
            },
            definitionOf: (card) => definitionOf(card),
            trash: (paymentIds) => this.primitives.trash(paymentIds),
          }),
          ...guardLeaveReplacements(
            [...this.state.players].flatMap((player) => player.battleArea.map((permanent) => permanent.permanentId)),
            {
              idOffset: ids.length,
              permanentById: (id) => this.access.permanentById(id),
              isBattleAreaDigimon: (permanent) => this.access.isBattleAreaDigimon(permanent, this.continuous),
              hasGuard: (id) => this.continuous.hasKeyword(id, "Guard"),
            },
          ),
        ],
        permanentById: (id) => this.access.permanentById(id),
        buildContext: (srcPerm, leavingId) =>
          this.buildEffectContext(this.cardSourceOf(srcPerm.topCard!), {
            deletedPermanentId: leavingId,
            deletedPermanentIds: permanentIds,
          }),
        buildInstanceContext: (sourceInstanceId, leavingId) => {
          const sourceInstance = findLooseInstance(this, sourceInstanceId);
          return sourceInstance === undefined
            ? undefined
            : this.buildEffectContext(this.cardSourceOf(sourceInstance), {
                deletedPermanentId: leavingId,
                deletedPermanentIds: permanentIds,
              });
        },
        turnSeat: this.state.turnSeat,
        // Once-per-turn prevention ledger (＜Barrier＞), keyed in the shared per-turn UseTracker
        // (reset at each turn start alongside every other Once-Per-Turn limit).
        oncePerTurnFired: (key) => this.tracker.count(key, "replacement") > 0,
        markOncePerTurnFired: (key) => this.tracker.register(key, "replacement"),
        // ＜Guard＞ is the one prevention keyword that resolves as a replacement subscription
        // rather than inline in the deletion paths, so its announcement is wired here.
        keywordPrevented: (activationIdentity, sourcePermanentId, savedPermanentId) => {
          if (activationIdentity !== "keyword-guard") return;
          const saved = this.access.permanentById(savedPermanentId);
          if (saved === undefined) return;
          this.hooks.emit({
            kind: "deletionPrevented",
            keyword: "Guard",
            seat: saved.controllerSeat,
            permanentId: saved.permanentId,
            ...(saved.topCard === undefined ? {} : { cardId: saved.topCard.cardId }),
            ...(sourcePermanentId === undefined ? {} : { paidPermanentId: sourcePermanentId }),
          });
        },
        orderReplacements: async (replacements, seat) => {
          const keyed = replacements.map((replacement) => {
            const sourceInstance =
              replacement.sourceInstanceId === undefined
                ? undefined
                : findLooseInstance(this, replacement.sourceInstanceId);
            return {
              replacement,
              key: `replacement/${replacement.id}/${sourceInstance?.cardId ?? replacement.sourceInstanceId ?? replacement.sourcePermanentId ?? "source"}`,
            };
          });
          const response = await this.decisions.request({
            seat,
            kind: "orderTriggers",
            promptText: "Choose the order for simultaneous would-leave effects.",
            options: { triggerKeys: keyed.map(({ key }) => key) },
          });
          if (response.kind !== "orderTriggers" || response.order.length === 0) return replacements;
          const selected = keyed.find(({ key }) => key === response.order[0]);
          return selected === undefined
            ? replacements
            : [
                selected.replacement,
                ...replacements.filter((replacement) => replacement.id !== selected.replacement.id),
              ];
        },
      },
      permanentIds,
      cause,
      resolvingSeat,
      {
        isBounce: opts?.isBounce,
        playerAction: opts?.playerAction,
        isDigiXros: opts?.isDigiXros,
        insteadOnly: opts?.insteadOnly,
        reentryGuard: this.preventReentryGuard,
      },
    );
  }

  /**
   * Consult active digivolution-card-trash "redirect" replacements (subsystem:
   * delayed-and-rule-effects; BT10-084 Tactimon, KB Q2002-Q2008) for a trash operation about to
   * target `hostPermanentIds`. Delegates to the standalone `consultDigivolutionTrashRedirect`
   * (testable in isolation), supplying this engine's registry, permanent lookup, and context
   * builder. Returns the redirected host id, or undefined when nothing changed.
   */
  private consultDigivolutionTrashRedirect(hostPermanentIds: string[]): Promise<string | undefined> {
    return consultDigivolutionTrashRedirect(
      {
        subTriggers: this.subTriggers,
        permanentById: (id) => this.access.permanentById(id),
        buildContext: (srcPerm) => this.buildEffectContext(this.cardSourceOf(srcPerm.topCard!), {}),
      },
      hostPermanentIds,
    );
  }

  /**
   * Single-sourced per-permanent teardown for every deletion seam. When a permanent
   * leaves the field its three per-permanent ledgers must be dropped together: the
   * modifier ledger (DP/keyword/cost modifiers), the continuous-rule store, and the
   * SubTrigger registry (delayed watchers + reduceCost/prevent REPLACEMENTS). The
   * effect-driven `deletePermanent` primitive does this inline; combat and the security
   * check delete through raw state access and so route their cleanup here, so a stale
   * watcher or replacement from a source that died in battle/security cannot fire or
   * discount after the source is gone. Mirrors the DNA-digivolve material teardown.
   */
  private dropPermanentSubscriptions(permanentId: string): void {
    this.modifiers.dropPermanent(permanentId);
    this.continuous.dropPermanent(permanentId);
    this.subTriggers.dropPermanent(permanentId);
  }

  /**
   * CR §3-1-3-1-2: a card that leaves the field returns as a new card, so its [Once Per Turn]
   * effects are available again (EX12-065 replayed by ＜Fortitude＞, KB Q6866). A card still on
   * the field is the same Digimon (§3-4-5, KB Q4253) and keeps its counts. Forgetting at the
   * departure, not after the deletion reactions, keeps the use ＜Fortitude＞'s replay then spends.
   */
  private forgetUsesOfCardsLeavingField(event: ServerEvent): void {
    if (event.kind !== "cardsMoved") return;
    const onField = (zone: string): boolean => zone === Zone.BattleArea || zone === Zone.Breeding;
    if (!onField(event.from) || onField(event.to)) return;
    for (const instanceId of event.instanceIds) this.tracker.forgetInstance(instanceId);
  }

  /**
   * Expire duration-scoped modifiers/rules at a turn/phase boundary, then re-derive
   * the continuous tier (subsystems: static-continuous-effects, effect-primitives).
   * Maps the turn-machine's boundary vocabulary to the ledgers' `DurationBoundary`
   * (whose seat-relative sweeps mirror how the engine's `Until*Effects`
   * clearing): a per-turn-end boundary sweeps both ledgers relative to the seat whose
   * turn just ended, so an `UntilOwnerTurnEnd` buff clears on its owner's end and an
   * `UntilOpponentTurnEnd` buff clears on the opponent's. The recompute that follows
   * re-applies the still-valid persistent effects from the post-sweep board.
   *
   * `ownerTurnStart` carries no modifier expiry of its own. `ownerActivePhaseEnd`
   * sweeps phase-scoped entries after the active-phase unsuspend, including the
   * `UntilNextUntap` window used by "during the next unsuspend phase" effects.
   */
  async sweepDurations(boundary: TurnBoundary): Promise<void> {
    const seat = this.state.turnSeat;
    const sweep = (b: "ownerTurnEnd" | "opponentTurnEnd" | "eachTurnEnd" | "ownerActivePhase" | "nextUntap"): void => {
      this.modifiers.sweep(this.state, b, seat);
      this.continuous.sweep(this.state, b, seat);
    };
    switch (boundary) {
      case "ownerTurnEnd":
        sweep("ownerTurnEnd");
        // GRANTED timed watchers (BT23-056's [Start of Your Main Phase] install) expire at
        // their owner's turn end. `seat` is the seat whose turn
        // just ended, so a watcher anchored on that seat's permanent is now dropped.
        this.subTriggers.sweepExpired(seat);
        break;
      case "opponentTurnEnd":
        sweep("opponentTurnEnd");
        break;
      case "eachTurnEnd":
        sweep("eachTurnEnd");
        this.securityDp.sweepTurnEnd(seat);
        break;
      case "ownerTurnStart":
        break; // the recompute below refreshes the persistent tier for the new turn
      case "ownerActivePhaseEnd":
        // Active-phase unsuspend runs before this boundary. A restriction with
        // UntilNextUntap must therefore block that unsuspend, then expire here.
        sweep("ownerActivePhase");
        sweep("nextUntap");
        break;
    }
    this.projection.recomputeExpiredAffectationRecipients();
    // Re-derive the persistent tier from the post-sweep board.
    await this.recomputeContinuousEffects();
  }

  /** Open an identity token for one battle, so nested battles do not sweep parent grants. */
  beginBattleScope(): number {
    const scopeId = ++this.battleScopeSequence;
    this.modifiers.beginBattleScope(scopeId);
    this.continuous.beginBattleScope(scopeId);
    return scopeId;
  }

  endBattleScope(scopeId: number): void {
    this.modifiers.endBattleScope(scopeId);
    this.continuous.endBattleScope(scopeId);
  }

  /** Expire battle grants after its reactions, independently of the enclosing attack. */
  async sweepBattleDurations(scopeId?: number): Promise<void> {
    this.modifiers.sweep(this.state, "endBattle", this.state.turnSeat, scopeId);
    this.continuous.sweep(this.state, "endBattle", this.state.turnSeat, scopeId);
    this.projection.recomputeExpiredAffectationRecipients();
    await this.recomputeContinuousEffects();
    if (scopeId !== undefined) this.endBattleScope(scopeId);
  }

  /** Expire attack grants, including unused battle grants when no battle occurred. */
  private async sweepCombatDurations(): Promise<void> {
    for (const boundary of ["endBattle", "endAttack"] as const) {
      this.modifiers.sweep(this.state, boundary, this.state.turnSeat);
      this.continuous.sweep(this.state, boundary, this.state.turnSeat);
    }
    this.projection.recomputeExpiredAffectationRecipients();
    await this.recomputeContinuousEffects();
  }

  /**
   * Unsuspend the turn player's permanents at the start of the Active phase
   * (Comprehensive Rules §6-2: "the turn player unsuspends all of their Digimon and
   * Tamers on the field at the same time"). Returns the permanent ids actually
   * flipped from suspended to unsuspended (for the event log). Breeding-area
   * permanents are also unsuspended (the source ActivePhase unsuspends every
   * controlled permanent).
   *
   * §16-11 ＜Reboot＞: opponent's Digimon with this keyword also unsuspend during
   * the turn player's unsuspend phase.
   */
  async unsuspendForActivePhase(seat: Seat): Promise<string[]> {
    // The active-turn gate changes at passTurn(), and OpponentsTurn watchers are
    // continuous effects derived from that gate. Rebuild immediately before the
    // actual unsuspend operation so the transition cannot outrun watcher install.
    await this.recomputeContinuousEffects();
    const flipped = await this.unsuspendAllForSeat(seat);
    // ＜Reboot＞: the opponent's Digimon also unsuspend (§16-11)
    const oppSeat = seat === 0 ? 1 : 0;
    const oppFlipped = this.unsuspendRebootForSeat(oppSeat);
    const allFlipped = [...flipped, ...oppFlipped];
    // SubTrigger bus: "when [this/a matching] Digimon/Tamer becomes unsuspended" watchers
    // (23-card cluster). Covers both the turn player's own unsuspend and the opponent's
    // ＜Reboot＞ unsuspend — both are genuine suspended -> unsuspended transitions.
    for (const permanentId of allFlipped) {
      // Both seams of "becomes unsuspended": the timing window handwritten modules listen on
      // (BT11-032's bounce) and the SubTrigger bus the compiled watchers use. Dispatch the
      // event bus against the watcher armed immediately before this unsuspend first; the
      // legacy timing window performs a trailing continuous recompute and would otherwise
      // invalidate that watcher before it could resolve.
      const payload = { unsuspendedPermanentId: permanentId };
      await this.fireSubTrigger("whenUnsuspended", payload);
      await fireTiming(this, EffectTiming.OnUnTappedAnyone, payload);
    }
    return allFlipped;
  }

  private async unsuspendAllForSeat(seat: Seat): Promise<string[]> {
    const player = this.state.players[seat];
    if (player === undefined) return [];
    const flipped: string[] = [];
    const permanents = [...player.battleArea];
    if (player.breeding !== undefined) permanents.push(player.breeding);
    for (const permanent of permanents) {
      if (permanent.isSuspended) {
        if (this.continuous.hasRestriction(permanent.permanentId, "unsuspend")) continue;
        if (
          this.continuous.hasRestriction(permanent.permanentId, "unsuspendDuringOwnUnsuspendPhase") ||
          this.continuous.hasRestriction(permanent.permanentId, "unsuspendDuringUnsuspendPhase")
        )
          continue;
        const handTrashCost = this.continuous.restrictionCount(permanent.permanentId, "unsuspendHandTrashCost");
        if (handTrashCost > 0) {
          if (player.hand.length < handTrashCost) continue;
          const response = await this.decisions.request({
            seat,
            kind: "selectCards",
            promptText: `Trash ${handTrashCost} card${handTrashCost === 1 ? "" : "s"} from your hand to unsuspend this Digimon?`,
            options: {
              candidateInstanceIds: Array.from(player.hand, (card) => card.instanceId),
              min: 0,
              max: handTrashCost,
            },
          });
          if (response.kind !== "selectCards" || response.instanceIds.length !== handTrashCost) continue;
          await this.primitives.trash(response.instanceIds);
        }
        permanent.isSuspended = false;
        flipped.push(permanent.permanentId);
      }
    }
    return flipped;
  }

  /**
   * Unsuspend every opponent permanent that has ＜Reboot＞ and is eligible
   * to unsuspend (§16-11).
   */
  private unsuspendRebootForSeat(seat: Seat): string[] {
    const player = this.state.players[seat];
    if (player === undefined) return [];
    const flipped: string[] = [];
    for (const permanent of player.battleArea) {
      if (!permanent.isSuspended) continue;
      if (this.continuous.hasRestriction(permanent.permanentId, "unsuspend")) continue;
      if (this.continuous.hasRestriction(permanent.permanentId, "unsuspendDuringUnsuspendPhase")) continue;
      if (!this.continuous.hasKeyword(permanent.permanentId, "Reboot")) continue;
      permanent.isSuspended = false;
      flipped.push(permanent.permanentId);
    }
    if (
      player.breeding?.isSuspended &&
      this.continuous.hasKeyword(player.breeding.permanentId, "Reboot") &&
      !this.continuous.hasRestriction(player.breeding.permanentId, "unsuspend") &&
      !this.continuous.hasRestriction(player.breeding.permanentId, "unsuspendDuringUnsuspendPhase")
    ) {
      player.breeding.isSuspended = false;
      flipped.push(player.breeding.permanentId);
    }
    return flipped;
  }

  /**
   * Drive the interactive breeding phase (Comprehensive Rules §6-4). Opens the
   * breeding window for the turn player via the BreedingPhaseController; the player
   * takes at most one breeding action (the hatchEgg / moveFromBreeding intents drive
   * it) or skips with endPhase. When no breeding action is possible the window
   * auto-skips with no client round-trip (§6-4-1-3).
   */
  async runBreedingPhase(seat: Seat): Promise<void> {
    const possible = canHatch(this.state, seat) || canMove(this.state, seat);
    await this.breeding.run(seat, !possible);
  }

  /**
   * Interim draw primitive: move the top `n` cards from a seat's deck to its hand,
   * returning the moved instances. Mirrors the source `rule implementation(owner, n).Draw()`
   * (deck top -> hand). The deck-out loss check is the security-and-win-check
   * subsystem's responsibility; this stops at an empty deck and returns fewer cards.
   *
   * TODO(effect-primitives / deck-and-setup): replace with the canonical draw once
   *   that subsystem lands (which will also fire OnDraw and trigger deck-out loss).
   */
  async drawCards(seat: Seat, n: number): Promise<CardInstance[]> {
    const player = this.state.players[seat];
    if (player === undefined) return [];
    const drawn: CardInstance[] = [];
    for (let i = 0; i < n; i++) {
      const top = takeTop(player, Zone.Deck);
      if (top === undefined) break; // deck-out; handled elsewhere
      insertCard(player, Zone.Hand, top);
      drawn.push(top);
    }
    if (drawn.length > 0) {
      // Both halves of one draw: the OnDraw window and the reactive watchers. The event
      // carries the drawing seat; the gate in runSubTrigger (interpreter.ts) fires a watcher
      // only when drawingSeat is the OPPONENT of the watcher's controller seat.
      await withPendingSubTriggers(this, ["whenOpponentDraws"], { drawingSeat: seat }, () =>
        fireTiming(this, EffectTiming.OnDraw, { drawnInstanceIds: drawn.map((c) => c.instanceId) }),
      );
    }
    return drawn;
  }

  /** Stable effect key for a BT3-056-style ＜Digisorption＞ redirect's once-per-turn accounting. */

  /**
   * Fire the SubTrigger bus (System B) for `event`, running every armed watcher whose
   * captured `sourceFilter` matches the `payload` (delayed-and-rule-effects). Distinct
   * from `fireTiming` (System A, the EffectTiming collect-resolve framework): a watcher
   * here was installed by an already-resolved effect ("when you play a green Tamer,
   * draw 1") and reacts to a future event. Co-located with the matching `fireTiming`
   * order, but the bus carries the per-install payload predicate (System A does not).
   *
   * `makeContext` binds each watcher a fresh EffectContext anchored on its OWN source
   * permanent (so its body's "this Digimon" / controller scope resolve correctly) and
   * carries the event `payload` in `ctx.trigger` (so both the body and the `matches`
   * predicate can read what happened). A watcher whose source permanent has left the
   * field is skipped (its subscription was already dropped on leave).
   */

  /**
   * Re-derive every continuous (persistent / `EffectTiming.None`) effect from a clean
   * slate (subsystem: static-continuous-effects). Comprehensive Rules §15-8-2:
   * persistent effects ("[Your Turn] This Digimon gets +1000 DP", "can't attack", a
   * granted ＜Blocker＞, a continuous cost reduction) are "constantly activated without
   * being triggered" — there is no firing window, so the engine recomputes the whole
   * tier at each relevant decision point.
   *
   * Clear-then-recompute (so nothing double-applies): drop only the CONTINUOUS tier of
   * both ledgers (the `continuous`-tagged DP/pierce/evo/play-cost modifiers and the
   * `continuous`-tagged restrictions/keywords/aliases/waivers) — one-shot,
   * duration-scoped modifiers from triggered effects are untouched — then re-fire the
   * `None`-timing effects with `continuousMode` on, so each re-records itself as
   * `continuous`. Unlike a triggered window this does NOT touch the per-turn use ledger
   * and never prompts (persistent effects are mandatory and make no choices); a static
   * effect whose own `when`/`condition` gate fails simply contributes nothing this pass,
   * which is exactly how a `[Your Turn]`/`while ...` effect lapses when its gate stops
   * holding.
   *
   * Re-entrant calls from inside the continuous pass are no-ops. Concurrent requests from a
   * different async flow instead wait for the in-flight pass and queue one final refresh. That
   * completion barrier prevents consumers from observing the clear-before-refill interval of
   * the continuous ledgers. Public so callers/tests can force a recompute at a decision point
   * the timing/boundary hooks do not already cover.
   */
  async recomputeContinuousEffects(): Promise<void> {
    if (this.recomputeInFlight !== undefined) {
      if (this.continuousScope.getStore() === true) return;
      this.recomputeQueued = true;
      await this.recomputeInFlight;
      return;
    }
    // Continuous effects are passive modifiers and never prompt (ARCHITECTURE.md §5);
    // a Static effect whose action has `optional:true` must be auto-declined here so
    // we don't open a nested DecisionManager request that collides with an already-open
    // dec-1 (#residual-gaps/nested-decision-crash).
    const noPromptAsk: DecisionApi = {
      optional: async () => false,
      chooseTargets: async () => [],
      selectCards: async () => [],
      selectPermanents: async () => [],
      chooseOption: async () => 0,
    };
    // Defer the driver by one microtask so `recomputeInFlight` is installed before the
    // first pass can recursively reach this method through a static effect primitive.
    const task = Promise.resolve().then(async () => {
      do {
        this.recomputeQueued = false;
        // Everything each pass records is a continuous effect, and the tier tag has to follow
        // THIS async chain: a timing window resolving concurrently (a play whose trailing
        // recompute is still in flight) must not read the tag from a shared field.
        //
        // A continuous gate may read a value produced by another continuous effect (for
        // example, EX10-010's DP threshold on two facing copies). Re-derive from a clean tier
        // each time so stale grants and duplicate watchers cannot accumulate, but seed each
        // pass with the previous pass's DP deltas so the dependency chain can reach a fixpoint.
        // The cap protects the resolver from a genuinely oscillating set of card effects.
        const maxFixpointPasses = 32;
        let seed = this.projection.continuousDpSeeds();
        let converged = false;
        for (let pass = 0; pass < maxFixpointPasses; pass++) {
          await this.continuousScope.run(true, () => this.runContinuousPass(noPromptAsk, seed));
          this.projection.updateContinuousDpSeeds();
          const next = this.projection.continuousDpSeeds();
          if (sameNumericMap(seed, next)) {
            converged = true;
            break;
          }
          seed = next;
        }
        if (!converged) {
          throw new Error(`continuous effects did not converge after ${maxFixpointPasses} passes`);
        }
      } while (this.recomputeQueued);

      this.projection.syncActivatableEffects();
      this.projection.syncKeywords();
      this.projection.syncSummoningSickness();
      this.projection.syncRestrictions();
      this.projection.syncAttackTargets();
      this.projection.syncHandAffordances();
      this.projection.syncLinkTargets();
    });
    this.recomputeInFlight = task;
    try {
      await task;
    } finally {
      if (this.recomputeInFlight === task) this.recomputeInFlight = undefined;
    }
  }

  /**
   * The body of one continuous recompute: clear the continuous tier of every ledger, then
   * re-fire the persistent (`EffectTiming.None`) effects, the effects conferred by a
   * "gains all effects" grant, and the named custom-effect grants. Always run inside the
   * continuous scope (see {@link recomputeContinuousEffects}).
   */
  private async runContinuousPass(
    noPromptAsk: DecisionApi,
    seed: ReadonlyMap<string, number> = new Map(),
  ): Promise<void> {
    this.modifiers.clearContinuous(this.state);
    // clearContinuous recomputes each touched permanent from the non-continuous layer. Reapply
    // only the previous pass's continuous deltas, so gates can observe the prior derived value
    // while this pass still rebuilds a clean ledger.
    for (const player of this.state.players) {
      const permanents = player.breeding === undefined ? player.battleArea : [...player.battleArea, player.breeding];
      for (const permanent of permanents) {
        const delta = seed.get(permanent.permanentId);
        if (delta !== undefined) permanent.currentDP += delta;
      }
    }
    this.continuous.clearContinuous();
    this.memory.clearTurnEndMinMemoryOverrides();
    // The SubTrigger registry holds CONTINUOUS Static/[Breeding] Replacement (reduceCost) and
    // SubTrigger watcher installs, re-derived each recompute alongside the other continuous
    // tiers. Clear them here so a `Static` reduceCost re-installs exactly once per recompute
    // (CR-01) rather than accumulating to N, 2N, 3N… across the multiple recomputes per turn.
    // One-shot installs from triggered windows (BT23-056's granted timed trigger) carry no
    // `continuous` flag and survive.
    this.subTriggers.clearContinuous();
    this.deletionMaxDp.clear();
    this.dpDeleteBudget.clear();
    // The security-DP ledger holds the CONTINUOUS ModifySecurityDP deltas (ST3-12's
    // [Opponent's Turn] +2000), re-derived each recompute alongside the other continuous
    // tiers. Clear it here so a re-fire under the [Opponent's Turn] guard re-applies the
    // delta exactly once (IR-01) rather than accumulating across recomputes.
    this.securityDp.clearContinuous();

    const continuousEffects: { source: CardSource; effect: Effect }[] = [];
    for (const instance of this.listCandidateInstances()) {
      const source = this.cardSourceOf(instance);
      for (const effect of effectsOf(EffectTiming.None, source)) {
        continuousEffects.push({ source, effect });
      }
    }
    continuousEffects.sort(
      (left, right) => (left.effect.continuousPriority ?? 0) - (right.effect.continuousPriority ?? 0),
    );
    for (const { source, effect } of continuousEffects) {
      const ctx = this.buildEffectContext(source, {}, noPromptAsk);
      ctx.continuousPass = true;
      // Persistent effects re-apply whenever their guard holds; canTrigger here is
      // the builder's on-field/`when` gate (maxPerTurn is irrelevant — uncounted).
      if (!canTrigger(effect, ctx, this.tracker)) continue;
      if (!canActivate(effect, ctx, this.tracker)) continue;
      await effect.resolve(ctx);
    }
    // A GrantStatic "gain all effects" source is established during the base static pass.
    // Its conferred card can itself have an [All Turns]/Static watcher (EX3-013 under
    // BT12-072), so resolve those newly-visible continuous effects in the same recompute.
    // Triggered timings already use collectConferredEffects through the normal resolver;
    // without this companion pass only their discrete effects existed, while leave
    // replacements silently failed to install.
    const candidates = this.listCandidateInstances();
    const sourceByInstanceId = new Map(
      candidates.map((instance) => [instance.instanceId, this.cardSourceOf(instance)] as const),
    );
    const conferredContinuous = collectConferredEffects(
      EffectTiming.None,
      this.continuous.listStackEffectConferrals(),
      (instanceId) => sourceByInstanceId.get(instanceId),
      (source, effect, conferredToPermanentId, conferralGranterInstanceId) => ({
        ...this.buildEffectContext(source, {}, noPromptAsk),
        activeTiming: EffectTiming[EffectTiming.None],
        activeEffectText: effect.description,
        continuousPass: true,
        conferredToPermanentId,
        conferralGranterInstanceId,
      }),
      this.tracker,
    );
    for (const { source, effect, conferredToPermanentId, conferralGranterInstanceId } of conferredContinuous) {
      const ctx: EffectContext = {
        ...this.buildEffectContext(source, {}, noPromptAsk),
        activeTiming: EffectTiming[EffectTiming.None],
        activeEffectText: effect.description,
        continuousPass: true,
        conferredToPermanentId,
        conferralGranterInstanceId,
      };
      await effect.resolve(ctx);
    }
    // Named custom effect grants ("1 of your opponent's Digimon gains '[All Turns] When this
    // Digimon becomes suspended, lose 2 memory.'"). Discrete timings already reach these through
    // gatherTriggeredEffects -> collectGrantedCustomEffects, but a granted [All Turns]/Static
    // clause lives in the CONTINUOUS window: its SubTrigger/Replacement watcher has to be
    // installed by this pass or it is never armed at all. Without this the grant is recorded in
    // the ledger, reads as active on the board, and silently never fires.
    const grantedContinuous = collectGrantedCustomEffects(
      EffectTiming.None,
      this.continuous.listCustomEffectGrants(),
      (instanceId) => sourceByInstanceId.get(instanceId),
      (token, source) => grantedTokenEffectsForTiming(token, EffectTiming.None, source),
      (source, effect) => ({
        ...this.buildEffectContext(source, {}, noPromptAsk),
        activeTiming: EffectTiming[EffectTiming.None],
        activeEffectText: effect.description,
        continuousPass: true,
      }),
      this.tracker,
    );
    for (const { source, effect } of grantedContinuous) {
      const ctx: EffectContext = {
        ...this.buildEffectContext(source, {}, noPromptAsk),
        activeTiming: EffectTiming[EffectTiming.None],
        activeEffectText: effect.description,
        continuousPass: true,
      };
      if (!canActivate(effect, ctx, this.tracker)) continue;
      await effect.resolve(ctx);
    }

    // BT23-024 suspend-restriction-with-superlative-exception: for every ARMED source, re-derive
    // the affected opponent set (all opponent Digimon MINUS the highest-play-cost one) and record
    // a CONTINUOUS `suspend` restriction per affected permanent. Done here (not in a card's
    // resolve) because the exempt set is a computed exclusion over the live board, recomputed each
    // pass so it tracks plays/digivolves/removals (KB Q5250/Q5252; Q6025/Q6026 all-restricted).
    this.projection.applySuspendRestrictionRecompute();

    // A seed is only an input to this pass. Recompute every seeded permanent from the rebuilt
    // ledgers so a gate that stopped matching cannot leave the seed's stale DP visible.
    for (const permanentId of seed.keys()) this.modifiers.recomputeDP(this.state, permanentId);
  }

  /**
   * The framework environment a timing resolution runs against: authoritative state,
   * the effect verbs (fx), the player-decision API (ask), and the per-turn use ledger
   * (shared with activateEffect so maxPerTurn accounting is unified).
   */
  effectEnvironment(trigger: TriggerInfo): EffectEnvironment {
    return {
      state: this.state,
      fx: this.primitives,
      fxForSource: (source) => this.effectPrimitives(source.ownerSeat),
      ask: this.decisionApi,
      tracker: this.tracker,
      continuous: this.continuous,
      hasKeyword: (id, keyword) =>
        this.continuous.hasKeyword(id, keyword) ||
        (keyword.toLowerCase() === "piercing" && this.modifiers.hasPierce(id)),
      digivolvedThisTurn: (seat) => this.tracker.count(`seat:${seat}`, "digivolvedThisTurn") > 0,
      effectiveColors: (permanent) => this.effectiveColorsOf(permanent),
      colorRequirementWaived: (instanceId) => this.continuous.hasColorWaiver(instanceId),
      colorRequirementAlternatives: (instanceId) => this.continuous.colorRequirementAlternatives(instanceId),
      canDeclareAttack: (permanent) =>
        canAttackerDeclare(this.access, permanent.controllerSeat, permanent, this.continuous) === null,
      battleOpponentOf: (id) => this.combat.battleOpponentOf(id),
      triggerInfo: trigger,
    };
  }

  /**
   * Guards `doRuleProcess` against re-entry while a state-based-action pass is mid-flight
   * (a deletion can fire an [On Deletion] effect that itself drives `resolveTiming`, which
   */
  ruleProcessing = false;
  /** Barrier costs trigger security-removal effects before the current security battle continues. */
  resolvingBarrierSecurityCost = false;

  /**
   * Triggered watcher events produced while a rule check is still reaching its fixpoint.
   * They become pending only after every immediately applicable rule process has finished.
   * This is observable for BT25-084/Q6399: paying its leave-prevention cost trashes the
   * controller's hand, but the resulting watcher cannot activate before the repeated
   * 0-DP rule check deletes Titamon.
   */
  readonly deferredRuleSubTriggers: {
    event: SubTriggerEventName;
    payload: TriggerInfo;
    armed: ArmedSubTrigger[];
  }[] = [];

  /**
   * The deletions a rule-check fixpoint has performed but not yet reacted to, or `undefined`
   * outside a fixpoint. Set for the whole pass, so every sweep's `deletePermanent` collects
   * its [On Deletion] triggers here instead of resolving them (see
   * {@link resolveDeletionReactions}); {@link flushRuleTriggerPool} then opens ONE window
   * over the merged set. Rule checks are simultaneous (§17-1-3), and the effects they
   * trigger are simultaneous with each other too (§15-4-3-3), which is only observable if
   * they reach one prompt — hence one pool, whatever order the sweeps ran in.
   */
  ruleTriggerPool: PooledRuleDeletion[] | undefined = undefined;

  /**
   * Defensive pass cap for the rule fixpoint, mirroring the resolver's
   * `MAX_RESOLUTION_PASSES`. Each pass strictly removes at least one permanent (a deleted
   * card cannot re-enter the same condition), so termination is structural; the cap only
   * guards against an unforeseen non-decreasing pass (a crafted board hanging the server —
   * RESEARCH Pitfall 3 / threat T-02-03).
   */
  private static readonly MAX_RULE_PROCESS_PASSES = 1000;

  /**
   * The state-based-action sweep: a faithful port of `the engine.RuleProcess`'s
   * `while (DoRuleProcess()) { ... }` fixpoint. Each pass runs the sub-processes below,
   * cited by Comprehensive Rules §17-1-3 subsection (the local KB `comprehensive.md`
   * chunk verified against `node tools/kb/query.mjs rules "rule check"`):
   *
   *   - §17-1-3-1-1 (delete): a battle-area Digimon at raw DP 0.
   *   - §17-1-3-2-1 (trash):  a battle-area Digimon at raw DP < 0 ("without DP").
   *   - §17-1-3-2-3 (trash):  a non-Digimon/non-DigiEgg card in the breeding slot.
   *   - §17-1-3-2-4 (trash):  a permanent whose TOP card is face-down.
   *   - §17-1-3-2-5 (trash):  linked cards beyond a Digimon's effective link limit.
   *   - §17-1-3-2-6/§17-1-3-2-7 (trash): a linked card whose own compiled `linkRequirement`
   *     (names/traits) the live host no longer satisfies.
   *   - §17-1-3-2-2 (trash): an Option-kind battle-area permanent NOT placed there by an
   *     effect (`Permanent.placedByEffect`, packages/shared — set by the one path that
   *     creates an Option permanent, `placeOptionAsPermanent` in effects/primitives.ts).
   *
   * plus the EndGame loss-flag resolution (Ch.18, run first each pass, mirroring the
   * source `AutoProcessCheck` ordering). Deliberately NOT implemented: "Battle as Tamer"
   * (no such rule located in Chapter 17 or elsewhere).
   *
   * All deletion routes through the existing `deletePermanent` primitive with cause
   * `byRule`, keeping OnDeletion + leave-prevention (and the now-live `onDeletionOf` bus)
   * single-sourced (RESEARCH "Don't Hand-Roll"); the link-excess trim routes through the
   * `trash` primitive (a link card is trashed individually, not the whole permanent).
   *
   * PRECONDITION (invariant, not enforced here): the continuous DP tier must already be
   * current when this runs. `doRuleProcess()` -> anyZeroDpDigimon()/anyNegativeDpToTrash()
   * read `modifiers.rawDp` directly and do NOT recompute first; they rely on the caller to
   * have refreshed the continuous layer (every wired caller reaches this sandwiched inside a
   * `fireTiming` window, after `recomputeContinuousEffects`). A future DIRECT caller, or a
   * call reached outside a `fireTiming` window, MUST `await recomputeContinuousEffects()`
   * before entering, otherwise a stale `rawDp` could wrongly delete a Digimon a static
   * `[Your Turn] +N DP` would have lifted above 0, or miss one a cleared buff should drop to 0.
   * Do NOT call this while the continuous ledger is mid-clear.
   *
   * §17-1-2 note: rule checks aren't performed during rule processing (§17-1-2-1) or
   * during effect processing (§17-1-2-2). The `ruleProcessing` latch below satisfies
   * §17-1-2-1 (a re-entrant call, e.g. from an [On Deletion] triggered BY this sweep's own
   * deletePermanent, returns false from `doRuleProcess` until this pass finishes). §17-1-2-2
   * is satisfied by construction of `resolveTiming` (stack.ts): the sweep runs only before a
   * timing window starts and after each single triggered effect FULLY resolves — never
   * between two instructions inside one effect's own body, matching the rule's own worked
   * example (a "-3000 DP and <Security A. -1>" effect is checked only after BOTH clauses
   * apply). A timing window opened by a rule-produced movement cannot start a second sweep:
   * the active outer fixpoint owns the rule work and the pending triggers until it converges.
   */
  async ruleProcess(): Promise<void> {
    // A timing window opened by a rule-produced deletion can re-enter this method while
    // the outer state-based-action sweep is still active. The outer invocation owns both
    // the fixpoint and its deferred SubTrigger queue. A nested invocation must return
    // immediately: attempting to flush that queue here would dequeue each item, call
    // fireSubTrigger while `ruleProcessing` is still true, and enqueue the same item again
    // forever (BT25-084 / Q6399).
    if (this.ruleProcessing) return;
    // Deletions performed by ANY sweep of this fixpoint collect here instead of resolving,
    // so the whole pass produces one simultaneous trigger group (§17-1-3, §15-4-3-3).
    const pool: PooledRuleDeletion[] = [];
    this.ruleTriggerPool = pool;
    try {
      await this.runRuleProcessFixpoint();
    } finally {
      this.ruleTriggerPool = undefined;
    }
    if (this.state.gameOver) return;
    await this.flushRuleTriggerPool(pool);
  }

  /**
   * Run the movement half of a rule check while retaining its reactions for a later
   * trigger window. Arts Digivolve needs this split: a Digimon reduced to 0 DP by the
   * used Option is deleted after the digivolution placement, and that deletion's
   * reactions trigger at the same time as the new card's [When Digivolving] effects
   * (BT26-031 Q6998). The turn player's entry effects therefore resolve first, while
   * the opponent's retained [On Deletion] reactions follow from the same checkpoint.
   */
  private async collectRuleProcessMovements(): Promise<PooledRuleDeletion[]> {
    if (this.ruleProcessing || this.ruleTriggerPool !== undefined) return [];
    const pool: PooledRuleDeletion[] = [];
    this.ruleTriggerPool = pool;
    try {
      await this.runRuleProcessFixpoint();
    } finally {
      this.ruleTriggerPool = undefined;
    }
    return pool;
  }

  /**
   * The `while (doRuleProcess())` fixpoint itself: run every sweep, pass after pass, until
   * the board holds no rule violation. Returns without reacting to anything it removed —
   * the pass's triggers are pooled (see {@link ruleTriggerPool}).
   */
  private async runRuleProcessFixpoint(): Promise<void> {
    let passes = 0;
    while (this.ruleChecks.doRuleProcess()) {
      if (++passes > GameEngine.MAX_RULE_PROCESS_PASSES) {
        // CR 18-3-2: an infinite loop neither player can stop ends the game in a draw.
        // A non-converging state-based-action fixpoint is exactly that, so resolve the
        // match rather than throwing an error the players cannot act on.
        //
        // §18-3-3 (a player CAN stop it, so they declare a repeat count instead) has no
        // application here: every sweep in this fixpoint is a mandatory rule check
        // (§17-1-3) with no optional link and no player choice, so neither player has a
        // stop ability inside the cycle. The stoppable case lives one tier out, in the
        // resolver's timing window (effects/stack.ts), where optional effects exist.
        this.win.declareDraw("effect");
        return;
      }
      this.ruleProcessing = true;
      try {
        // EndGameProcess — any player at a loss condition ⇒ EndGame, then return.
        if (this.ruleChecks.runEndGameProcess()) return;
        // BT26-060 Q7082: peeling a Digimon stack down to a no-DP card trashes the invalid
        // remnant at rule-check timing; a normally played Tamer remains a legal permanent.
        await this.ruleChecks.trashInvalidNoDpStackTops();
        // §17-1-3-2-1 TrashNoDPPermanentProcess — raw DP < 0 ⇒ trash via deletePermanent(byRule).
        await this.ruleChecks.trashNoDpPermanents();
        // §17-1-3-1-1 DigimonLackDPProcess — raw DP == 0 Digimon ⇒ delete via deletePermanent(byRule).
        await this.ruleChecks.deleteZeroDpDigimon();
        // §17-1-3-2-3 TrashNonDigimonPermanentProcess — a non-Digimon/non-DigiEgg card in the
        // breeding slot (a Digi-Egg is NOT a violation — CR §4-2-1 treats it as a Digimon).
        await this.ruleChecks.trashBreedingNonDigimon();
        // §17-1-3-2-4 CardFaceDownProcess — a permanent whose top card is face-down.
        await this.ruleChecks.trashFaceDownTopCards();
        // §17-1-3-2-5 DigimonLackLinkMaxCountProcess — linked cards beyond the effective link
        // limit (only the excess is trashed, not the whole permanent).
        await this.ruleChecks.trashExcessLinkCards();
        // §17-1-3-2-6 / §17-1-3-2-7 — a linked card whose own printed <Link> requirement
        // (names/traits) its live host no longer (or never did) satisfy.
        await this.ruleChecks.trashInvalidLinkedCards();
        // §17-1-3-2-2 — Option cards in the battle area, except Option cards placed there BY
        // AN EFFECT (`Permanent.placedByEffect`). BT7-102's <Delay> Option (placed via
        // primitives.ts' `placeOptionAsPermanent`, which sets the marker) survives this sweep.
        await this.ruleChecks.trashOptionsInBattleArea();
        // "Battle as Tamer" NOT IMPLEMENTED — no such rule was located in Comprehensive Rules
        // Chapter 17 (Rule Checks) or elsewhere. "Tamer cards can't attack" (glossary, CR §4-3)
        // is an attack-DECLARATION legality gate (combat/legality.ts), not a rule-check sweep
        // condition; inventing a deletion/trash behavior for it would not be faithful.
      } finally {
        this.ruleProcessing = false;
      }
    }
    // Even a quiet check establishes the current Link cards as existing cards for the next Link
    // operation, so the markers are kept through this whole fixpoint and retired before its
    // deferred reactions can create a fresh batch of Links. A link is therefore protected only
    // through the rule-check boundary that immediately follows its linking action; sequential
    // later links can replace this card once that boundary has completed.
    this.justLinked.clear();
  }

  /**
   * React, ONCE, to everything the rule-check fixpoint just did: the pooled deletions of
   * every sweep and the watcher events they raised, as a single simultaneous group.
   *
   * §17-1-3 makes rule-check processing simultaneous and §15-4-3-3 makes the effects it
   * triggers simultaneous with each other; §15-4-3-4/-3-5 then have the turn player choose
   * an activation order for their own group and exhaust it before the opponent's. The
   * resolver already implements that ordering for one window, so the pass merges into one
   * window: the deleted sets are unioned (the [On Deletion] gate admits candidates by
   * `deletedInstanceIds`) and the deferred watchers ride along as pending triggers of the
   * same window — the seam `withPendingSubTriggers` uses for every other event. Sweep order
   * therefore stops being observable, which is why the sweeps keep their §17-1-3 order.
   *
   * The window runs through {@link runTimingWindow}: the fixpoint has converged and no card
   * body is on the stack, so the §15-4-4 "wait for the causing effect" deferral has nothing
   * left to wait for. Deletions caused INSIDE this window are ordinary derived triggers and
   * take the normal deferral path again (the pool is already released).
   */
  private async flushRuleTriggerPool(pool: readonly PooledRuleDeletion[]): Promise<void> {
    const watcherEvents = this.deferredRuleSubTriggers.splice(0);
    if (pool.length === 0 && watcherEvents.length === 0) return;
    const armed = watcherEvents.flatMap(({ armed: eventArmed }) => eventArmed);
    const enclosing = this.pendingWindowSubTriggers;
    this.pendingWindowSubTriggers = [...enclosing, ...armed];
    // Raised for both branches below so a watcher this flush resolves is recorded as consumed
    // and the trailing bus fire does not run it twice.
    this.subTriggerWindowDepth += 1;
    try {
      if (pool.length === 0) {
        // No deletion window to fold them into, but they are still one simultaneous group and
        // must be ordered turn-player-first rather than drained in arrival order (§15-4-3-5).
        await this.withTriggeredMutations(() => runSubTriggersInChosenOrder(this, armed));
      } else {
        const merged = mergeRuleDeletions(pool);
        await resolveDeletionReactions(
          this,
          merged.trigger,
          merged.ascensionCandidates,
          (deletionTrigger) =>
            runTimingWindow(this, EffectTiming.OnDestroyedAnyone, deletionTrigger, merged.transientCandidates),
          merged.transientCandidates,
          false,
        );
        // A deletion can have no printed [On Deletion] candidates, in which case the empty
        // timing window never requests its pending watcher collection. The watcher was already
        // armed while its target was live; resolve any it did not consume in that window now.
        await this.withTriggeredMutations(() =>
          runSubTriggersInChosenOrder(
            this,
            armed.filter((item) => !this.consumedSubTriggerKeys.has(subTriggerIdentity(item.sub))),
          ),
        );
      }
    } finally {
      this.pendingWindowSubTriggers = enclosing;
      this.subTriggerWindowDepth -= 1;
    }
    // Whatever the window did not reach still activates, on the bus, under the ordinary
    // ordering rules — the already-consumed watchers are skipped by identity.
    for (const { event, payload } of watcherEvents) await this.fireSubTrigger(event, payload);
    if (this.subTriggerWindowDepth === 0) this.consumedSubTriggerKeys.clear();
  }

  /**
   * The card instances that could contribute an effect at a timing — the union of the
   * zones the source `GetSkillInfos` (documented behavior) scans: each player's field
   * permanents (top card + digivolution stack + linked cards), hand, trash, and
   * face-up security, for BOTH players. The framework's `gatherTriggeredEffects`
   * then applies the per-effect timing/`when`/per-turn-limit filter, so over-listing
   * here is harmless (a card with no effect at the timing contributes nothing).
   */
  listCandidateInstances(): CardInstance[] {
    const out: CardInstance[] = [];
    for (const player of this.state.players) {
      if (player === undefined) continue;
      for (const permanent of player.battleArea) this.collectPermanentInstances(permanent, out);
      if (player.breeding !== undefined) this.collectPermanentInstances(player.breeding, out);
      for (const card of player.hand) out.push(card);
      for (const card of player.trash) out.push(card);
      for (const card of player.security) if (card.faceUp) out.push(card);
      // §9-1-4: a used Option between activation and resolution of its 1st [Main]
      // effect is in NO zone, so it isn't in player.trash above — but its own
      // effect still needs to resolve against it as the source. PlayerState.
      // resolvingOption is exactly that transient, non-zone slot; fold it in here.
      if (player.resolvingOption !== undefined) out.push(player.resolvingOption);
    }
    return out;
  }

  /**
   * Identify the exact effect-source role occupied by an instance. Phase-boundary
   * windows snapshot this value so an instance that was merely present in a stack,
   * linked slot, or loose zone cannot gain a newly available printed effect after it
   * moves during resolution of that same physical boundary.
   */
  candidateSourceLocation(instanceId: string): string | undefined {
    for (const [seat, player] of this.state.players.entries()) {
      if (player === undefined) continue;
      const permanentLocation = (area: "battle" | "breeding", permanent: Permanent): string | undefined => {
        if (permanent.topCard?.instanceId === instanceId) return `${seat}:${area}:${permanent.permanentId}:top`;
        if (permanent.stack.some((card) => card.instanceId === instanceId)) {
          return `${seat}:${area}:${permanent.permanentId}:stack`;
        }
        if (permanent.linked.some((card) => card.instanceId === instanceId)) {
          return `${seat}:${area}:${permanent.permanentId}:linked`;
        }
        return undefined;
      };
      for (const permanent of player.battleArea) {
        const location = permanentLocation("battle", permanent);
        if (location !== undefined) return location;
      }
      if (player.breeding !== undefined) {
        const location = permanentLocation("breeding", player.breeding);
        if (location !== undefined) return location;
      }
      if (player.hand.some((card) => card.instanceId === instanceId)) return `${seat}:hand`;
      if (player.trash.some((card) => card.instanceId === instanceId)) return `${seat}:trash`;
      if (player.security.some((card) => card.instanceId === instanceId && card.faceUp)) return `${seat}:security`;
      if (player.resolvingOption?.instanceId === instanceId) return `${seat}:resolvingOption`;
    }
    return undefined;
  }

  /** Push a permanent's top card, digivolution-stack cards, and linked cards. */
  collectPermanentInstances(permanent: Permanent, out: CardInstance[]): void {
    if (permanent.topCard !== undefined) out.push(permanent.topCard);
    for (const card of permanent.stack) out.push(card);
    for (const card of permanent.linked) out.push(card);
  }

  /** Resolve a set of instance ids to live CardInstances anywhere on the board. */
  instancesById(instanceIds: readonly string[]): CardInstance[] {
    const wanted = new Set(instanceIds);
    return this.listCandidateInstances().filter((c) => wanted.has(c.instanceId));
  }

  /** Allocate a permanentId unique within the match (subsystem: play-card / digivolve). */
  nextPermanentId(): string {
    let candidate: string;
    do {
      this.permanentSeq += 1;
      candidate = `perm-${this.permanentSeq}`;
    } while (this.access.permanentById(candidate) !== undefined);
    return candidate;
  }

  private nextInstanceId(): string {
    let candidate: string;
    do {
      this.instanceSeq += 1;
      candidate = `inst-${this.instanceSeq}`;
    } while (findInstance(this, candidate) !== undefined);
    return candidate;
  }

  /**
   * Bind the security-and-win-check subsystem's `runSecurityCheck` to this match's
   * state and the engine's capabilities (subsystem boundary: combat opens the
   * door, security-and-win-check flips/resolves/declares). The CombatController
   * calls this for a successful, unblocked player-directed attack.
   *
   * The SecurityCheckDeps below are the seams that subsystem declared:
   *   - strikeFor: base 1 plus the attacker's ＜Security Attack +N＞ grants, summed from
   *     continuous.grantedKeywords (the securityAttack IR producer's consuming read).
   *   - fireTiming: the effect stack (OnSecurityCheck / OnLoseSecurity triggers).
   *   - resolveSecurityEffect: runs the flipped card's [Security] effect through the
   *     stack while the checked card has no area (CR 13-1-6), returning true when
   *     an effect activates.
   *   - dpOf / securityCardDp / isDigimon / deletePermanents: backed by the shared
   *     GameStateAccess + card data, identical to combat's own reads.
   */
  /**
   * Non-zero while `runSecurityCheck` is resolving. Effects triggered inside the check
   * announce themselves before the closing `securityChecked` event, so their
   * `effectTriggered` is stamped `duringSecurityCheck` for the client to hold.
   */
  securityCheckDepth = 0;

  /**
   * CR §4-19 Arts Digivolve: after a DUAL card's Option side finishes resolving, one of
   * the controller's own permanents MAY digivolve into it for free instead of the
   * pending trash (§4-19-2: overwrite processing that replaces the trash step).
   * §4-19-1 says "one of your cards on the field may digivolve into that DUAL card
   * without paying the cost" — the COST is waived, not the digivolution REQUIREMENT
   * (mirrors the same "cost-free effect-digivolve" reading `digivolveFromInstance`
   * already applies elsewhere), so eligibility is exactly the normal EvoCost/alternate
   * digivolution-requirement match. When no permanent qualifies, no decision is even
   * raised (there's nothing to offer, so the pending trash proceeds untouched).
   */
  private readonly declinedAttackArts = new Set<string>();

  /**
   * A permanent's EFFECTIVE color set (static-continuous-effects subsystem, LOCKED Q4): its
   * top card's printed colors UNIONED with every continuously-derived color grant
   * layering (BaseCardColors then each active color-grant appends, then Distinct;
   * documented behavior). Server-authoritative: the set is recomputed by the engine layering
   * pass, never supplied by a client. The color-legality consumers (this play-time gate and
   * the digivolve EvoCost color check) read this instead of the printed colors. An empty
   * top card yields no colors.
   */
  effectiveColorsOf(permanent: Permanent): CardColor[] {
    const top = permanent.topCard;
    if (top === undefined) return [];
    return effectiveColors(this.continuous, permanent.permanentId, colorsOf(top.cardId)) as CardColor[];
  }

  /**
   * A permanent's EFFECTIVE link limit:
   * the base 1 plus the sum of every active `<Link +N>` grant keyed to this permanent in
   * the continuous-effect ledger. Server-authoritative — `runLink` and the rule sweep read
   * this to cap how many link cards a Digimon may hold; a client never supplies the cap.
   */
  linkMaxOf(permanent: Permanent): number {
    return linkMax(permanent, { linkMaxDelta: (id) => this.continuous.linkMaxDelta(id) });
  }

  /**
   * Attach a connected client to a seat and stage their decklist. A placeholder
   * PlayerState (name + session, empty zones) is seated immediately so the room can
   * build this seat's StateView on join; the real zones (deck/egg/hand/security) are
   * materialized from the staged decklist by {@link startMatch} when both seats are
   * present and setup runs.
   *
   * The client deck is attacker-controlled, so it is validated against the
   * deck-construction rules (50 main + ≤5 eggs, per-card copy limits, banlist
   * single-card restrictions) BEFORE anything is staged. An illegal deck throws,
   * which propagates out of {@link AegisRoom.onJoin} as a Colyseus seat rejection;
   * neither {@link PlayerState} nor the staged decklist is created for the seat.
   *
   * A fully-empty deck (`mainDeck` and `eggDeck` both empty) is the headless
   * board-setup sentinel used by engine unit tests that hand-build the board and
   * never run {@link startMatch}; it bypasses validation. A real client join always
   * sends a populated deck, and the 50-card size rule rejects an empty deck for
   * actual play, so this sentinel cannot seat a playable illegal deck.
   */
  seatPlayer(seat: Seat, sessionId: string, options: SeatJoinOptions): void {
    const deckIsEmpty = options.deck.mainDeck.length === 0 && options.deck.eggDeck.length === 0;
    if (!deckIsEmpty) {
      const verdict = validateDecklist(options.deck, { betaBattleMode: options.betaBattleMode === true });
      if (!verdict.ok) throw new Error(`illegal deck: ${verdict.reason}`);
    }
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = sessionId;
    player.displayName = options.displayName;
    this.state.players[seat] = player;
    this.stagedDecks[seat] = options.deck;
    // Seating replaces the PlayerState object, so the port has to be re-installed on the new
    // one; installing it here (rather than at match start) also covers the cards `runSetup`
    // deals, which arrive before any turn is played.
    if (this.visibilityNotify !== undefined) installVisibilityPort(player, this.visibilityNotify);
  }

  /** Readiness belongs to the current occupant, not permanently to a seat. */
  clearReady(seat: Seat): void {
    if (!this.bothReadyFired) this.readySeats.delete(seat);
  }

  /**
   * Begin the match once both seats are filled (subsystem: deck-and-setup). Runs the
   * official pre-game procedure (Comprehensive Rules §5-2) and then starts the turn
   * loop:
   *
   *   1. choose the first player deterministically from the match seed (stands in for
   *      §5-2-1-3 rock-paper-scissors until a coin-toss intent flow is added),
   *   2. {@link runSetup}: build both players' zones from their decklists, shuffle
   *      deck + egg deck (seeded), deal 5-card opening hands, memory := 0, record the
   *      first player (§5-2-1-1/2/4/7),
   *   3. emit `matchStarted`,
   *   4. open the mulligan window for each seat, first player first (§5-2-1-4/5):
   *      a redraw reshuffles the hand back and draws 5 again, on the SAME seeded
   *      stream,
   *   5. {@link finalizeSecurity}: set each seat's 5-card face-down security stack
   *      from the post-mulligan deck top (§5-2-1-6),
   *   6. start the turn loop at turn 1 with the first player (§5-2-1-8); the
   *      first player's first Draw is skipped by the turn machine.
   *
   * Async (the mulligan window awaits client input); fire-and-forget from the room.
   */
  startMatch(): void {
    this.matchSetupStarted = true;
    void this.runMatch();
  }

  private async runMatch(): Promise<void> {
    const decks = this.collectStagedDecks();
    if (decks === undefined) return; // a seat joined without a deck; cannot start

    const firstSeat = this.chooseFirstPlayer();
    const setup = runSetup(this.state, {
      seats: [
        {
          sessionId: this.state.players[0]!.sessionId,
          displayName: this.state.players[0]!.displayName,
          deck: decks[0],
        },
        {
          sessionId: this.state.players[1]!.sessionId,
          displayName: this.state.players[1]!.displayName,
          deck: decks[1],
        },
      ],
      firstSeat,
      seed: this.hooks.seed,
      onShuffled: (seat, deck) => this.hooks.emit({ kind: "deckShuffled", seat, deck }),
    });
    this.rngForSeat = setup.rngForSeat;

    this.hooks.emit({ kind: "matchStarted", firstSeat });

    await this.runMulliganWindow(firstSeat);
    if (this.state.gameOver) return; // a seat left during setup

    finalizeSecurity(this.state);

    void this.startTurnLoop();
  }

  /**
   * Development-only alternative to {@link startMatch}: skip the pre-game procedure, lay a
   * hand-built board for the named scenario, and start the real turn loop on it. The room only
   * exposes this outside production.
   */
  startDevScenario(scenario: DevScenarioId): void {
    const decks = this.collectStagedDecks();
    if (decks === undefined) return;
    this.matchSetupStarted = true;
    layDevScenario(scenario, this.state, decks);
    this.hooks.emit({ kind: "matchStarted", firstSeat: this.state.turnSeat });
    void this.startTurnLoop();
  }

  /** Gather both staged decklists; undefined if either seat has not staged one. */
  private collectStagedDecks(): [Decklist, Decklist] | undefined {
    const a = this.stagedDecks[0];
    const b = this.stagedDecks[1];
    if (a === undefined || b === undefined) return undefined;
    return [a, b];
  }

  /**
   * Decide the first player. The rulebook uses rock-paper-scissors (§5-2-1-3); since
   * Aegis has no such intent yet, the choice is derived deterministically from the
   * server-only match seed so a given seed always yields the same first player (and
   * tests are reproducible). Replace with the coin-toss intent flow when added.
   */
  private chooseFirstPlayer(): Seat {
    return ((this.hooks.seed & 1) === 0 ? 0 : 1) as Seat;
  }

  /**
   * Run the mulligan window for both seats in turn order (first player first,
   * §5-2-1-4). Each seat is prompted via the MulliganCoordinator and answers with a
   * `mulligan` intent; a redraw is applied on the seat's own seeded PRNG stream.
   */
  private async runMulliganWindow(firstSeat: Seat): Promise<void> {
    const order: Seat[] = [firstSeat, (1 - firstSeat) as Seat];
    for (const seat of order) {
      if (this.state.gameOver) return;
      const keep = await this.mulligan.request(seat);
      if (!keep && this.rngForSeat !== undefined) {
        const player = this.state.players[seat];
        if (player !== undefined) {
          mulliganRedraw(player, this.rngForSeat(seat), (deck) =>
            this.hooks.emit({ kind: "deckShuffled", seat, deck }),
          );
        }
      }
    }
  }

  /**
   * Drive the full turn loop to completion (subsystem: turn-phase-state-machine).
   * Async and fire-and-forget from the caller's perspective; surfaces a fatal engine
   * error to the room rather than letting the promise reject silently.
   */
  async startTurnLoop(): Promise<void> {
    try {
      await this.turnMachine.run();
    } catch (err) {
      logError("[engine] turn loop fatal error:", err);
      this.hooks.emit({
        kind: "actionRejected",
        intent: "turnLoop",
        reason: err instanceof Error ? err.message : "turn-loop-error",
      });
    }
  }

  /**
   * Drive exactly ONE turn (Active -> Draw -> Breeding -> Main -> End) through the real
   * turn machine and its real timing wiring. Test-only seam: it is a thin pass-through
   * to `turnMachine.runTurn()` (no new game logic) so a harness can open the OnStartTurn
   * / OnEndTurn windows — which fire effects through the real `fireTiming` — without
   * spinning up the full `run()` loop (whose interactive Main phase blocks on client
   * verbs). The Main phase still blocks until the turn player sends an `endPhase` intent
   * (MainPhaseController), so the caller awaits this promise while feeding that intent.
   *
   * This exists because two turn-window effects (Start-of-Your-Turn SetMemory, the
   * end-of-turn timings) are only reachable through the loop; the hand-laid intent
   * harness has no beginTurn intent. Mirrors the `startTurnLoop` pattern (it likewise
   * delegates straight to the turn machine). NOT part of the production intent surface.
   */
  async runOneTurn(): Promise<void> {
    await this.turnMachine.runTurn();
  }

  /**
   * Build the per-seat filtered view of state (hidden zones redacted).
   *
   * The secret PlayerState zones carry @view(PRIVATE_VIEW_TAG); buildStateView
   * unlocks only THIS seat's own private zones, so the opponent never receives the
   * card identities in your deck, egg deck, hand, or face-down security. The public
   * board (battle areas, breeding, trash, memory, phase) and the per-zone count
   * mirrors stay visible to both. See engine/state/visibility.ts.
   *
   * syncPublicCounts is called first so the public counts reflect the current zone
   * sizes at the moment a client joins / its view is (re)built. The per-state-patch
   * refresh of those counts is the room/turn-loop's responsibility (it must call
   * syncPublicCounts before each broadcast); that hook is owned by the
   * intent-protocol-and-room subsystem.
   */
  makeStateView(seat: Seat): Client["view"] {
    syncPublicCounts(this.state);
    return buildStateView(this.state, seat);
  }

  /**
   * Bring an EXISTING per-seat StateView up to date in place, instead of replacing
   * it. The room MUST use this (not `makeStateView`) for every mid-match refresh —
   * see `engine/state/visibility.ts`'s `refreshStateView` for why replacing a
   * connected client's view wholesale silently strands the removal of any card
   * that just left a `@view`-tagged zone (e.g. a card played from hand), and
   * `AegisRoom.rebuildClientViews` for the call site this backs.
   */
  refreshStateView(view: Client["view"], seat: Seat): void {
    if (view === undefined) return;
    syncPublicCounts(this.state);
    refreshStateViewInto(view, this.state, seat);
  }

  /** Set once by the room; re-applied to each PlayerState as seats are filled. */
  private visibilityNotify?: VisibilityPort;

  /**
   * Install the mutation seam's visibility port for both seats. `notify` is called once per
   * card arrival in a loose zone; the room turns that into an `exposeCardInZone` per connected
   * client. Idempotent — installing again simply replaces the callback.
   *
   * Without this the private zones are never exposed mid-match (the per-patch full walk that
   * used to do it was removed: it re-queued a forced ADD for every field of every card on
   * every patch, so each patch carried the whole state).
   */
  installVisibility(notify: VisibilityPort): void {
    this.visibilityNotify = notify;
    for (const player of this.state.players) installVisibilityPort(player, notify);
  }

  /**
   * Apply one card arrival to one client's view. Thin pass-through to the visibility policy
   * so the room stays free of StateView details, mirroring `refreshStateView` above.
   */
  exposeCardToView(
    view: Client["view"],
    viewerSeat: Seat,
    ownerSeat: Seat,
    zone: VisibilityZone,
    card: CardInstance,
  ): void {
    if (view === undefined) return;
    exposeCardInZone(view, viewerSeat, ownerSeat, zone, card);
  }

  /**
   * Refresh the public per-zone count mirrors from the (hidden) zone arrays so the
   * opponent's view shows correct deck/hand/security sizes (subsystem:
   * intent-protocol-and-room). The room calls this from `onBeforePatch`, i.e. before
   * every state broadcast, which is the documented owner of this refresh (the private
   * arrays are redacted per-seat, so only these counts convey their sizes).
   */
  syncCounts(): void {
    syncPublicCounts(this.state);
  }

  /**
   * Validate and apply one player intent. The engine's main entry point from the room;
   * {@link applyIntent} holds the router and the per-verb handlers.
   */
  applyIntent(seat: Seat, intent: Intent): IntentResult {
    return applyIntent(this, seat, intent);
  }

  /**
   * The three fire seams tests reach through an `as unknown as` cast. Their bodies live in
   * {@link ./gameEngine/timing.ts}; these keep the shape those casts name so the harness has
   * one route to the production window instead of 86 hand-written ones.
   */
  fireSubTrigger(
    event: SubTriggerEventName,
    payload: TriggerInfo = {},
    sourceScope?: SubTriggerSourceScope,
  ): Promise<void> {
    return fireSubTrigger(this, event, payload, sourceScope);
  }

  fireTiming(
    timing: EffectTiming,
    trigger: TriggerInfo = {},
    transientCandidates: readonly CardInstance[] = [],
  ): Promise<void> {
    return fireTiming(this, timing, trigger, transientCandidates);
  }

  fireTimingForInstance(
    timing: EffectTiming,
    sourceInstanceId: string,
    trigger: TriggerInfo = {},
    extraPending: readonly CollectedEffect[] = [],
  ): Promise<void> {
    return fireTimingForInstance(this, timing, sourceInstanceId, trigger, extraPending);
  }

  reactivateOnPlay(
    permanentId: string,
    opts?: { timings?: EffectTiming[]; chooseOne?: boolean; outsideTriggerWindow?: boolean },
  ): Promise<boolean> {
    return reactivateOnPlay(this, permanentId, opts);
  }

  /** Public legality signal used by clients/tests to know the confirmed Blitz window is ready. */
  hasAcceptedBlitzAttack(permanentId: string): boolean {
    return this.acceptedBlitzAttackers.has(permanentId);
  }

  /**
   * Handle a seat disconnecting. `handleDisconnect` marks PlayerState.connected =
   * false; on a consented drop (or once the grace period elapses) the caller
   * resolves the match as a surrender. The grace-period clock lives in
   * `AegisRoom.onLeave` via Colyseus's `allowReconnection`.
   */
  /**
   * Close an unanswered combat prompt at its safe default (the room's answer-timeout
   * backstop). Returns whether a window was open to close.
   */
  expireCombatWindow(): boolean {
    return this.combat.expireOpenWindow();
  }

  handleReconnect(seat: Seat): void {
    const player = this.state.players[seat];
    if (player !== undefined) player.connected = true;
  }

  handleDisconnect(seat: Seat, consented: boolean): void {
    const player = this.state.players[seat];
    if (player !== undefined) player.connected = false;

    // A consented leave during an active match is a concession: the opponent wins
    // immediately. Phase.None means the match hasn't started yet (still in
    // setup/mulligan), so a pre-game disconnect is not a surrender — just clean up.
    if (consented && !this.state.gameOver && (this.state.phase !== Phase.None || this.matchSetupStarted)) {
      this.win.surrender(seat);
      this.decisions.cancel();
      this.mulligan.cancel();
      this.mainPhase.abort();
      this.breeding.abort();
      return;
    }
    if (consented && !this.state.gameOver && this.state.phase === Phase.None) {
      this.mulligan.cancel();
      return;
    }
    // A non-consented drop just marks the seat disconnected here; the reconnection
    // grace period and its clock are owned by AegisRoom.onLeave (Colyseus
    // allowReconnection), which calls handleDisconnect(seat, true) if the grace
    // period elapses without a reconnect.
  }
}
