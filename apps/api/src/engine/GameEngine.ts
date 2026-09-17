import { ContinuousEffectScope } from "./effects/ContinuousEffectScope.js";
import { CardKind, EffectTiming, GameState, EffectDuration, type CardInstance, type Seat } from "@aegis/shared";
import type { CardColor, Permanent } from "@aegis/shared";
import type { Client } from "colyseus";
import type { DevScenarioId } from "./devScenario.js";
import type { VisibilityZone } from "./state/access.js";
import {
  chooseFirstPlayer,
  clearReady,
  collectStagedDecks,
  effectiveColorsOf,
  expireCombatWindow,
  exposeCardToView,
  handleDisconnect,
  handleReconnect,
  installVisibility,
  linkMaxOf,
  makeStateView,
  refreshStateView,
  runMatch,
  runMulliganWindow,
  runOneTurn,
  seatPlayer,
  startDevScenario,
  startMatch,
  startTurnLoop,
  syncCounts,
} from "./gameEngine/matchLifecycle.js";
import { recomputeContinuousEffects, runContinuousPass } from "./gameEngine/continuousPass.js";
import type { RemovalCause } from "./effects/EffectContext.js";
import type { Intent, IntentResult } from "@aegis/shared";
import { MemoryGauge } from "./MemoryGauge.js";
import type { VisibilityPort } from "./state/access.js";
import { GameStateAccess, markRoutedUsedOption } from "./state/access.js";
import { CombatController } from "./combat/controller.js";
import { printedKeywordsOf, resolveKeywords } from "./combat/keywords.js";
import { WinCheck } from "./security/index.js";
import { SecurityDpLedger } from "./security/securityDp.js";
import { DeletionMaxDpLedger } from "./deletionMaxDp.js";
import { DpDeleteBudgetLedger } from "./dpDeleteBudget.js";
import { lookupDefinition, isDigimon } from "./cards/cardData.js";
import { DecisionManager } from "./decisions/index.js";
import { createDecisionApi } from "./decisions/decisionApi.js";
import { createResolverDecisions, type ResolverDecisions } from "./decisions/resolverDecisions.js";
import { MainPhaseController } from "./MainPhaseController.js";
import { BreedingPhaseController } from "./BreedingPhaseController.js";
import { createPrimitives, ModifierLedger } from "./effects/primitives.js";
import { ContinuousEffectLedger } from "./effects/continuous.js";
import { SubTriggerRegistry, type SubTriggerSubscription } from "./effects/subtriggers.js";
import { type CardStateLookup } from "./cards/CardSource.js";
import { UseTracker } from "./effects/kernel.js";
import { buildResolutionEnv } from "./effects/index.js";
import { effectsOf } from "./effects/collect.js";
import { resolveSelfWhenTrashedFromDeck } from "./effects/interpreter.js";
import type { CardSource } from "./effects/CardSource.js";
import type { CollectedEffect } from "./effects/collect.js";
import type {
  EffectContext,
  GameAccess,
  Primitives,
  DecisionApi,
  TriggerInfo,
  SubTriggerEventName,
  SubTriggerSourceScope,
} from "./effects/EffectContext.js";
import { TurnStateMachine } from "./TurnStateMachine.js";
import { type Rng, type Decklist } from "./setup.js";
import { MulliganCoordinator } from "./mulligan.js";
import { mergeRuleDeletions, type PooledRuleDeletion } from "./gameEngine/ruleDeletions.js";
import { DigivolveSupport } from "./gameEngine/digivolveSupport.js";
import { BoardProjection } from "./gameEngine/projections.js";
import { RuleChecks } from "./gameEngine/ruleChecks.js";
import { securityStrikeCount } from "./gameEngine/securityStrike.js";
import { type ArmedSubTrigger } from "./gameEngine/subTriggerIdentity.js";
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
} from "./gameEngine/timing.js";
import {
  fireSubTrigger,
  prepareFrozenSubTrigger,
  prepareSubTrigger,
  withPendingSubTriggers,
} from "./gameEngine/subTriggers.js";
import {
  collectRuleProcessMovements,
  flushRuleTriggerPool,
  listCandidateInstances,
  nextInstanceId,
  nextPermanentId,
} from "./gameEngine/ruleProcess.js";
import { inContinuousPass, settleBetweenEffects } from "./gameEngine/windows.js";
import {
  buildEffectContext,
  cardSourceOf,
  dropPermanentSubscriptions,
  effectEnvironment,
  forgetUsesOfCardsLeavingField,
} from "./gameEngine/effectContext.js";
import { engineConsultDigivolutionTrashRedirect, engineConsultLeavePrevention } from "./gameEngine/effectContext.js";
import {
  beginBattleScope,
  endBattleScope,
  sweepBattleDurations,
  sweepCombatDurations,
  unsuspendAllForSeat,
  unsuspendForActivePhase,
} from "./gameEngine/turnFlow.js";

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
  readonly turnMachine: TurnStateMachine;
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
  windowTokenSeq = 0;
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
  readonly ruleChecks: RuleChecks;
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
  matchSetupStarted = false;
  /** Guards {@link GameEngineHooks.onBothReady} against firing more than once. */
  bothReadyFired = false;
  /** The opening-hand mulligan window (subsystem: deck-and-setup). */
  readonly mulligan: MulliganCoordinator;
  /** Decklists staged at seatPlayer, consumed by startMatch (index === seat). */
  readonly stagedDecks: (Decklist | undefined)[] = [undefined, undefined];
  /** Per-seat shuffle PRNG produced by setup (so a mulligan reshuffles deterministically). */
  rngForSeat: ((seat: Seat) => Rng) | undefined;
  /** Monotonic source of permanentIds unique within the match. */
  permanentSeq = 0;
  /** Shared completion barrier for the current continuous recompute batch. */
  recomputeInFlight: Promise<void> | undefined;
  /** Coalesces external recompute requests that arrive while a pass is rebuilding the ledgers. */
  recomputeQueued = false;

  /**
   * Cards linked since the last over-limit rule check (fed by the link verb through
   * `PrimitivesEngine.noteLinked`). Comprehensive Rules §4-9-5 trashes EXISTING link cards
   * "at the same time as the newly linked cards", so {@link chooseExcessLinkCards} keeps
   * these out of the candidate pool. Cleared after every completed rule-check fixpoint,
   * including quiet checks with no excess.
   */
  readonly justLinked = new Set<string>();
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
  readonly continuousScope = new ContinuousEffectScope();

  /** Trigger payload for the timing window currently resolving. */
  /** Transient security-DP modifiers during an active security check. */
  readonly securityDp = new SecurityDpLedger((seat, delta) => {
    const player = this.state.players[seat];
    if (player) player.securityDpDelta = delta;
  });
  battleScopeSequence = 0;
  /** Continuous DP-based-deletion maximum bonuses (rebuilt each continuous recompute). */
  readonly deletionMaxDp = new DeletionMaxDpLedger();
  /** Continuous DP-based-deletion BUDGET bonuses (BT19-011's inherited modifier; rebuilt each continuous recompute). */
  readonly dpDeleteBudget = new DpDeleteBudgetLedger();
  /** Monotonic source of instanceIds for token spawn. */
  instanceSeq = 0;

  constructor(
    readonly state: GameState,
    readonly hooks: GameEngineHooks,
  ) {
    // Every zone move is narrated through `hooks.emit`: the one place that sees a card leave
    // the field. Wrapped before the collaborators below capture `this.hooks.emit` by value.
    this.hooks = {
      ...hooks,
      emit: (event) => {
        forgetUsesOfCardsLeavingField(this, event);
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
      cardSourceOf: (instance) => cardSourceOf(this, instance),
      buildEffectContext: (source, trigger) => buildEffectContext(this, source, trigger),
      effectiveColorsOf: (permanent) => effectiveColorsOf(this, permanent),
      collectRuleProcessMovements: () => collectRuleProcessMovements(this),
      flushRuleTriggerPool: (pool) => flushRuleTriggerPool(this, pool),
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
      effectEnvironment: (trigger) => effectEnvironment(this, trigger),
      buildEffectContext: (source, trigger) => buildEffectContext(this, source, trigger),
      isNewlyPlayedRushAttacker: (permanentId) => isNewlyPlayedRushAttacker(this, permanentId),
      listCandidateInstances: () => listCandidateInstances(this),
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
      linkMaxOf: (permanent) => linkMaxOf(this, permanent),
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
          source: cardSourceOf(this, top),
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
        const attackEnvironment = buildResolutionEnv(effectEnvironment(this, attackPayload), resolutionDeps(this));
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
        return permanent === undefined ? [] : effectiveColorsOf(this, permanent);
      },
      consultLeavePrevention: async (permanentIds, opts) =>
        this.consultLeavePrevention(permanentIds, "byBattle", undefined, opts),
      dropPermanentSubscriptions: (permanentId) => dropPermanentSubscriptions(this, permanentId),
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
      sweepEndOfAttack: () => sweepCombatDurations(this),
      beginBattleScope: () => beginBattleScope(this),
      sweepEndOfBattle: (scopeId) => sweepBattleDurations(this, scopeId),
      endBattleScope: (scopeId) => endBattleScope(this, scopeId),
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
          (card) => effectsOf(EffectTiming.OnUseAttack, cardSourceOf(this, card)).length > 0,
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
          await settleBetweenEffects(this);
          await drain();
        } finally {
          this.effectResolutionDepth = pausedDepth;
        }
      },
      baseGrantedDigivolve: (seat, base, evolving, sourceZone) =>
        this.digivolveSupport.matchBaseGrantedDigivolve(seat, base, evolving, sourceZone),
      emit: (event) => this.hooks.emit(event),
      inSecurityCheck: () => this.securityCheckDepth > 0,
      nextPermanentId: () => nextPermanentId(this),
      nextInstanceId: () => nextInstanceId(this),
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
          const pool = await collectRuleProcessMovements(this);
          if (!this.state.gameOver) await flushRuleTriggerPool(this, pool);
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
          buildEffectContext(this, cardSourceOf(this, instance), {
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
      consultDigivolutionTrashRedirect: (ids) => engineConsultDigivolutionTrashRedirect(this, ids),
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
      inContinuousPass: () => inContinuousPass(this),
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
  gameAccess: GameAccess | undefined;

  /**
   * The primitive verbs handed to an effect, one cached object per owning seat.
   *
   * Only `gainMemory` varies with the source's owner, and a seat is 0 or 1, so the spread of the
   * whole primitives object — previously redone on every context build — collapses to two.
   */
  readonly primitivesBySeat: (Primitives | undefined)[] = [];

  /**
   * The state lookup a CardSource delegates its placement/turn questions to.
   *
   * Built once per state rather than once per call: it closes over nothing but `this.state`,
   * and `cardSourceOf` runs for every candidate instance on every continuous recompute — several
   * times per player action — so rebuilding its closure set was pure allocation churn.
   */
  cardStateLookup: CardStateLookup | undefined;

  /**
   * CardSource is a value object over an instance's immutable identity (instanceId, cardId,
   * ownerSeat) whose placement queries are lazy closures, so one per instance stays correct for
   * the instance's whole life. Keyed weakly on the instance itself: an instance that leaves the
   * match takes its entry with it. `cardId`/`ownerSeat` are only ever assigned while building a
   * fresh instance (setup.ts, primitives' token creation), never re-assigned on a live one.
   */
  readonly cardSourceByInstance = new WeakMap<CardInstance, CardSource>();

  /** Guards each immediate prevention from reactivating during its own resolution. */
  preventReentryGuard = { activeReplacementKeys: new Set<string>() };

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

  /** Set once by the room; re-applied to each PlayerState as seats are filled. */
  visibilityNotify?: VisibilityPort;

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
  /**
   * The two context seams ~90 card tests and the testkit reach by name. Their bodies live
   * in {@link ./gameEngine/effectContext.ts}; these keep the shape those call sites name.
   */
  cardSourceOf(instance: CardInstance): CardSource {
    return cardSourceOf(this, instance);
  }

  buildEffectContext(source: CardSource, trigger: TriggerInfo, askOverride?: DecisionApi): EffectContext {
    return buildEffectContext(this, source, trigger, askOverride);
  }

  /**
   * Leave prevention, consulted before any removal. Kept as a method because
   * ex7VolcanicdramonMechanism replaces it on the instance to force a prevented material;
   * a module-to-module call would walk past the replacement.
   */
  consultLeavePrevention(
    permanentIds: string[],
    cause: RemovalCause = "byEffect",
    resolvingSeat?: Seat,
    opts?: { isBounce?: boolean; insteadOnly?: boolean; playerAction?: boolean; isDigiXros?: boolean },
  ): Promise<Set<string>> {
    return engineConsultLeavePrevention(this, permanentIds, cause, resolvingSeat, opts);
  }

  /**
   * The two unsuspend sweeps opponentTurnFrequency and whenUnsuspended wrap on the instance
   * to record which seam each ＜Reboot＞ / Active-phase fire came from.
   */
  unsuspendForActivePhase(seat: Seat): Promise<string[]> {
    return unsuspendForActivePhase(this, seat);
  }

  unsuspendAllForSeat(seat: Seat): Promise<string[]> {
    return unsuspendAllForSeat(this, seat);
  }

  /**
   * Rebuild every continuous effect. Public: the room, the testkit and 500-odd tests await it
   * between steps, and st312SecurityRecompute drives it directly. {@link runContinuousPass}
   * keeps a method too -- tests replace it on the instance to count passes.
   */
  recomputeContinuousEffects(): Promise<void> {
    return recomputeContinuousEffects(this);
  }

  runContinuousPass(noPromptAsk: DecisionApi, seed: ReadonlyMap<string, number> = new Map()): Promise<void> {
    return runContinuousPass(this, noPromptAsk, seed);
  }

  /**
   * The match-lifecycle and view surface the room drives. Bodies in
   * {@link ./gameEngine/matchLifecycle.ts}; these are the public API the room and the
   * tests call, so the class keeps their names and shapes.
   */
  seatPlayer(seat: Seat, sessionId: string, options: SeatJoinOptions): void {
    return seatPlayer(this, seat, sessionId, options);
  }

  clearReady(seat: Seat): void {
    return clearReady(this, seat);
  }

  startMatch(): void {
    return startMatch(this);
  }

  runMatch(): Promise<void> {
    return runMatch(this);
  }

  startDevScenario(scenario: DevScenarioId): void {
    return startDevScenario(this, scenario);
  }

  collectStagedDecks(): [Decklist, Decklist] | undefined {
    return collectStagedDecks(this);
  }

  chooseFirstPlayer(): Seat {
    return chooseFirstPlayer(this);
  }

  runMulliganWindow(firstSeat: Seat): Promise<void> {
    return runMulliganWindow(this, firstSeat);
  }

  startTurnLoop(): Promise<void> {
    return startTurnLoop(this);
  }

  runOneTurn(): Promise<void> {
    return runOneTurn(this);
  }

  makeStateView(seat: Seat): Client["view"] {
    return makeStateView(this, seat);
  }

  refreshStateView(view: Client["view"], seat: Seat): void {
    return refreshStateView(this, view, seat);
  }

  installVisibility(notify: VisibilityPort): void {
    return installVisibility(this, notify);
  }

  exposeCardToView(
    view: Client["view"],
    viewerSeat: Seat,
    ownerSeat: Seat,
    zone: VisibilityZone,
    card: CardInstance,
  ): void {
    return exposeCardToView(this, view, viewerSeat, ownerSeat, zone, card);
  }

  syncCounts(): void {
    return syncCounts(this);
  }

  handleReconnect(seat: Seat): void {
    return handleReconnect(this, seat);
  }

  handleDisconnect(seat: Seat, consented: boolean): void {
    return handleDisconnect(this, seat, consented);
  }

  expireCombatWindow(): boolean {
    return expireCombatWindow(this);
  }

  effectiveColorsOf(permanent: Permanent): CardColor[] {
    return effectiveColorsOf(this, permanent);
  }

  linkMaxOf(permanent: Permanent): number {
    return linkMaxOf(this, permanent);
  }

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
}
