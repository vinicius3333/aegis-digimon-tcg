import { AsyncLocalStorage } from "node:async_hooks";
import type { Client } from "colyseus";
import {
  CardKind,
  GameState,
  PlayerState,
  EffectTiming,
  EffectDuration,
  Phase,
  Permanent,
  type CardColor,
  type CardDefinition,
  type CardInstance,
  type Intent,
  type IntentResult,
  type DecisionRequest,
  Zone,
  type RejectReason,
  type ServerEvent,
  type Seat,
  type ZoneRef,
  type DigivolutionRequirement,
  type BaseGrantedDigivolve,
  baseGrantedDigivolveFor,
  digiXrosRequirementFor,
  assemblyRequirementFor,
} from "@aegis/shared";
import { MemoryGauge } from "./MemoryGauge.js";
import {
  buildStateView,
  exposeCardInZone,
  refreshStateView as refreshStateViewInto,
  syncPublicCounts,
} from "./state/visibility.js";
import { installVisibilityPort, type VisibilityZone, type VisibilityPort } from "./state/access.js";
import { GameStateAccess, insertCard, setTopCard, takeTop } from "./state/access.js";
import { CombatController } from "./combat/controller.js";
import { detachableLinkedCards, detachLinkedCard, detachTraitTokens } from "./effects/detach.js";
import { canAttackerDeclare, hasSummoningSickness } from "./combat/legality.js";
import { rollTurnActivity } from "./turnActivity.js";
import { resolveKeywords } from "./combat/keywords.js";
import { WinCheck, runSecurityCheck, type SecurityCheckDeps, type SecurityCheckReason } from "./security/index.js";
import { SecurityDpLedger } from "./security/securityDp.js";
import { DeletionMaxDpLedger } from "./deletionMaxDp.js";
import { DpDeleteBudgetLedger } from "./dpDeleteBudget.js";
import {
  lookupDefinition,
  definitionOf,
  colorsOf,
  cardHasTrait,
  isDigimon,
  isOption,
  isTamer,
  canDigivolveOntoWithAlternates,
  intrinsicDigivolutionCostReduction,
} from "./cards/cardData.js";
import { DecisionManager } from "./decisions/index.js";
import { createDecisionApi } from "./decisions/decisionApi.js";
import { createResolverDecisions, type ResolverDecisions } from "./decisions/resolverDecisions.js";
import { MainPhaseController } from "./MainPhaseController.js";
import { BreedingPhaseController } from "./BreedingPhaseController.js";
import {
  handleReady,
  handleSurrender,
  handleEndPhase,
  handleRespondDecision,
  type IntentRouterDeps,
} from "./intentRouter.js";
import {
  validateActivateEffect,
  applyActivateEffect,
  ACTIVATE_TIMING,
  type ActivateEffectIntent,
  type ActivateEffectDeps,
} from "./actions/activateEffect.js";
import {
  createPrimitives,
  ModifierLedger,
  dnaDigivolveCostFor,
  rootZoneOfLooseInstance,
} from "./effects/primitives.js";
import {
  ContinuousEffectLedger,
  effectiveColors,
  effectiveKinds,
  effectiveNames,
  effectiveTraits,
} from "./effects/continuous.js";
import { linkMax } from "./effects/mindLink.js";
import { SubTriggerRegistry, type SubTriggerSubscription, type SubTriggerTurnLedger } from "./effects/subtriggers.js";
import { consultLeavePrevention } from "./effects/leavePrevention.js";
import { consultDigivolutionTrashRedirect } from "./effects/digivolutionTrashRedirect.js";
import {
  createGameAccess,
  createCardStateLookup,
  createEffectContext,
  gatherTriggeredEffects,
} from "./effects/context.js";
import { ArraySchema } from "@colyseus/schema";
import { createCardSource, type CardStateLookup } from "./cards/CardSource.js";
import { digisorptionAmountFor, isDigisorptionRedirector } from "./cards/digisorptionDigivolve.js";
import { tamerOntoDigivolveLevel } from "./cards/tamerOntoDigivolve.js";
import { UseTracker, canActivate, canTrigger } from "./effects/kernel.js";
import { runTiming, type EffectEnvironment, type ResolutionDeps } from "./effects/index.js";
import { collectConferredEffects, collectGrantedCustomEffects, effectsOf } from "./effects/collect.js";
import {
  applyWouldBePlayedSelfReducer,
  applyWouldDigivolveSelfReducer,
  potentialWouldBePlayedSelfReduction,
  wouldBePlayedSelfReducersFor,
  wouldDigivolveSelfReducersFor,
  potentialWouldDigivolveSelfReduction,
  matchNameOrTrait,
  hasBlastDigivolveKeyword,
  grantedTokenEffectsForTiming,
  resolveSelfWhenTrashedFromDeck,
  digiXrosOnlyNameAliasesFor,
  universalNameAliasesFor,
} from "./effects/interpreter.js";
import type { CardSource } from "./effects/CardSource.js";
import type { Effect } from "./effects/Effect.js";
import type { CollectedEffect } from "./effects/collect.js";
import type {
  DiscardedStackSourceProof,
  EffectContext,
  GameAccess,
  Primitives,
  DecisionApi,
  TriggerInfo,
  RemovalCause,
  SubTriggerEventName,
} from "./effects/EffectContext.js";
import { TurnStateMachine, type TurnFlowHooks, type DurationBoundary as TurnBoundary } from "./TurnStateMachine.js";
import { log, logError } from "../logger.js";
import { runSetup, finalizeSecurity, mulliganRedraw, type Rng, type Decklist } from "./setup.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { validateDecklist } from "./deckValidation.js";
import { MulliganCoordinator } from "./mulligan.js";
import {
  applyHatchEgg,
  applyMoveFromBreeding,
  canHatch,
  canMove,
  type BreedingDeps,
  type BreedingRejection,
  type HatchEggIntent,
  type MoveFromBreedingIntent,
} from "./actions/breeding.js";
import {
  validateDigivolve,
  applyDigivolve,
  memoryDepsFromGauge,
  validatePlayCard,
  type PlayCardCheck,
  applyPlayCard,
  validateAttack,
  applyAttack,
  applyDeclareBlock,
  applyDeclineBlock,
  applyRespondAlliance,
  applyRespondEvade,
  applyRespondBarrier,
  type DigivolveDeps,
  type DigivolveIntent,
  type DigivolveRejection,
  type PlayCardDeps,
  type PlayCardIntent,
  type PlayCardRejection,
  type PlayMode,
  validateDigiXros,
  applyDigiXros,
  type DigiXrosDeps,
  type DigiXrosIntent,
  type DigiXrosRejection,
  validateAssembly,
  applyAssembly,
  type AssemblyDeps,
  type AssemblyIntent,
  type AssemblyRejection,
  type AttackDeps,
  type AttackIntent,
  type BlockDeps,
  type CombatDecisionDeps,
  validateLinkCard,
  applyLinkCard,
  type LinkCardDeps,
  type LinkCardIntent,
  type LinkCardRejection,
  validateDnaDigivolve,
  applyDnaDigivolve,
  type DnaDigivolveDeps,
  type DnaDigivolveIntent,
  type DnaDigivolveRejection,
  validateRespondCounter,
  applyRespondCounter,
  type RespondCounterDeps,
  type RespondCounterIntent,
} from "./actions/index.js";

function sameNumericMap(left: ReadonlyMap<string, number>, right: ReadonlyMap<string, number>): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) if (right.get(key) !== value) return false;
  return true;
}

/**
 * Hooks the engine uses to talk back to the room (and thus to clients) without
 * importing Colyseus transport concerns. Supplied by AegisRoom.onCreate.
 */
export interface GameEngineHooks {
  seed: number;
  requestDecision: (seat: Seat, req: DecisionRequest) => void;
  emit: (event: ServerEvent) => void;
  /** Fires once, the first time both seats have sent `ready` (see {@link GameEngine.intentRouterDeps}). */
  onBothReady?: () => void;
  /** Notifies in-process actors only after an asynchronous action has fully settled. */
  onActionSettled?: (seat: Seat, intentType: Intent["type"]) => void;
}

/**
 * The subset of a client's join payload {@link GameEngine.seatPlayer} needs to seat a
 * player: a display name and a decklist. Engine-owned so the rules engine does not import
 * the transport-layer join type — the room's full join payload (`AegisJoinOptions`, which
 * additionally carries a private-room code the engine never needs) extends this instead.
 */
export interface SeatJoinOptions {
  displayName: string;
  deck: { mainDeck: string[]; eggDeck: string[] }; // arrays of card ids
}

/**
 * The number of security cards an attacker checks: base 1 plus every ＜Security Attack ±N＞ grant
 * (each amount sign-flipped when an SA-sign-inversion is active on the attacker — EX6-031). Per
 * Comprehensive Rules §16-4-4 the result is floored at 0: if modifiers drive it below 0, the actual
 * number of security checks is 0, never negative. Exported so the floor is a unit-testable contract
 * rather than an unobservable defensive guard (the consumer also treats <= 0 as "no check").
 */
export function securityStrikeCount(saGrants: ReadonlyArray<{ amount?: number }>, invert: boolean): number {
  const sum = saGrants.reduce((acc, g) => {
    const amount = g.amount ?? 1;
    return acc + (invert ? -amount : amount);
  }, 0);
  return Math.max(0, 1 + sum);
}

const NO_DIGIVOLVE_TARGETS: readonly string[] = [];

/** `CardInstance.projectedPlayCost` sentinel: this card has no projectable play cost right now. */
const NO_PROJECTED_COST = -1;

/** A hand card reads as playable when it validates, or when only memory is short of a material-cost route. */
function playableFromHand(check: PlayCardCheck, cardId: string): boolean {
  return check.ok || (check.reason === "insufficient-memory" && hasMaterialCostRoute(cardId));
}

/**
 * Overwrite a synchronized string list only when its contents actually changed.
 *
 * The keyword and affordance projections run for every permanent and every hand card on every
 * continuous recompute — several times per player action — and a clear-and-refill marks the list
 * dirty even when the contents come back identical, costing the encoder a re-serialization each
 * pass. Same result, written only on a real change.
 */
function replaceIfChanged(target: ArraySchema<string>, values: readonly string[]): void {
  if (target.length === values.length && values.every((value, index) => target[index] === value)) return;
  target.splice(0, target.length);
  for (const value of values) target.push(value);
}

/**
 * The brain of a single match. The ONLY object permitted to mutate GameState
 * (ARCHITECTURE.md section 3). It validates every intent, applies costs, mutates
 * the synchronized schema, runs the effect stack, and emits the event log.
 *
 * This is a scaffold: the public surface the room depends on is defined and the
 * boot path compiles/runs, but the rules engine itself is intentionally stubbed.
 * Each subsystem below maps to an entry in historical migration ledger
 */
/**
 * A watcher's identity ACROSS continuous recomputes. Every recompute clears the continuous
 * subscriptions and re-installs them, so `sub.id` is stable only within one recompute cycle;
 * the (event, anchor, description, per-turn identity) tuple is what distinguishes the same
 * watcher across reinstalls while preserving separately conferred copies (BT10-011 Q1943).
 */
function subTriggerIdentity(sub: SubTriggerSubscription): string {
  return [
    sub.event,
    sub.sourcePermanentId ?? "",
    sub.sourceInstanceId ?? "",
    sub.description,
    sub.oncePerTurnKey ?? "",
    sub.dedupeKey ?? "",
  ].join("|");
}

/**
 * A watcher's description as the players should read it. A player-scoped watcher tags its
 * description with the instance that installed it, so it can be told apart from the copy
 * conferred on another card; that tag is bookkeeping and never belongs in an announcement.
 */
function subTriggerDescriptionFor(sub: SubTriggerSubscription, ctx: EffectContext): string {
  const tag = ` [${ctx.source.instanceId}]`;
  return sub.description.endsWith(tag) ? sub.description.slice(0, -tag.length) : sub.description;
}

/** A watcher that triggered, with the EffectContext bound at the moment its event fired. */
interface ArmedSubTrigger {
  sub: SubTriggerSubscription;
  /** Context as of the event — what the ordering prompt is built from (controller, card). */
  ctx: EffectContext;
  /**
   * Context to run the body against, resolved when this watcher's turn actually comes. The
   * ordering prompt runs BETWEEN bodies, so an earlier body may have moved the board: a watcher
   * whose trigger condition stopped being met by then can no longer activate (CR §15-4-4-5), and
   * `fireSnapshot` drops it by re-checking `matches` against this fresh context. The deferred
   * paths pass the context bound when their event happened instead, because their trigger has
   * already activated (KB Q2611/Q2629).
   */
  contextAtFireTime: () => EffectContext | undefined;
  /** Unique occurrence captured by one `armedSubTriggers` call. */
  occurrence: {
    /** Once-per-turn keys that were unused when this event snapshot was armed. */
    oncePerTurnSnapshotKeys: ReadonlySet<string>;
    /** Shared success ledger for ordered bodies resolving this same event snapshot. */
    oncePerTurnSuccessfulKeys: Set<string>;
  };
}

/** One deletion a rule-check sweep performed, held until the whole pass can react to it. */
interface PooledRuleDeletion {
  trigger: TriggerInfo;
  ascensionCandidates: { instanceId: string; seat: Seat }[];
  /** Token cards vanish on deletion, so retain their sources until this window flushes. */
  transientCandidates: CardInstance[];
}

/**
 * Fuse a rule-check pass's pooled deletions into the ONE trigger the pass's single
 * [On Deletion] window runs on. The card sets are unioned because the window admits its
 * candidates by them; the scalars keep the first pooled value, since a pass produces one
 * cause (`byRule`) and the fields naming "the deleted permanent" describe a batch that is
 * now the whole pass. `deletedByDpZero` is already a per-batch "any of them" flag inside a
 * single sweep, and stays one across the pass; `deletedByDpZeroInstanceIds` carries the
 * per-card truth an effect needs.
 */
export function mergeRuleDeletions(pool: readonly PooledRuleDeletion[]): PooledRuleDeletion {
  const merged = pool.reduce<TriggerInfo>((into, { trigger }) => {
    const union = (
      key:
        | "deletedInstanceIds"
        | "deletedWasStackInstanceIds"
        | "deletedWasLinkedInstanceIds"
        | "deletedByDpZeroInstanceIds",
    ): string[] => [...(into[key] ?? []), ...(trigger[key] ?? [])];
    return {
      ...trigger,
      ...into,
      deletedInstanceIds: union("deletedInstanceIds"),
      deletedWasStackInstanceIds: union("deletedWasStackInstanceIds"),
      deletedWasLinkedInstanceIds: union("deletedWasLinkedInstanceIds"),
      deletedByDpZeroInstanceIds: union("deletedByDpZeroInstanceIds"),
      deletedLinkHostInstanceByLinkedInstanceId: {
        ...trigger.deletedLinkHostInstanceByLinkedInstanceId,
        ...into.deletedLinkHostInstanceByLinkedInstanceId,
      },
      deletedByDpZero: into.deletedByDpZero === true || trigger.deletedByDpZero === true,
      deletedPermanentIds: [...(into.deletedPermanentIds ?? []), ...(trigger.deletedPermanentIds ?? [])],
      deletedEffectiveColorsByInstanceId: {
        ...trigger.deletedEffectiveColorsByInstanceId,
        ...into.deletedEffectiveColorsByInstanceId,
      },
      deletedPermanentSnapshots: [
        ...(into.deletedPermanentSnapshots ?? []),
        ...(trigger.deletedPermanentSnapshots ?? []),
      ],
    };
  }, {});
  return {
    trigger: merged,
    ascensionCandidates: pool.flatMap((entry) => entry.ascensionCandidates),
    transientCandidates: pool.flatMap((entry) => entry.transientCandidates),
  };
}

export class GameEngine {
  private readonly memory: MemoryGauge;
  private readonly turnMachine: TurnStateMachine;
  private readonly access: GameStateAccess;
  private readonly win: WinCheck;
  private readonly combat: CombatController;
  /** Decision request/response correlation (subsystem: intent-protocol-and-room). */
  private readonly decisions: DecisionManager;
  /** The interactive Main-phase verb loop the turn machine awaits. */
  private readonly mainPhase: MainPhaseController;
  /** The interactive Breeding-phase window the turn machine awaits. */
  private readonly breeding: BreedingPhaseController;
  /** Per-turn use ledger for maxPerTurn accounting (shared with the effect stack). */
  private readonly tracker: UseTracker;
  /** Duration-scoped modifier store backing the effect primitives. */
  private readonly modifiers: ModifierLedger;
  /**
   * Continuous-rule store (can't-X restrictions, name/trait aliases, keyword grants,
   * color waivers) the effect primitives write and combat/turn/cost reads. Shared
   * (not the per-primitives private fallback) so what a static effect records is what
   * the rest of the engine consults.
   */
  private readonly continuous: ContinuousEffectLedger;
  /** Delayed / triggered sub-effect + replacement registry, shared with the primitives. */
  private readonly subTriggers: SubTriggerRegistry;

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
  private activeWindowToken: number | undefined = undefined;
  /** Async Main verbs accepted by the server but not yet fully resolved. */
  private mainVerbContinuationsInFlight = 0;
  /** Nesting guard that defers state-based actions until a used Option finishes routing. */
  private optionResolutionDepth = 0;
  /** Nesting guard that keeps rule checks outside an effect body's atomic resolution. */
  private effectResolutionDepth = 0;
  /**
   * Tail of the serialized Main-verb chain: each accepted verb starts only once the
   * previous one has fully settled, so two effect resolutions are never in flight at
   * once (see {@link continueMainVerb}).
   */
  private mainVerbChain: Promise<void> = Promise.resolve();
  /**
   * Watchers already resolved by the timing window that shares their event (see
   * {@link withPendingSubTriggers}), keyed by {@link subTriggerIdentity} rather than by
   * subscription id: a continuous recompute tears down and RE-INSTALLS every continuous watcher
   * under a fresh id, so an id-keyed ledger would stop recognizing the watcher it just resolved
   * and the trailing bus fire would run it a second time. Populated only inside such a window and
   * cleared when the outermost one closes.
   */
  private readonly consumedSubTriggerKeys = new Set<string>();
  /** Nesting depth of {@link withPendingSubTriggers} windows. */
  private subTriggerWindowDepth = 0;
  /** Watchers armed for the event of the enclosing window, offered to that window's resolver. */
  private pendingWindowSubTriggers: ArmedSubTrigger[] = [];
  /** Printed timing effects triggered inside the currently resolving effect body. */
  private pendingNestedTimingEffects: CollectedEffect[] = [];

  /** Security-removal reactions wait until the currently resolving effect finishes. */
  private readonly deferredSecurityRemovalTriggers: Array<{
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
  private flushingDeferredSecurityRemovalTriggers = false;
  /** Trigger windows created inside a resolving effect and activated only after that effect ends. */
  private readonly deferredTimingWindows: Array<{
    timing: EffectTiming;
    trigger: TriggerInfo;
    transientCandidates: readonly CardInstance[];
  }> = [];
  private flushingDeferredTimingWindows = false;

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
  private beginResolvingWindow(): boolean {
    const isOutermost = this.activeWindowToken === undefined;
    if (isOutermost) this.activeWindowToken = ++this.windowTokenSeq;
    return isOutermost;
  }

  /** Close a window opened by `beginResolvingWindow`; a no-op for a non-outermost (nested) call. */
  private endResolvingWindow(wasOutermost: boolean): void {
    if (!wasOutermost) return;
    this.pendingNestedTimingEffects = [];
    this.pendingWindowSubTriggers = [];
    this.activeWindowToken = undefined;
  }

  private async flushDeferredSecurityRemovalTriggers(): Promise<void> {
    if (this.flushingDeferredSecurityRemovalTriggers) return;
    this.flushingDeferredSecurityRemovalTriggers = true;
    try {
      while (this.deferredSecurityRemovalTriggers.length > 0) {
        const deferred = this.deferredSecurityRemovalTriggers.shift();
        if (deferred !== undefined) {
          await this.fireSubTriggerSnapshot(deferred.subscriptions, deferred.payload, deferred.contexts);
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
  private async settleBetweenEffects(): Promise<void> {
    await this.flushDeferredTimingWindows();
    await this.flushDeferredSecurityRemovalTriggers();
  }

  private async flushDeferredTimingWindows(): Promise<void> {
    if (this.flushingDeferredTimingWindows) return;
    this.flushingDeferredTimingWindows = true;
    try {
      while (this.deferredTimingWindows.length > 0) {
        const deferred = this.deferredTimingWindows.shift();
        if (deferred !== undefined)
          await this.fireTiming(deferred.timing, deferred.trigger, deferred.transientCandidates);
      }
    } finally {
      this.flushingDeferredTimingWindows = false;
    }
  }

  private shouldDeferNestedTiming(): boolean {
    return this.effectResolutionDepth > 0 && this.activeWindowToken !== undefined;
  }

  private deferNestedTimingEffects(
    timing: EffectTiming,
    trigger: TriggerInfo,
    candidateInstances: readonly CardInstance[],
  ): void {
    const capturedTrigger = { ...trigger };
    const effects = gatherTriggeredEffects(this.effectEnvironment(capturedTrigger), timing, candidateInstances).map(
      (collected) => ({ ...collected, timing, triggerInfo: capturedTrigger }),
    );
    this.pendingNestedTimingEffects.push(...effects);
  }

  /**
   * Cards a cross-permanent play-cost reducer committed at BeforePayCost (BT10-093: purple Digimon
   * pulled from under the player's Tamers), keyed by the played card's instanceId. Applied — placed
   * under the new permanent — by the play action once that permanent exists, before On Play fires.
   */
  private readonly pendingPlayReducerPlacements = new Map<string, string[]>();

  /**
   * Battle-area permanent ids a SELF `wouldBePlayed` reducer's cost body (BT12-112: "by placing 1 of
   * your [Shoutmon] as a digivolution card under this Digimon") selected at BeforePayCost, keyed by
   * the played card's instanceId — relocated UNDER the new permanent once it exists (same timing
   * constraint, and the same post-creation seam, as `pendingPlayReducerPlacements`; the two are
   * separate maps because this one relocates a whole PERMANENT via `relocatePermanent`, not loose
   * card instances via `placeUnder`).
   */
  private readonly pendingSelfReducerRelocations = new Map<string, { permanentId: string; shedOwnCards?: boolean }[]>();

  /** The effect verbs (effect-primitives) bound to this match. */
  private readonly primitives: Primitives;
  /** The player-decision API (ctx.ask.*) backed by the DecisionManager. */
  private readonly decisionApi: DecisionApi;
  /** The stack-resolver's controller prompts (chooseOrder / askOptional). */
  private readonly resolverDecisions: ResolverDecisions;
  /** Lobby readiness per seat (analogue of RoomManager AllPlayerIsReady). */
  private readonly readySeats = new Set<Seat>();
  /** Blitz opportunities answered during this turn, separate from attack eligibility. */
  private readonly resolvedBlitzOpportunities = new Set<string>();
  /** Blitz attackers explicitly accepted by their controller and awaiting declaration. */
  private readonly acceptedBlitzAttackers = new Set<string>();
  private blitzDecisionInFlight = false;
  private matchSetupStarted = false;
  /** Guards {@link GameEngineHooks.onBothReady} against firing more than once. */
  private bothReadyFired = false;
  /** The opening-hand mulligan window (subsystem: deck-and-setup). */
  private readonly mulligan: MulliganCoordinator;
  /** Decklists staged at seatPlayer, consumed by startMatch (index === seat). */
  private readonly stagedDecks: (Decklist | undefined)[] = [undefined, undefined];
  /** Per-seat shuffle PRNG produced by setup (so a mulligan reshuffles deterministically). */
  private rngForSeat: ((seat: Seat) => Rng) | undefined;
  /** Monotonic source of permanentIds unique within the match. */
  private permanentSeq = 0;
  /**
   * True while {@link recomputeContinuousEffects} is re-firing the persistent
   * (`EffectTiming.None`) static effects, so the continuous-capable primitives tag
   * what they record as `continuous` (the next recompute clears and re-derives it).
   */
  private continuousMode = false;
  /** Shared completion barrier for the current continuous recompute batch. */
  private recomputeInFlight: Promise<void> | undefined;
  /** Coalesces external recompute requests that arrive while a pass is rebuilding the ledgers. */
  private recomputeQueued = false;

  /**
   * Cards linked since the last over-limit rule check (fed by the link verb through
   * `PrimitivesEngine.noteLinked`). Comprehensive Rules §4-9-5 trashes EXISTING link cards
   * "at the same time as the newly linked cards", so {@link chooseExcessLinkCards} keeps
   * these out of the candidate pool. Cleared by that sweep, which is the moment the rule is
   * applied.
   */
  private readonly justLinked = new Set<string>();
  /** Last resolved continuous DP contribution, used only to preserve dependency inputs between passes. */
  private readonly continuousDpSeedState = new Map<string, number>();

  /**
   * Which tier the code running RIGHT HERE belongs to, carried down the async call chain
   * rather than held in a field ({@link continuousMode}).
   *
   * `continuousMode` alone cannot answer the question once two flows interleave: a
   * recompute is a long `await` chain, and a timing window resolving concurrently with it
   * (a play whose trailing recompute is still in flight while the next window opens) would
   * read the recompute's flag and tag its own one-shot modifiers `continuous` — the next
   * recompute clears that tier and the "for the turn" DP grant vanishes the instant it
   * lands. A flag flipped around the window instead has the mirror failure: the recompute's
   * own statics would stop being tagged and accumulate forever. Only per-flow state
   * separates them, which is what this store is.
   *
   * `undefined` (no enclosing scope) falls back to the field, so paths that never enter
   * either scope behave exactly as before.
   */
  private readonly continuousScope = new AsyncLocalStorage<boolean>();

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
  private withTriggeredMutations<T>(body: () => Promise<T>): Promise<T> {
    return this.continuousScope.run(false, body);
  }

  /** Whether what is being recorded right here belongs to the continuous tier. */
  private inContinuousPass(): boolean {
    return this.continuousScope.getStore() ?? this.continuousMode;
  }
  /** Trigger payload for the timing window currently resolving. */
  /** Transient security-DP modifiers during an active security check. */
  private readonly securityDp = new SecurityDpLedger();
  /** Continuous DP-based-deletion maximum bonuses (rebuilt each continuous recompute). */
  private readonly deletionMaxDp = new DeletionMaxDpLedger();
  /** Continuous DP-based-deletion BUDGET bonuses (BT19-011's inherited modifier; rebuilt each continuous recompute). */
  private readonly dpDeleteBudget = new DpDeleteBudgetLedger();
  /** Monotonic source of instanceIds for token spawn. */
  private instanceSeq = 0;

  constructor(
    private readonly state: GameState,
    private readonly hooks: GameEngineHooks,
  ) {
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
      undefined,
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
            await this.fireTimingForPermanent(timing, att, {
              attackerPermanentId: trigger.attackerPermanentId,
              attackMechanic: trigger.attackMechanic,
              defenderPermanentId: trigger.defenderPermanentId,
              blockerPermanentId: trigger.blockerPermanentId,
              ...(trigger.target?.kind === "permanent" ? { targetPermanentId: trigger.target.permanentId } : {}),
              deletedPermanentId: trigger.deletedPermanentId,
              deletedPermanentIds: trigger.deletedPermanentIds,
              deletedPermanentSnapshots: trigger.deletedPermanentSnapshots,
              deletingPermanentId: trigger.deletingPermanentId,
              removalCause: trigger.removalCause,
              deletedControllerSeat: trigger.deletedControllerSeat,
              deletedTopCardId: trigger.deletedTopCardId,
              deletedEffectiveColorsByInstanceId: trigger.deletedEffectiveColorsByInstanceId,
              deletedInstanceIds: trigger.deletedInstanceIds,
              deletedWasStackInstanceIds: trigger.deletedWasStackInstanceIds,
              deletedWasLinkedInstanceIds: trigger.deletedWasLinkedInstanceIds,
              deletedLinkHostInstanceByLinkedInstanceId: trigger.deletedLinkHostInstanceByLinkedInstanceId,
              battleOpponentPermanentIdByInstanceId: trigger.battleOpponentPermanentIdByInstanceId,
            });
            return;
          }
        }
        await this.fireTiming(timing, {
          subjectPermanentId: trigger.subjectPermanentId,
          suspendedPermanentId: trigger.suspendedPermanentId,
          attackerPermanentId: trigger.attackerPermanentId,
          attackMechanic: trigger.attackMechanic,
          defenderPermanentId: trigger.defenderPermanentId,
          blockerPermanentId: trigger.blockerPermanentId,
          ...(trigger.target?.kind === "permanent" ? { targetPermanentId: trigger.target.permanentId } : {}),
          deletedPermanentId: trigger.deletedPermanentId,
          deletedPermanentIds: trigger.deletedPermanentIds,
          deletedPermanentSnapshots: trigger.deletedPermanentSnapshots,
          deletingPermanentId: trigger.deletingPermanentId,
          removalCause: trigger.removalCause,
          deletedControllerSeat: trigger.deletedControllerSeat,
          deletedTopCardId: trigger.deletedTopCardId,
          deletedEffectiveColorsByInstanceId: trigger.deletedEffectiveColorsByInstanceId,
          deletedInstanceIds: trigger.deletedInstanceIds,
          deletedWasStackInstanceIds: trigger.deletedWasStackInstanceIds,
          deletedWasLinkedInstanceIds: trigger.deletedWasLinkedInstanceIds,
          deletedLinkHostInstanceByLinkedInstanceId: trigger.deletedLinkHostInstanceByLinkedInstanceId,
          battleOpponentPermanentIdByInstanceId: trigger.battleOpponentPermanentIdByInstanceId,
        });
      },
      fireSubTrigger: async (event, payload) => this.fireSubTrigger(event, payload),
      prepareSubTrigger: (event, payload) => this.prepareSubTrigger(event, payload),
      prepareFrozenSubTrigger: (event, payload) => this.prepareFrozenSubTrigger(event, payload),
      refreshContinuousEffects: () => this.recomputeContinuousEffects(),
      resolveDeletionReactions: async (trigger, candidates, transientCandidates = []) =>
        this.resolveDeletionReactions(
          trigger,
          candidates,
          (deletionTrigger) => this.fireTiming(EffectTiming.OnDestroyedAnyone, deletionTrigger, transientCandidates),
          transientCandidates,
        ),
      effectiveColorsOf: (permanentId) => {
        const permanent = this.access.permanentById(permanentId);
        return permanent === undefined ? [] : this.effectiveColorsOf(permanent);
      },
      consultLeavePrevention: async (permanentIds) => this.consultLeavePrevention(permanentIds, "byBattle"),
      dropPermanentSubscriptions: (permanentId) => this.dropPermanentSubscriptions(permanentId),
      checkSecurity: async (defenderSeat, attackerPermanentId, reason) =>
        this.runSecurityCheck(defenderSeat, attackerPermanentId, reason),
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
        this.modifiers.addDpModifier(this.state, permanentId, delta, EffectDuration.UntilEndBattle),
      addSecurityAttack: (permanentId) =>
        this.continuous.addKeywordGrant(permanentId, "SecurityAttack", EffectDuration.UntilEndAttack, 1),
      barrierFired: (key) => this.tracker.count(key, "replacement") > 0,
      markBarrierFired: (key) => this.tracker.register(key, "replacement"),
      sweepEndOfAttack: () => this.sweepCombatDurations(),
      continuous: this.continuous,
      hasKeyword: (permanentId, keyword) => {
        const permanent = this.access.permanentById(permanentId);
        return permanent !== undefined && resolveKeywords(permanent, this.continuous).includes(keyword);
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
      // ＜Fortitude＞'s mandatory replay-on-deletion (§16-27): the instance is already loose in
      // trash by the time this fires (the combat deletion loop moved it there).
      replayFromTrash: async (instanceId) => {
        await this.primitives.playInstances([instanceId]);
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
      detachEligibleLinkedCards: (permanentId) => {
        const permanent = this.access.permanentById(permanentId);
        if (permanent?.topCard === undefined) return [];
        const traits = detachTraitTokens(definitionOf(permanent.topCard));
        if (traits.length === 0) return [];
        return detachableLinkedCards(permanent, traits, (card) => definitionOf(card));
      },
      detachLinkedCard: async (permanentId, instanceId) => {
        const permanent = this.access.permanentById(permanentId);
        if (permanent?.topCard === undefined) return false;
        const traits = detachTraitTokens(definitionOf(permanent.topCard));
        if (traits.length === 0) return false;
        return (
          (await detachLinkedCard(permanent, instanceId, traits, (card) => definitionOf(card), {
            trash: async (ids) => this.primitives.trash(ids),
          })) !== undefined
        );
      },
      ascendToSecurity: async (instanceId) => {
        await this.primitives.ascendToSecurity(instanceId);
      },
      materialSave: async (permanentId) => {
        await this.primitives.materialSave(permanentId);
      },
      // §11-3 Counter Timing: whether the defending seat has anything to activate,
      // so `runCounterWindow` can skip the round trip when nothing is eligible.
      counterEligible: (seat) => this.counterEligibleSources(seat),
    });
    this.mainPhase = new MainPhaseController(this.state, this.memory);
    this.breeding = new BreedingPhaseController(this.state);
    this.turnMachine = new TurnStateMachine(this.state, this.buildTurnFlowHooks(), this.memory, this.hooks.emit);
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
      beginEffectBody: () => {
        this.effectResolutionDepth += 1;
      },
      finishEffectBody: () => {
        this.effectResolutionDepth = Math.max(0, this.effectResolutionDepth - 1);
      },
      baseGrantedDigivolve: (seat, base, evolving) => this.matchBaseGrantedDigivolve(seat, base, evolving),
      emit: (event) => this.hooks.emit(event),
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
      fireTiming: (timing, trigger) => this.fireTiming(timing, trigger),
      resolveDeletionReactions: (trigger, candidates) => this.resolveDeletionReactions(trigger, candidates),
      fireSubTrigger: (event, payload) => this.fireSubTrigger(event, payload),
      recomputeContinuousEffects: () => this.recomputeContinuousEffects(),
      finalizeEffectPlayCost: async (instanceId, baseCost, useAsOption, originZone, projectOnly) => {
        // A selected security card can still be face down in its origin zone.
        // Locate only this instance; do not expose hidden security to timing scans.
        const instance =
          originZone === "security"
            ? Array.from(this.state.players)
                .flatMap((player) => Array.from(player.security))
                .find((card) => card.instanceId === instanceId)
            : this.findLooseInstance(instanceId);
        return instance === undefined
          ? baseCost
          : this.fireBeforePayCost(instance, baseCost, useAsOption, originZone, projectOnly);
      },
      finalizeEffectDigivolveCost: async (target, evolvingInstanceId, into, baseCost) => {
        const deps = this.digivolveDeps();
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
      effectiveLooseUseCost: (instanceId, controllerSeat) => this.projectLooseUseCost(instanceId, controllerSeat),
      fireWhenLinking: async (instanceIds, targetPermanentId) => {
        for (const instanceId of instanceIds) {
          await this.fireTimingForInstance(EffectTiming.OnLinking, instanceId, {
            subjectPermanentId: targetPermanentId,
            linkedInstanceIds: instanceIds,
          });
        }
      },
      resolveSelfWhenTrashedFromDeck: async (instanceId, byEffectCardId) => {
        const instance = this.findLooseInstance(instanceId);
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
          await this.fireTimingForInstance(EffectTiming.OnDiscardSecurity, instanceId);
        }
      },
      reactivateOnPlay: (permanentId, opts) => this.reactivateOnPlay(permanentId, opts),
      fireEnteredByEffect: (timing, instanceId, ownerSeat, opts) =>
        this.fireEnteredByEffectTiming(timing, instanceId, ownerSeat, opts),
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
      (permanentId, timing) =>
        this.continuous.isTimingEffectDisabled(permanentId, timing) &&
        !this.continuous.hasRestriction(permanentId, "beAffected"),
      (permanent) => this.effectiveColorsOf(permanent),
      (instanceId) => this.continuous.hasColorWaiver(instanceId),
      (instanceId) => this.continuous.colorRequirementAlternatives(instanceId),
      (permanent) => canAttackerDeclare(this.access, permanent.controllerSeat, permanent, this.continuous) === null,
      (permanentId, printedTraits) => effectiveTraits(this.continuous, permanentId, printedTraits),
      (permanentId, printedKinds) => effectiveKinds(this.continuous, permanentId, printedKinds),
      (seat, base, evolving) => this.matchBaseGrantedDigivolve(seat, base, evolving),
      undefined,
      (id, traits) =>
        this.continuous.linkCostReductionGrant(
          id,
          traits,
          (key) => this.tracker.count(`link-cost/${key}`, "replacement") > 0,
        ),
      (permanent, printedName) => effectiveNames(this.continuous, permanent, printedName),
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

  private buildEffectContext(source: CardSource, trigger: TriggerInfo, askOverride?: DecisionApi): EffectContext {
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
  private cardSourceOf(instance: CardInstance): CardSource {
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
  private consultLeavePrevention(
    permanentIds: string[],
    cause: RemovalCause = "byEffect",
    resolvingSeat?: Seat,
    opts?: { isBounce?: boolean },
  ): Promise<Set<string>> {
    return consultLeavePrevention(
      {
        subTriggers: this.subTriggers,
        permanentById: (id) => this.access.permanentById(id),
        buildContext: (srcPerm, leavingId) =>
          this.buildEffectContext(this.cardSourceOf(srcPerm.topCard!), {
            deletedPermanentId: leavingId,
            deletedPermanentIds: permanentIds,
          }),
        buildInstanceContext: (sourceInstanceId, leavingId) => {
          const sourceInstance = this.findLooseInstance(sourceInstanceId);
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
        orderReplacements: async (replacements, seat) => {
          const keyed = replacements.map((replacement) => {
            const sourceInstance =
              replacement.sourceInstanceId === undefined
                ? undefined
                : this.findLooseInstance(replacement.sourceInstanceId);
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
      { isBounce: opts?.isBounce, reentryGuard: this.preventReentryGuard },
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
   * Whether `seat` has at least one legal Main-phase action right now: a playable
   * card, a digivolve option, an available attack, or an activatable [Main] effect.
   * Returns as soon as any action is found possible (short-circuit). Used to auto-end
   * the turn when the player has nothing left to do.
   */
  private hasAnyMainPhaseAction(seat: Seat): boolean {
    const player = this.state.players[seat];
    if (!player) return false;

    // 1. Activatable [Main] effects (populated by syncActivatableEffects after recompute)
    for (const perm of player.battleArea) {
      if (perm.activatableEffectsJson) return true;
    }

    // 2. Play a card from hand
    const playDeps = this.playCardDeps();
    for (const card of player.hand) {
      const def = lookupDefinition(card.cardId);
      if (!def || def.kinds.includes(CardKind.DigiEgg)) continue;
      const check = validatePlayCard(this.state, seat, { type: "playCard", instanceId: card.instanceId }, playDeps);
      if (check.ok) return true;
    }

    // 3. Digivolve a hand Digimon onto a battle-area or breeding permanent
    const digiDeps = this.digivolveDeps();
    for (const card of player.hand) {
      const def = lookupDefinition(card.cardId);
      if (!def?.kinds.includes(CardKind.Digimon)) continue;
      const targets = [...player.battleArea];
      if (player.breeding) targets.push(player.breeding);
      for (const perm of targets) {
        const check = validateDigivolve(
          this.state,
          seat,
          {
            type: "digivolve",
            permanentId: perm.permanentId,
            instanceId: card.instanceId,
          },
          digiDeps,
        );
        if (check.ok) return true;
      }
    }

    // 4. Attack with an unsuspended Digimon
    const attackDeps = this.attackDeps();
    const oppPlayer = this.state.players[1 - seat];
    for (const perm of player.battleArea) {
      const intent: AttackIntent = { attackerPermanentId: perm.permanentId, target: { kind: "player" } };
      if (validateAttack(attackDeps, seat, intent) === null) return true;
      if (oppPlayer) {
        for (const oppPerm of oppPlayer.battleArea) {
          if (!oppPerm.isSuspended) continue;
          const permIntent: AttackIntent = {
            attackerPermanentId: perm.permanentId,
            target: { kind: "permanent", permanentId: oppPerm.permanentId },
          };
          if (validateAttack(attackDeps, seat, permIntent) === null) return true;
        }
      }
    }

    return false;
  }

  /**
   * Adapt the engine's capabilities to the turn-phase state machine's narrow port
   * (subsystem: turn-phase-state-machine). The machine itself is fully implemented;
   * the dependencies it calls are filled in as their subsystems land.
   */
  private buildTurnFlowHooks(): TurnFlowHooks {
    return {
      fireTiming: async (timing) => this.fireTiming(timing),
      draw: async (seat, count) => (await this.drawCards(seat, count)).length,
      deckCount: (seat) => this.state.players[seat]?.deck.length ?? 0,
      unsuspendForActivePhase: async (seat) => this.unsuspendForActivePhase(seat),
      runBreedingPhase: async (seat) => this.runBreedingPhase(seat),
      runMainPhase: async (seat) => this.mainPhase.run(seat),
      finalizeMainPhaseEntry: () => {
        // The input controller deliberately opens before asynchronous start-of-main
        // work finishes. A very fast client can therefore submit a legal verb while
        // this finalizer is still pending. Route through the guarded post-verb check:
        // if that verb has an active effect window, it owns the eventual turn-end
        // check (including Blitz) and this stale entry finalizer must do nothing.
        this.checkTurnEndAfterVerb();
      },
      isGameOver: () => this.state.gameOver,
      declareDeckOutLoss: (loserSeat) => {
        // Deck-out: the seat that must draw from an empty deck loses; the opponent
        // wins (security-and-win-check). WinCheck.declareLoss is idempotent.
        this.win.declareLoss(loserSeat, "deckOut");
      },
      clearDurations: async (boundary) => {
        // Per-turn use limits (maxPerTurn / Once Per Turn) reset at the start of each
        // turn — the engine owns the UseTracker lifecycle (source
        // The per-turn usage ledger is cleared at each turn boundary. This is the
        // intent-protocol-and-room concern of keeping the per-turn ledger correct so
        // activated/triggered effects re-arm.
        if (boundary === "ownerTurnStart") {
          rollTurnActivity(this.state);
          this.tracker.resetForNewTurn();
          this.combat.attackedThisTurn.clear();
          this.resolvedBlitzOpportunities.clear();
          this.acceptedBlitzAttackers.clear();
          this.blitzDecisionInFlight = false;
        }
        await this.sweepDurations(boundary);
      },
    };
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
  private async sweepDurations(boundary: TurnBoundary): Promise<void> {
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
    // Re-derive the persistent tier from the post-sweep board.
    await this.recomputeContinuousEffects();
  }

  /**
   * Expire attack/battle-scoped durations at the end of an attack and re-derive the
   * continuous tier (the combat analogue of {@link sweepDurations}). `endBattle`
   * subsumes `endAttack`, so one sweep at each boundary suffices; the sweep is
   * owner-agnostic (the seat argument is unused for these durations).
   */
  private async sweepCombatDurations(): Promise<void> {
    this.modifiers.sweep(this.state, "endBattle", this.state.turnSeat);
    this.continuous.sweep(this.state, "endBattle", this.state.turnSeat);
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
  private async unsuspendForActivePhase(seat: Seat): Promise<string[]> {
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
      // (BT11-032's bounce) and the SubTrigger bus the compiled watchers use. The effect-driven
      // unsuspend primitive fires the same pair, so a turn-start unsuspend must not fire fewer.
      await this.withPendingSubTriggers(["whenUnsuspended"], { unsuspendedPermanentId: permanentId }, () =>
        this.fireTiming(EffectTiming.OnUnTappedAnyone, { unsuspendedPermanentId: permanentId }),
      );
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
  private async runBreedingPhase(seat: Seat): Promise<void> {
    const possible = canHatch(this.state, seat) || canMove(this.state, seat);
    await this.breeding.run(seat, !possible);
  }

  /** Dependencies the breeding verbs need (subsystem: deck-and-setup / breeding). */
  private breedingDeps(): BreedingDeps {
    return {
      nextPermanentId: () => this.nextPermanentId(),
      // Seat-level "your opponent can't move <X>" prohibition (RestrictPlay). Moving out of
      // the breeding area is the moving seat's own action (KB EX7-014 Q3835/Q6509).
      moveProhibited: (_state, seat, definition) => this.continuous.isPlayBlocked(seat, definition, "move"),
      emit: (event) => this.hooks.emit(event as ServerEvent),
    };
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
  private async drawCards(seat: Seat, n: number): Promise<CardInstance[]> {
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
      await this.withPendingSubTriggers(["whenOpponentDraws"], { drawingSeat: seat }, () =>
        this.fireTiming(EffectTiming.OnDraw, { drawnInstanceIds: drawn.map((c) => c.instanceId) }),
      );
    }
    return drawn;
  }

  /**
   * Assemble the side-effect dependencies the digivolve action needs (subsystem:
   * digivolve). Memory math is delegated to the shared MemoryGauge (its single
   * owner); draw uses the interim draw primitive; the When Digivolving timing is
   * fired through the effect stack; narration is forwarded to the room.
   */
  private digivolveDeps(): DigivolveDeps {
    const mem = memoryDepsFromGauge(this.memory);
    return {
      maxAffordable: mem.maxAffordable,
      payMemory: mem.payMemory,
      recomputeDP: (state, permanentId) => this.modifiers.recomputeDP(state, permanentId),
      reanchorGrantedEffects: (priorTopInstanceId, newTopInstanceId) =>
        this.continuous.reanchorCustomEffectGrants(priorTopInstanceId, newTopInstanceId),
      // Apply active continuous digivolution-cost modifiers (changeEvoCost) to the
      // printed evolve cost: a `fixed` adjustment sets an absolute cost, otherwise the
      // delta sums; floored at 0 (Official Rule Manual: a cost can't go below 0).
      adjustedDigivolveCost: (_state, target, base, into, opts) => {
        const reductionsBlocked = this.continuous.blocksCostReduction(target.controllerSeat, "digivolve");
        let cost = base;
        const intrinsicAlreadyApplied = this.modifiers.hasIntrinsicEvoCostAdjustment(target, into);
        const adj = this.modifiers.evoCostFor(target, into, opts);
        if (adj !== undefined) {
          cost = "fixed" in adj ? adj.fixed : cost + adj.delta;
        }
        const replReduction = this.subTriggers.costReductionFor("wouldDigivolve", target, into, {
          consume: opts?.consumeOnce === true,
          hasFired: (key) => this.tracker.count(key, "replacement") > 0,
          markFired: (key) => this.tracker.register(key, "replacement"),
        });
        // The shared intrinsic projection is a fallback, not a second copy of a live IR reduction.
        const intrinsicReduction = intrinsicAlreadyApplied ? 0 : intrinsicDigivolutionCostReduction(into, target);
        return Math.max(0, cost - (reductionsBlocked ? 0 : replReduction + intrinsicReduction));
      },
      prepareDigivolveCost: (_state, _seat, target, evolving) => this.fireBeforeDigivolveCost(evolving, target),
      potentialInteractiveDigivolveReduction: (state, seat, target, into) => {
        if (this.continuous.blocksCostReduction(seat, "digivolve")) return 0;
        const liveReduction = this.subTriggers.potentialInteractiveReductionFor("wouldDigivolve", seat, target, into, {
          hasFired: (key) => this.tracker.count(key, "replacement") > 0,
          markFired: (key) => this.tracker.register(key, "replacement"),
        });
        const evolving = state.players[seat]?.hand.find(({ cardId }) => cardId === into.cardId);
        if (evolving === undefined) return liveReduction;
        const ctx = this.buildEffectContext(this.cardSourceOf(evolving), {});
        const intrinsicReduction = wouldDigivolveSelfReducersFor(into.cardId).reduce(
          (total, reducer) => total + potentialWouldDigivolveSelfReduction(ctx, reducer, target),
          0,
        );
        return liveReduction + intrinsicReduction;
      },
      activateInteractiveDigivolveReduction: async (_state, seat, target, into, evolvingInstanceId) => {
        if (this.continuous.blocksCostReduction(seat, "digivolve")) return 0;
        const liveReduction = await this.subTriggers.activateInteractiveReductionsFor(
          "wouldDigivolve",
          seat,
          target,
          into,
          evolvingInstanceId,
          (sourcePermanentId, sourceInstanceId) => {
            const source = this.access.permanentById(sourcePermanentId);
            return source?.topCard === undefined
              ? undefined
              : this.buildEffectContext(
                  this.cardSourceOf(this.findInstance(sourceInstanceId ?? "")?.instance ?? source.topCard),
                  {},
                );
          },
          {
            hasFired: (key) => this.tracker.count(key, "replacement") > 0,
            markFired: (key) => this.tracker.register(key, "replacement"),
          },
        );
        const evolving = this.findLooseInstance(evolvingInstanceId);
        if (evolving === undefined) return liveReduction;
        const ctx = this.buildEffectContext(this.cardSourceOf(evolving), {});
        ctx.activeTiming = "Static";
        ctx.activeEffectText = ctx.source.definition.effectText;
        let intrinsicReduction = 0;
        for (const reducer of wouldDigivolveSelfReducersFor(into.cardId)) {
          intrinsicReduction += await applyWouldDigivolveSelfReducer(ctx, reducer, target);
        }
        return liveReduction + intrinsicReduction;
      },
      // Color-requirement waiver at the digivolve site (WaiveColorRequirement, LOCKED Q3):
      // when the evolving instance is waived, the EvoCost is matched on level alone. This is
      // the consuming read of the color-waiver store on the digivolve path. BUT while a
      // "players can't ignore digivolution requirements" rule (BT8-059) is active for the
      // digivolving seat, ignoring the color requirement is itself an ignored requirement
      // (KB Q1741: "players can't ignore part of the digivolution requirements such as
      // levels") — so the waiver is suppressed and the color test is re-enforced. This is the
      // consuming read of `cannotIgnoreDigivolution` (WR-01).
      colorWaived: (state, instance) =>
        this.continuous.hasColorWaiver(instance.instanceId) &&
        !this.continuous.cannotIgnoreDigivolution(state.turnSeat),
      // The base permanent's effective colors (printed ∪ continuously-derived) gate the
      // EvoCost color test (static-continuous-effects, LOCKED Q4 — KB BT3-040 Q1075). The
      // continuous tier is recomputed before each fired timing, so the store is current.
      derivedBaseColors: (_state, permanent) => this.effectiveColorsOf(permanent),
      // Positive "can only digivolve into [X]" constraint (EX10-035 digivolveExceptInto): consult
      // the continuous ledger with the evolving card's definition; reject a non-matching target.
      digivolveIntoAllowed: (_state, permanent, evolving) =>
        this.continuous.digivolveIntoAllowed(
          permanent.permanentId,
          lookupDefinition(evolving.cardId) ?? this.cardSourceOf(evolving).definition,
        ),
      // consuming read of the digivolve-restriction store at the digivolve site.
      digivolveBaseRestricted: (_state, permanent, evolving) => {
        if (this.continuous.hasRestriction(permanent.permanentId, "digivolve")) return true;
        const evolvingDefinition = lookupDefinition(evolving.cardId) ?? this.cardSourceOf(evolving).definition;
        if (
          evolvingDefinition.level === 7 &&
          this.continuous.hasRestriction(permanent.permanentId, "digivolveToLevel7")
        ) {
          return true;
        }
        if (permanent.isSuspended) return false;
        if (!this.continuous.isUnsuspendedDigivolveProhibited(permanent.controllerSeat)) return false;
        const base = permanent.topCard === undefined ? undefined : definitionOf(permanent.topCard.cardId);
        if (base === undefined) return false;
        return isDigimon(base) || (isTamer(base) && tamerOntoDigivolveLevel(evolving.cardId) !== undefined);
      },
      // Alternate-requirement non-memory placement cost (BT7-112): availability gate + payment.
      // Generic over `placementCost` (kind ∈ kinds OR trait ∈ traits, across hand/trash).
      alternatePlacementPayable: (_state, seat, requirement) =>
        this.placementCostCards(seat, requirement).length >= (requirement.placementCost?.count ?? 0),
      payAlternatePlacement: async (_state, seat, requirement, evolving) => {
        const need = requirement.placementCost?.count ?? 0;
        const candidates = this.placementCostCards(seat, requirement).filter(
          (c) => c.instanceId !== evolving.instanceId,
        );
        if (candidates.length < need) return false;
        // KB BT7-112 Q1691: the player chooses WHICH matching cards to place; the selection
        // order is the bottom-of-deck order ("in any order").
        const ctx = this.buildEffectContext(this.cardSourceOf(evolving), {});
        const chosen = await this.decisionApi.selectCards(ctx, {
          candidates: candidates.map((c) => c.instanceId),
          min: need,
          max: need,
        });
        // Empty/short response (decision timeout safe-default): fall back to the deterministic
        // hand-then-trash pick — payment is mandatory once the alternate path was chosen (Q1681).
        const ids = chosen.length === need ? chosen : candidates.slice(0, need).map((c) => c.instanceId);
        await this.primitives.returnToDeck(ids, { toTop: false });
        return true;
      },
      // Burst Digivolve's non-memory Tamer-return cost (§8-3-3-2): availability gate + payment.
      burstDigivolveTamerPayable: (_state, seat, requirement) =>
        this.burstDigivolveTamerCandidates(seat, requirement).length > 0,
      payBurstDigivolveTamer: async (_state, seat, requirement) => {
        const target = this.burstDigivolveTamerCandidates(seat, requirement)[0];
        if (target?.topCard === undefined) return false;
        const moved = await this.primitives.returnToHand([target.topCard.instanceId]);
        return moved.length > 0;
      },
      // ＜Digisorption -N＞ availability for the affordability gate (Comprehensive Rules §16-10):
      // N when the card being digivolved into has ＜Digisorption＞ AND at least one Digimon is
      // suspendable to pay it (the controller's own, or — while an eligible BT3-056 redirector is
      // on the controller's battle area this turn — an opponent's). Pure read; no prompt/suspend.
      digisorptionReduction: (_state, seat, intoCardId) => {
        if (this.continuous.blocksCostReduction(seat, "digivolve")) return 0;
        const amount = digisorptionAmountFor(intoCardId);
        if (amount === undefined) return 0;
        return this.digisorptionSuspendCandidates(seat).length >= 1 ? amount : 0;
      },
      payDigisorption: (_state, seat, into, target) => this.payDigisorption(seat, into, target),
      fireWouldDigivolve: async (_state, _seat, target, into) => {
        // A would-digivolve watcher may be anchored to another permanent (EX2-056 Takato)
        // while applying to the Digimon that declared the evolution. Gather the whole event
        // window and let each replacement's `appliesTo` predicate gate the target.
        const replacements = this.subTriggers.replacementsFor("wouldDigivolve");
        for (const replacement of replacements) {
          if (replacement.mode !== "instead" || replacement.sourcePermanentId === undefined) continue;
          const sourcePermanent = this.access.permanentById(replacement.sourcePermanentId);
          if (sourcePermanent?.topCard === undefined) continue;
          const ctx = this.buildEffectContext(this.cardSourceOf(sourcePermanent.topCard), {
            subjectPermanentId: target.permanentId,
            digivolvingIntoCardId: into.cardId,
          });
          if (replacement.appliesTo && !replacement.appliesTo(ctx, target.permanentId)) continue;
          await replacement.apply(ctx);
        }
      },
      // Base-granted digivolve path (ST7-03/BT6-060): the base permanent's static grant lets this
      // specific evolving card digivolve onto it, ignoring color/level, when active (battle area,
      // owner's turn — guaranteed by the verb — and the opponent-level condition when present).
      baseGrantedDigivolve: (_state, seat, base, evolving) => this.matchBaseGrantedDigivolve(seat, base, evolving),
      // ＜Blast Digivolve＞/＜Blast DNA Digivolve＞ (§16-26-1/§16-31-1): the evolving hand card's
      // own printed keyword, read from the compiled-IR side registry (registerIrCard populates it
      // via registerBlastDigivolveFromEffects) since the card is in hand, not a live permanent.
      costWaived: (_state, instance) => hasBlastDigivolveKeyword(instance.cardId),
      blastWindowAllowed: (_state, seat) => this.combat.hasOpenCounterWindow && this.combat.counterWindowSeat === seat,
      draw: (_state, seat, count) => this.drawCards(seat, count),
      fireWhenDigivolving: async (_state, seat, permanent, previousLevel) => {
        // Turn-scoped fact consumed by inherited effects such as BT1-007. Register before
        // firing When Digivolving so effects in that window can observe the completed evolution.
        // Effects do not inspect the breeding area unless their text explicitly says so (BT1-007
        // Q870), therefore a breeding-area evolution must not set this battle-area fact.
        if (!permanent.inBreeding) {
          this.tracker.register(`seat:${seat}`, "digivolvedThisTurn");
        }
        // Scope [When Digivolving] to the permanent that just digivolved (its top card
        // plus inherited stack effects). A global fire would also collect and resolve
        // every OTHER permanent's [When Digivolving] effect — including the opponent's
        // — because those effects rely on the engine (not a per-card owner's-turn guard)
        // to be scoped to the digivolving card.
        // One digivolution, one set of simultaneous triggers: the evolving card's own
        // [When Digivolving], the board-wide enter-field window, and every "when your Digimon
        // digivolves" watcher. They reach the resolver as ONE pool, so the controller orders
        // all of them in a single prompt — Destromon's own [When Digivolving] against the two
        // Xeno EX11-066 watchers, for example — instead of the printed effects always
        // resolving before the watchers.
        const digivolveTrigger = {
          subjectPermanentId: permanent.permanentId,
          previousDigivolutionLevel: previousLevel,
        };
        await this.withPendingSubTriggers(
          ["whenOneOfYoursDigivolves", "whenAnyDigivolves"],
          digivolveTrigger,
          async () => {
            // Scope [When Digivolving] to the permanent that just digivolved (its top card
            // plus inherited stack effects). A global fire would also collect and resolve
            // every OTHER permanent's [When Digivolving] effect — including the opponent's
            // — because those effects rely on the engine (not a per-card owner's-turn guard)
            // to be scoped to the digivolving card.
            await this.fireTimingForPermanent(EffectTiming.WhenDigivolving, permanent, digivolveTrigger);
            // Thread the digivolving permanent as the trigger subject (documented behavior: the
            // enter-field hashtable carries the entered permanent). An OnEnterFieldAnyone effect
            // that targets "the Digimon that digivolved" (BT19-080) reads
            // ctx.trigger.subjectPermanentId; it was previously undefined here, leaving such
            // effects silently inert.
            await this.fireTiming(EffectTiming.OnEnterFieldAnyone, {
              ...digivolveTrigger,
              entryCause: "digivolve",
            });
            await this.fireSubTrigger("onEnterFieldAnyone", {
              ...digivolveTrigger,
              entryCause: "digivolve",
            });
          },
        );
      },
      emit: (event) => this.hooks.emit(event as ServerEvent),
    };
  }

  /**
   * The loose cards (hand/trash, per the requirement's `from` zones) that satisfy an alternate
   * requirement's `placementCost` predicate — a card whose kind is in `kinds` OR that carries a
   * trait in `traits` (BT7-112: Tamer cards OR [Hybrid]-trait cards). Hand is enumerated before
   * trash so the deterministic server pick is stable.
   */
  private placementCostCards(seat: Seat, requirement: DigivolutionRequirement): CardInstance[] {
    const spec = requirement.placementCost;
    if (spec === undefined) return [];
    const player = this.state.players[seat];
    if (player === undefined) return [];
    const wantedKinds = (spec.kinds ?? []).map((k) => CardKind[k]);
    const matches = (cardId: string): boolean => {
      const def = lookupDefinition(cardId);
      if (def === undefined) return false;
      if (wantedKinds.some((k) => def.kinds.includes(k))) return true;
      return (spec.traits ?? []).some((t) => cardHasTrait(def, t));
    };
    const out: CardInstance[] = [];
    for (const zone of spec.from) {
      const cards = zone === "hand" ? player.hand : player.trash;
      for (const card of cards) if (matches(card.cardId)) out.push(card);
    }
    return out;
  }

  /**
   * The controller's battle-area Tamer permanents matching a Burst Digivolve requirement's
   * `burstDigivolve.returnTamerNamesExact` (§8-3-3-2). When more than one qualifies (e.g. 2
   * copies of the same Tamer in play), the first is used deterministically — the rule leaves
   * the choice to the controller, but no conformance test exercises the multi-copy case, so a
   * decision prompt is not wired here.
   */
  private burstDigivolveTamerCandidates(seat: Seat, requirement: DigivolutionRequirement): Permanent[] {
    const names = requirement.burstDigivolve?.returnTamerNamesExact ?? [];
    if (names.length === 0) return [];
    const player = this.state.players[seat];
    if (player === undefined) return [];
    return player.battleArea.filter((perm) => {
      if (perm.topCard === undefined) return false;
      const def = lookupDefinition(perm.topCard.cardId);
      return def !== undefined && names.includes(def.nameEn);
    });
  }

  /**
   * §8-3-2-1..3 Burst Digivolve's end-of-turn PENDING PROCESSING (§18-1): for every permanent
   * flagged `burstDigivolvePendingTrash`, trash the card now stacked immediately under its top
   * — but only when one is actually stacked there (§8-3-2-2: nothing stacked, nothing trashed)
   * and it is STILL a Digimon card at this evaluation (§8-3-2-3: a card de-digivolved away by
   * end of turn is spared). Both checks are re-read live here, not from state at digivolve time,
   * matching §8-3-2-3's own "by the end of the turn" wording. The flag is cleared unconditionally
   * so it can never re-fire on a later turn.
   */
  private async processPendingBurstDigivolveTrash(): Promise<void> {
    for (const player of this.state.players) {
      if (player === undefined) continue;
      for (const perm of player.battleArea) {
        if (!perm.burstDigivolvePendingTrash) continue;
        perm.burstDigivolvePendingTrash = false;
        const stackedTop = perm.stack[perm.stack.length - 1];
        if (stackedTop === undefined) continue; // §8-3-2-2
        const def = lookupDefinition(stackedTop.cardId);
        if (def === undefined || !def.kinds.includes(CardKind.Digimon)) continue; // §8-3-2-3
        await this.primitives.trashDigivolutionCards(perm.permanentId, [stackedTop.instanceId]);
      }
    }
  }

  /**
   * The cost of a base-granted digivolve path (ST7-03/BT6-060) for digivolving `evolving` onto
   * `base`, or undefined when none applies. The grant lives as a static on the base permanent's
   * `IsExistOnBattleArea`; own-turn is guaranteed by the Main-phase verb) and matches when the
   * evolving card satisfies the grant's target predicate AND the activation condition holds.
   */
  private matchBaseGrantedDigivolve(
    seat: Seat,
    base: Permanent,
    evolving: CardDefinition,
  ): { cost: number } | undefined {
    if (base.inBreeding) return undefined;
    const grants = baseGrantedDigivolveFor(base.topCard.cardId);
    if (grants === undefined) return undefined;
    for (const grant of grants) {
      if (!GameEngine.baseGrantTargetMatches(grant.target, evolving)) continue;
      if (grant.condition !== undefined && !this.baseGrantConditionHolds(seat, grant.condition)) continue;
      return { cost: grant.cost };
    }
    return undefined;
  }

  /** Whether the evolving card satisfies a base-granted path's target predicate (exact name OR
   * name-substring OR trait). */
  private static baseGrantTargetMatches(target: BaseGrantedDigivolve["target"], evolving: CardDefinition): boolean {
    if (target.namesExact && target.namesExact.some((n) => evolving.nameEn === n)) return true;
    if (target.names && target.names.some((n) => evolving.nameEn.includes(n))) return true;
    if (target.traits && target.traits.some((t) => cardHasTrait(evolving, t))) return true;
    return false;
  }

  /** Evaluate a base-granted path's activation condition against live state. */
  private baseGrantConditionHolds(seat: Seat, condition: NonNullable<BaseGrantedDigivolve["condition"]>): boolean {
    if (condition.kind === "anyOf") {
      return condition.conditions.some((nested) => this.baseGrantConditionHolds(seat, nested));
    }
    if (condition.kind === "opponentHasDigimonLevelAtLeast") {
      const opponentSeat = this.access.opponentOf(seat);
      return this.access.player(opponentSeat).battleArea.some((perm) => {
        if (!this.access.isBattleAreaDigimon(perm)) return false;
        const level = lookupDefinition(perm.topCard.cardId)?.level;
        return level !== undefined && level >= condition.level;
      });
    }
    if (condition.kind === "distinctNamedTamersWithTrait") {
      // "N or more [trait] Tamers with different names": same-named Tamers collapse to one.
      const names = new Set<string>();
      for (const perm of this.access.player(seat).battleArea) {
        const definition = perm.topCard === undefined ? undefined : lookupDefinition(perm.topCard.cardId);
        if (definition === undefined || !isTamer(definition) || !cardHasTrait(definition, condition.trait)) continue;
        names.add(definition.nameEn);
      }
      return names.size >= condition.count;
    }
    const textCondition = condition as unknown as { kind: string; text?: string };
    if (textCondition.kind === "tamerHasText" && textCondition.text !== undefined) {
      return this.access.player(seat).battleArea.some((perm) => {
        if (perm.topCard === undefined) return false;
        const definition = lookupDefinition(perm.topCard.cardId);
        return (
          definition !== undefined &&
          isTamer(definition) &&
          matchNameOrTrait(definition, { tokens: [textCondition.text!], match: "text" })
        );
      });
    }
    return false;
  }

  /** Stable effect key for a BT3-056-style ＜Digisorption＞ redirect's once-per-turn accounting. */
  private static readonly DIGISORPTION_REDIRECT_KEY = "digisorption-redirect";

  /**
   * An UNUSED ＜Digisorption＞-redirector permanent (BT3-056) on `seat`'s battle area this turn, or
   * undefined. The redirect's [Your Turn][Once Per Turn] gate requires the
   * redirector to be a battle-area Digimon on its controller's turn and within its per-turn limit.
   * KB Q4703: a card cannot redirect its OWN digivolve-into suspend, so the redirector must be a
   * SEPARATE permanent already in play (the card being digivolved into is still in hand here).
   */
  private digisorptionRedirector(seat: Seat, excludeInstanceId?: string): Permanent | undefined {
    if (this.state.turnSeat !== seat) return undefined;
    return this.access
      .player(seat)
      .battleArea.find(
        (p) =>
          this.access.isBattleAreaDigimon(p) &&
          p.topCard !== undefined &&
          p.topCard.instanceId !== excludeInstanceId &&
          isDigisorptionRedirector(p.topCard.cardId) &&
          this.tracker.count(p.topCard.instanceId, GameEngine.DIGISORPTION_REDIRECT_KEY) < 1,
      );
  }

  /**
   * The permanents that may be suspended to pay a ＜Digisorption＞ cost for `seat`: the controller's
   * own unsuspended battle-area Digimon, plus — when an eligible redirector is in play — the
   * opponent's unsuspended battle-area Digimon (documented behavior `CanTapWhenAbsorbEvolution` + the BT3-056
   * redirect's `PermanentCondition`).
   */
  private digisorptionSuspendCandidates(seat: Seat, excludeRedirectorInstanceId?: string): Permanent[] {
    const own = this.access.player(seat).battleArea.filter((p) => this.access.isBattleAreaDigimon(p) && !p.isSuspended);
    if (this.digisorptionRedirector(seat, excludeRedirectorInstanceId) === undefined) return own;
    const opponentSeat = this.access.opponentOf(seat);
    const opponent = this.access
      .player(opponentSeat)
      .battleArea.filter((p) => this.access.isBattleAreaDigimon(p) && !p.isSuspended);
    return [...own, ...opponent];
  }

  /**
   * Interactively pay a ＜Digisorption＞ suspend for digivolving into `into` (Comprehensive Rules
   * §16-10): prompt the controller; on accept, suspend 1 chosen eligible Digimon (their own, or —
   * via the BT3-056 redirect — an opponent's, consuming the redirect's once-per-turn use), firing
   * the suspend's `whenSuspended` window. Returns the cost reduction obtained (the ＜Digisorption＞
   * amount when paid, else 0).
   */
  private async payDigisorption(seat: Seat, into: CardInstance, evolvingPermanent: Permanent): Promise<number> {
    const amount = digisorptionAmountFor(into.cardId);
    if (amount === undefined) return 0;
    // Payment happens while the evolving card is still in hand. Exclude that exact instance
    // defensively as well: KB BT3-056 Q4703 says the Ceresmon being digivolved into cannot
    // grant its own redirect, while a different, pre-existing Ceresmon still can.
    const candidates = this.digisorptionSuspendCandidates(seat, into.instanceId);
    if (candidates.length === 0) return 0;

    const ctx = this.buildEffectContext(this.cardSourceOf(into), {});
    ctx.activeTiming = "Static";
    const fullEffectText = ctx.source.definition.effectText?.trim();
    ctx.activeEffectText =
      fullEffectText?.match(/^.*?(?=\[(?:When|On|Your|All|Opponent|Main|Security|Start|End)\b)/s)?.[0]?.trim() ||
      fullEffectText;
    const accept = await this.decisionApi.optional(
      ctx,
      `＜Digisorption -${amount}＞: suspend 1 Digimon to reduce the digivolution cost by ${amount}?`,
    );
    if (!accept) return 0;

    const byInstanceId = new Map<string, Permanent>();
    for (const p of candidates) {
      if (p.topCard === undefined) continue;
      // Digisorption is paid before stacking, but the declared evolution has already revealed
      // the card being digivolved into. Preserve that visible identity for the evolving target
      // while mapping the decision back to the still-live base permanent that gets suspended.
      byInstanceId.set(p.permanentId === evolvingPermanent.permanentId ? into.instanceId : p.topCard.instanceId, p);
    }
    const chosen = await this.decisionApi.chooseTargets(ctx, {
      candidates: [...byInstanceId.keys()],
      min: 1,
      max: 1,
    });
    const target = chosen.length >= 1 ? byInstanceId.get(chosen[0]!) : undefined;
    if (target === undefined) return 0;

    // Redirect once-per-turn: when the chosen Digimon is an opponent's, the BT3-056 redirect was
    // used — record its use so it can't redirect a second ＜Digisorption＞ this turn (documented behavior
    // isOverMaxCountPerTurn on the WhenDigisorption effect).
    if (target.controllerSeat !== seat) {
      const redirector = this.digisorptionRedirector(seat, into.instanceId);
      if (redirector?.topCard !== undefined) {
        this.tracker.register(redirector.topCard.instanceId, GameEngine.DIGISORPTION_REDIRECT_KEY);
      }
    }

    await this.primitives.suspend([target.permanentId], { byEffectSeat: seat });
    return amount;
  }

  /**
   * Fire an effect-timing window through the stack (subsystem: effect-stack-resolution).
   * Delegates to the resolver composition root (`runTiming`): collect every effect
   * that triggers at `timing` across the candidate zones, order turn-player-first,
   * prompt for optionals/ordering, and resolve one at a time — folding in effects
   * triggered DURING resolution (documented behavior). Centralized
   * so every caller (turn machine, actions, security check) shares one seam.
   */
  private async fireTiming(
    timing: EffectTiming,
    trigger: TriggerInfo = {},
    transientCandidates: readonly CardInstance[] = [],
  ): Promise<void> {
    if (timing === EffectTiming.OnDestroyedAnyone) {
      // Every deletion of ONE rule-check pass is simultaneous (§17-1-3), so its [On Deletion]
      // effects join the pass's single pool instead of opening a window per sweep (§15-4-3-3).
      if (this.ruleTriggerPool !== undefined) {
        this.ruleTriggerPool.push({
          trigger: { ...trigger },
          ascensionCandidates: [],
          // A deleted Token leaves the match instead of entering trash. Capture its live card
          // instance before movement so its already-triggered [On Deletion] can still join the
          // pooled post-fixpoint window (EX11-012 Q6514).
          transientCandidates: [
            ...transientCandidates,
            ...this.instancesById(trigger.deletedInstanceIds ?? []).filter(
              (instance) => definitionOf(instance).isToken === true,
            ),
          ],
        });
        return;
      }
      // A deletion caused during another effect only TRIGGERS [On Deletion] at that point.
      // Activation waits until the causing effect has finished (§15-4-4). Re-collecting at
      // flush time also enforces §15-4-4-3: if that card left trash meanwhile, its pending
      // effect can no longer activate (BT26-016 Q6977).
      if (this.activeWindowToken !== undefined && !this.flushingDeferredTimingWindows) {
        this.deferredTimingWindows.push({
          timing,
          trigger: { ...trigger },
          transientCandidates: [...transientCandidates],
        });
        return;
      }
    }
    if (this.shouldDeferNestedTiming() && !this.flushingDeferredTimingWindows) {
      await this.recomputeContinuousEffects();
      this.deferNestedTimingEffects(timing, trigger, [...this.listCandidateInstances(), ...transientCandidates]);
      return;
    }
    await this.runTimingWindow(timing, trigger, transientCandidates);
  }

  /**
   * Resolve one timing window, past the deferral gates {@link fireTiming} applies. The
   * pooled rule-check window calls this directly: at that point the fixpoint has converged
   * and no card body is on the stack, so there is nothing left to defer behind.
   */
  private async runTimingWindow(
    timing: EffectTiming,
    trigger: TriggerInfo,
    transientCandidates: readonly CardInstance[] = [],
  ): Promise<void> {
    const wasOutermostWindow = this.beginResolvingWindow();
    try {
      await this.recomputeContinuousEffects();
      // A phase-boundary event has one fixed set of card sources: a Tamer played by an
      // earlier start-of-turn/start-of-main effect did not exist when that boundary
      // occurred and cannot retroactively trigger (BT24-082/Q5664, BT24-083/Q5667).
      // The end of the turn is the same kind of boundary in the other direction: a card
      // that ARRIVES while it is being resolved has missed it, so its own end-of-turn
      // clause is not processed this turn (Q2731/Q2762 — "the end of the turn timing has
      // already passed"). Without the snapshot, EX11-046's "[End of Opponent's Turn] this
      // Digimon may digivolve into [Galacticmon]" put a fresh Galacticmon on top of the
      // stack that fired the very same clause again, chaining through hand and trash in
      // one window.
      // Keep every other timing window live because derived triggers and mid-window
      // digivolutions intentionally join those resolution fixpoints.
      const phaseBoundarySourceLocations =
        timing === EffectTiming.OnStartTurn ||
        timing === EffectTiming.OnStartMainPhase ||
        timing === EffectTiming.OnEndTurn
          ? new Map(
              this.listCandidateInstances().map((instance) => [
                instance.instanceId,
                this.candidateSourceLocation(instance.instanceId),
              ]),
            )
          : undefined;
      const listWindowCandidates =
        phaseBoundarySourceLocations === undefined && transientCandidates.length === 0
          ? undefined
          : (): CardInstance[] => {
              const live =
                phaseBoundarySourceLocations === undefined
                  ? this.listCandidateInstances()
                  : this.instancesById([...phaseBoundarySourceLocations.keys()]).filter(
                      (instance) =>
                        this.candidateSourceLocation(instance.instanceId) ===
                        phaseBoundarySourceLocations.get(instance.instanceId),
                    );
              const candidates = new Map(live.map((instance) => [instance.instanceId, instance] as const));
              for (const instance of transientCandidates) candidates.set(instance.instanceId, instance);
              return [...candidates.values()];
            };
      // GRANTED timed triggers fired at the same physical point as the matching window, and
      // therefore simultaneous with the printed effects it collects:
      //   - "[Start of Your Main Phase]" granted onto a permanent (BT23-056); the per-install
      //     `matches` gate re-checks turn-ownership so it fires only on the watched permanent's
      //     owner's main phase (documented behavior), never the granter's.
      //   - "[End of Your Turn]" (EX10-035's delayed self-delete) and "at the end of your
      //     opponent's turn" (EX3-069/EX4-058/EX4-071/EX6-070/BT16-084/BT16-085/BT16-088/
      //     BT17-025), both at the OnEndTurn window while `state.turnSeat` is still the ENDING
      //     player's seat, which is what `endOfOpponentTurnGate` reads.
      // Everything this window resolves is a TRIGGERED effect, so its mutations must not be
      // tagged continuous even when a recompute is still in flight around it (see
      // {@link withTriggeredMutations}).
      const runWindow = async (): Promise<void> =>
        this.withTriggeredMutations(async () => {
          await runTiming(
            timing,
            this.effectEnvironment(trigger),
            this.resolutionDeps(listWindowCandidates, { outermost: wasOutermostWindow }),
          );
          if (wasOutermostWindow) {
            await this.flushDeferredTimingWindows();
            await this.flushDeferredSecurityRemovalTriggers();
          }
        });
      if (timing === EffectTiming.OnStartMainPhase) {
        await this.withPendingSubTriggers(["startOfYourMainPhase"], {}, runWindow);
      } else if (timing === EffectTiming.OnEndTurn) {
        await this.withPendingSubTriggers(["endOfTurn", "endOfOpponentTurn"], {}, runWindow);
      } else {
        await runWindow();
      }
      if (timing === EffectTiming.OnEndTurn) {
        await this.processPendingBurstDigivolveTrash();
      }
      await this.recomputeContinuousEffects();
    } finally {
      this.endResolvingWindow(wasOutermostWindow);
    }
  }

  /**
   * Resolve the two trigger families created by one deletion. Ascension is deliberately
   * represented in the ordinary orderTriggers channel: if it resolves first, the card leaves
   * trash and the subsequent On Deletion collection correctly drops that pending effect (Q7100).
   *
   * `fire` opens the [On Deletion] window; the pooled rule-check flush substitutes the
   * non-deferring runner so the whole pass resolves as one window.
   */
  private async resolveDeletionReactions(
    trigger: TriggerInfo,
    ascensionCandidates: readonly { instanceId: string; seat: Seat }[],
    fire: (deletionTrigger: TriggerInfo) => Promise<void> = (deletionTrigger) =>
      this.fireTiming(EffectTiming.OnDestroyedAnyone, deletionTrigger),
    transientCandidates: readonly CardInstance[] = [],
  ): Promise<void> {
    // A rule-check pass pools every deletion it performs, Ascension offer included, and
    // resolves them as one simultaneous group once the fixpoint converges (§17-1-3,
    // §15-4-3-3). Without this each sweep would resolve its own [On Deletion] effects
    // before the next sweep even ran.
    if (this.ruleTriggerPool !== undefined) {
      this.ruleTriggerPool.push({
        trigger: { ...trigger },
        ascensionCandidates: [...ascensionCandidates],
        transientCandidates: [...transientCandidates],
      });
      return;
    }
    const ascend = async ({ instanceId, seat }: { instanceId: string; seat: Seat }): Promise<void> => {
      if (this.findLooseInstance(instanceId) === undefined) return;
      const response = await this.decisions.request({
        seat,
        kind: "selectCards",
        promptText: "＜Ascension＞: place this card at the top of your security stack?",
        options: { candidateInstanceIds: [instanceId], min: 0, max: 1 },
      });
      if (response.kind === "selectCards" && response.instanceIds.includes(instanceId)) {
        await this.primitives.ascendToSecurity(instanceId);
      }
    };

    const candidate = ascensionCandidates.find(({ instanceId }) => {
      const card = this.findLooseInstance(instanceId);
      return card !== undefined && definitionOf(card).effectText?.includes("[On Deletion]") === true;
    });
    if (candidate === undefined) {
      await fire(trigger);
      for (const pending of ascensionCandidates) await ascend(pending);
      return;
    }

    const ascensionKey = `ascension/${candidate.instanceId}`;
    const onDeletionKey = `on-deletion/${candidate.instanceId}`;
    const response = await this.decisions.request({
      seat: candidate.seat,
      kind: "orderTriggers",
      promptText: "Choose whether to activate ＜Ascension＞ or [On Deletion] first.",
      options: { triggerKeys: [ascensionKey, onDeletionKey] },
    });
    const ascensionFirst = response.kind === "orderTriggers" && response.order[0] === ascensionKey;
    if (ascensionFirst) await ascend(candidate);
    await fire(trigger);
    if (!ascensionFirst) await ascend(candidate);
    for (const pending of ascensionCandidates) {
      if (pending.instanceId !== candidate.instanceId) await ascend(pending);
    }
  }

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
   * Sub-trigger events whose SUBJECT is a breeding-area permanent by definition. They are the
   * "effects that explicitly specify or reference breeding areas" exception in Comprehensive
   * Rules §3-4-5-6, so the breeding-visibility guard below must never drop them.
   */
  private static readonly BREEDING_SUBJECT_EVENTS: ReadonlySet<SubTriggerEventName> = new Set([
    "whenHatch",
    "whenMovedFromBreeding",
    "whenOpponentMovedFromBreeding",
  ]);

  /**
   * Comprehensive Rules §3-4-5-6: "Trigger conditions can't be met by cards in breeding areas,
   * except for effects that explicitly specify or reference breeding areas." Its own example is
   * a Tamer's "[Your Turn] When your Digimon digivolves, by suspending this Tamer, <Draw 1>",
   * which does NOT trigger off a breeding-area digivolution (KB Q870/Q1038; Q4428: only the word
   * "field" spans both areas, "your Digimon" is the battle area alone).
   *
   * The engine still FIRES the digivolve/play/place-under events for a breeding-area subject —
   * a [Breeding] effect on the breeding permanent itself legitimately watches them — so the rule
   * is enforced per WATCHER: one whose source is not itself in the breeding area cannot see a
   * breeding-area subject, and is skipped exactly like a watcher whose source left the field.
   */
  private breedingHidesSubjectFrom(
    event: SubTriggerEventName,
    payload: TriggerInfo,
    watcherSource: CardSource,
  ): boolean {
    if (GameEngine.BREEDING_SUBJECT_EVENTS.has(event)) return false;
    const subjectId = payload.subjectPermanentId;
    if (subjectId === undefined) return false;
    if (this.access.permanentById(subjectId)?.inBreeding !== true) return false;
    return watcherSource.isOnBreedingArea?.() !== true;
  }

  private async fireSubTrigger(event: SubTriggerEventName, payload: TriggerInfo = {}): Promise<void> {
    const deletedPermanent =
      payload.deletedPermanentId === undefined ? undefined : this.access.permanentById(payload.deletedPermanentId);
    if (deletedPermanent !== undefined) {
      payload = {
        deletedControllerSeat: deletedPermanent.controllerSeat,
        deletedTopCardId: deletedPermanent.topCard?.cardId,
        deletedDigivolutionCardCount: deletedPermanent.stack.length,
        ...payload,
      };
    }
    if (this.ruleProcessing) {
      const subscriptions = this.subTriggers.subscriptionsFor(event);
      const contexts = new Map<number, EffectContext>();
      for (const sub of subscriptions) {
        const context = this.buildSubTriggerContext(sub, payload);
        if (context !== undefined) contexts.set(sub.id, context);
      }
      const armed = this.armedSubTriggers(subscriptions, payload, contexts).map((item) => {
        // A triggered effect granted to the Digimon being deleted has to retain that
        // Digimon's last live context (BT15-039). Other watchers have only met their
        // trigger condition: they have not activated yet, so their source must still
        // exist after the rule-process fixpoint (BT25-084/Q6399).
        if (event === "onDeletionOf" && item.sub.sourcePermanentId === payload.deletedPermanentId) return item;
        return {
          ...item,
          contextAtFireTime: () => this.buildSubTriggerContext(item.sub, payload),
        };
      });
      this.deferredRuleSubTriggers.push({
        event,
        payload: {
          turnSeat: this.state.turnSeat,
          ...payload,
        },
        armed,
      });
      return;
    }
    // A security card removed while another effect is resolving creates a pending trigger;
    // it does not interrupt that effect. Dynasmon BT6-044 must finish revealing its 6 cards
    // before its Recovery reaction can consume the next deck card (KB Q1430/Q1432).
    if (
      event === "whenSecurityRemoved" &&
      this.activeWindowToken !== undefined &&
      !this.flushingDeferredSecurityRemovalTriggers
    ) {
      const pending = [...this.subTriggers.subscriptionsFor(event)];
      const boundPayload = { ...payload };
      const contexts = new Map<number, EffectContext>();
      for (const sub of pending) {
        const ctx = this.buildSubTriggerContext(sub, boundPayload);
        if (ctx !== undefined) contexts.set(sub.id, ctx);
      }
      this.deferredSecurityRemovalTriggers.push({ payload: boundPayload, subscriptions: pending, contexts });
      return;
    }
    if (this.shouldDeferNestedTiming()) {
      // The event subject can leave the board before the causing effect finishes. Bind each
      // context now, at trigger time, so the pending activation keeps the subject snapshot
      // required by CR §15-4-4 instead of re-running its filter against an already-moved card.
      const subscriptions = this.subTriggers.subscriptionsFor(event);
      const contexts = new Map<number, EffectContext>();
      for (const sub of subscriptions) {
        const ctx = this.buildSubTriggerContext(sub, payload);
        if (ctx !== undefined) contexts.set(sub.id, ctx);
      }
      this.pendingWindowSubTriggers.push(...this.armedSubTriggers(subscriptions, payload, contexts));
      return;
    }
    // A SubTrigger body is a triggered, duration-scoped effect even when its watcher was
    // discovered while the engine was re-deriving continuous effects (see
    // {@link withTriggeredMutations}).
    await this.withTriggeredMutations(async () => {
      // One event can arm SEVERAL watchers at once: two copies of Xeno EX11-066 both watch
      // "when your Digimon digivolves", and a link operation arms both the recipient's watchers
      // and the newly linked card's [When Linking] face. Simultaneous triggers of one player are
      // ordered BY THAT PLAYER (CR §15-4), so snapshot the matching watchers and let the
      // controller pick the next one exactly like a normal timing window. `whenLinked` always
      // takes this path — its ordering is observable for BT26-084/Q7128, whose link face can
      // recursively link a card mid-window.
      //
      // An ordered window resolves ONLY what its snapshot armed: a body can drive a continuous
      // recompute, which tears down and RE-INSTALLS every continuous watcher under fresh ids, so
      // a second pass over a re-queried list would fire the same watcher twice. The set of
      // simultaneous triggers is fixed when the event happens anyway. The single-watcher case
      // keeps the plain pass below — no snapshot, no prompt, and a `matches` gate that only
      // becomes true once an earlier body has resolved still gets its chance.
      const armed = this.armedSubTriggers(this.subTriggers.subscriptionsFor(event), payload);
      if (event === "whenLinked" || armed.length > 1) {
        await this.runSubTriggersInChosenOrder(armed);
      } else {
        await this.subTriggers.fire(
          event,
          (sub) => this.buildSubTriggerContext(sub, payload),
          undefined,
          // The ambient resolving-effect window (see `beginResolvingWindow`): undefined when
          // this fire happens outside any fireTiming/fireTimingForInstance call (no dedup —
          // fail-open, matching SubTriggerRegistry.fire's documented default), otherwise the
          // ID of the outermost effect resolution currently in progress, so an `oncePerTiming`
          // watcher dedupes across multiple plays/events from ONE resolving effect (KB Q2814)
          // while still firing once per genuinely separate top-level resolution.
          this.activeWindowToken,
          this.subTriggerTurnLedger(),
          (sub) => this.consumedSubTriggerKeys.has(subTriggerIdentity(sub)),
          (sub, ctx) => this.announceSubTrigger(sub, ctx),
        );
      }
    });
    // A watcher body may have moved/deleted permanents; refresh the continuous tier so a
    // subsequent read sees the post-fire board (mirrors fireTiming's trailing recompute).
    // A batch stack-card event is immediately followed by one per-card event at the same
    // primitive seam. Keep continuous inherited watchers installed until those per-card events
    // have had a chance to fire; recomputing here would remove a source card that has already
    // moved and erase its exact-card watcher before the canonical event (P-167/BT10-006).
    if (event !== "onDigivolutionCardsDiscardedBatch") await this.recomputeContinuousEffects();
  }

  /**
   * Capture the watchers armed when an event occurs, then return a deferred activation.
   * This is distinct from a nested timing deferral: combat deliberately resolves its
   * System-A [When Attacking] window before the System-B watcher bus, but both systems
   * observe the same attack declaration. A watcher installed by an earlier System-A
   * effect therefore must not retroactively join that declaration (BT24-078/Q5775).
   */
  private prepareSubTrigger(event: SubTriggerEventName, payload: TriggerInfo): () => Promise<void> {
    const boundPayload = { ...payload };
    const subscriptions = [...this.subTriggers.subscriptionsFor(event)];
    const contexts = new Map<number, EffectContext>();
    for (const sub of subscriptions) {
      const ctx = this.buildSubTriggerContext(sub, boundPayload);
      if (ctx !== undefined) contexts.set(sub.id, ctx);
    }
    return async () => {
      await this.withTriggeredMutations(async () => {
        await this.fireSubTriggerSnapshot(subscriptions, boundPayload, contexts);
      });
    };
  }

  /**
   * Capture a SubTrigger's eligibility at the event boundary and defer only its activation.
   *
   * Battle deletion has a small but important ordering seam: the losing permanent must leave
   * the field before continuous effects are refreshed (so a conditional ＜Piercing＞ can become
   * active), while the battle's `whenBattleWon`/`onDeletionOf` reactions must not be allowed to
   * mutate that refreshed state before Piercing is captured. The ordinary `prepareSubTrigger`
   * path intentionally re-checks `matches`/`canFire` when its callback runs; that is correct for
   * attack watchers, but would make a deletion watcher observe the post-removal board. This
   * variant freezes those two event predicates and the source context immediately, then runs
   * the already-armed body later.
   *
   * The cloned subscription clears only the live predicates. It retains the original id and all
   * lifecycle/once fields, so `fireSnapshot` still enforces once-per-turn and once-per-timing
   * ledgers, while the bound context allows a watcher whose source was just deleted to resolve.
   */
  private prepareFrozenSubTrigger(event: SubTriggerEventName, payload: TriggerInfo): () => Promise<void> {
    let boundPayload = { ...payload };
    const deletedPermanent =
      payload.deletedPermanentId === undefined ? undefined : this.access.permanentById(payload.deletedPermanentId);
    if (deletedPermanent !== undefined) {
      boundPayload = {
        deletedControllerSeat: deletedPermanent.controllerSeat,
        deletedTopCardId: deletedPermanent.topCard?.cardId,
        deletedDigivolutionCardCount: deletedPermanent.stack.length,
        ...boundPayload,
      };
    }

    const subscriptions = [...this.subTriggers.subscriptionsFor(event)];
    const contexts = new Map<number, EffectContext>();
    for (const sub of subscriptions) {
      const context = this.buildSubTriggerContext(sub, boundPayload);
      if (context !== undefined) contexts.set(sub.id, context);
    }

    // `armedSubTriggers` is deliberately called NOW: it evaluates matches/canFire against the
    // live event state and captures the shared Once Per Turn occurrence. A later continuous
    // recompute or reaction must not add a watcher to this event or make an unarmed one eligible.
    const frozen = this.armedSubTriggers(subscriptions, boundPayload, contexts).map((item) => ({
      ...item,
      // `runSubTriggersInChosenOrder` performs its normal liveness re-check before every body,
      // and `fireSnapshot` checks `matches` again. For this event-locked path those predicates
      // have already been evaluated above; clearing them on the private snapshot preserves the
      // event result without mutating the registry's original subscription.
      sub: { ...item.sub, matches: undefined, canFire: undefined },
      contextAtFireTime: () => item.ctx,
    }));

    return async () => {
      if (frozen.length === 0) return;
      await this.withTriggeredMutations(async () => {
        const remaining = frozen.filter((item) => !this.consumedSubTriggerKeys.has(subTriggerIdentity(item.sub)));
        if (remaining.length > 0) await this.runSubTriggersInChosenOrder(remaining);
      });
      await this.recomputeContinuousEffects();
    };
  }

  /**
   * The watchers in `subs` that ACTUALLY trigger for `payload`, each paired with the context
   * bound at the moment the event fired. Filters what the ordering prompt must not offer: a
   * watcher already consumed by the surrounding timing window, one whose `[Once Per Turn]`
   * ledger entry is spent, one whose anchor is gone, one whose `matches` gate rejects the
   * event, and one that could not act anyway (`canFire`, e.g. an unpayable self-suspend cost).
   */
  private armedSubTriggers(
    subs: readonly SubTriggerSubscription[],
    payload: TriggerInfo,
    boundContexts?: ReadonlyMap<number, EffectContext>,
  ): ArmedSubTrigger[] {
    const armed: ArmedSubTrigger[] = [];

    // Capture the per-turn budget at the event boundary. Distinct action-path clauses sharing
    // one printed [Once Per Turn] are simultaneous and all remain eligible in this snapshot
    // (EX4-014/Q3456), even after the first body provisionally marks the shared key. A later
    // event gets a fresh snapshot and therefore sees the consumed ledger entry.
    const oncePerTurnSnapshotKeys = new Set(
      subs
        .filter((sub) => sub.oncePerTurnKey !== undefined && this.tracker.count(sub.oncePerTurnKey, "subtrigger") === 0)
        .map((sub) => sub.oncePerTurnKey!)
        .filter((key, index, keys) => keys.indexOf(key) === index),
    );
    const occurrence = {
      oncePerTurnSnapshotKeys,
      oncePerTurnSuccessfulKeys: new Set<string>(),
    };

    for (const sub of subs) {
      if (this.consumedSubTriggerKeys.has(subTriggerIdentity(sub))) continue;
      if (sub.oncePerTurnKey !== undefined && this.tracker.count(sub.oncePerTurnKey, "subtrigger") > 0) continue;
      const ctx = boundContexts?.get(sub.id) ?? this.buildSubTriggerContext(sub, payload);
      if (ctx === undefined) continue;
      if (sub.matches !== undefined && !sub.matches(ctx)) continue;
      if (sub.canFire !== undefined && !sub.canFire(ctx)) continue;
      armed.push({
        sub,
        ctx,
        occurrence,
        contextAtFireTime: () =>
          boundContexts?.get(sub.id) === undefined
            ? this.buildSubTriggerContext(sub, payload)
            : boundContexts.get(sub.id),
      });
    }

    return armed;
  }

  /**
   * `oncePerTurnKey` ledger: reuses the SAME per-turn UseTracker the kernel's maxPerTurn and the
   * leave-prevention "replacement" keys use, namespaced with "subtrigger" so the three ledgers
   * never collide. Resets with everything else at `ownerTurnStart` (see `clearDurations`).
   */
  private subTriggerTurnLedger(): SubTriggerTurnLedger {
    return {
      hasFired: (key) => this.tracker.count(key, "subtrigger") > 0,
      markFired: (key) => this.tracker.register(key, "subtrigger"),
      unmarkFired: (key) => this.tracker.unregister(key, "subtrigger"),
    };
  }

  /**
   * Resolve simultaneous watchers one at a time, letting the controller pick the next one
   * (CR §15-4: the turn player orders their own simultaneous triggers first, then the
   * opponent theirs). A lone watcher resolves without a prompt.
   */
  private async runSubTriggersInChosenOrder(armed: readonly ArmedSubTrigger[]): Promise<void> {
    const remaining = [...armed];
    while (remaining.length > 0) {
      // Drop watchers whose trigger condition lapsed while an earlier one resolved, so the
      // ordering prompt never offers an effect that can no longer activate (CR §15-4-4-5).
      for (let index = remaining.length - 1; index >= 0; index -= 1) {
        if (!this.subTriggerStillActivatable(remaining[index]!)) remaining.splice(index, 1);
      }
      if (remaining.length === 0) break;
      const prioritySeat = remaining.some((item) => item.ctx.source.ownerSeat === this.state.turnSeat)
        ? this.state.turnSeat
        : remaining[0]!.ctx.source.ownerSeat;
      const sameController = remaining.filter((item) => item.ctx.source.ownerSeat === prioritySeat);
      let chosen = sameController[0]!;
      if (sameController.length > 1) {
        const index = await this.resolverDecisions.chooseOrder(
          prioritySeat,
          sameController.map((item) => this.subTriggerAsCollected(item)),
        );
        if (index !== null) chosen = sameController[index] ?? chosen;
      }
      remaining.splice(remaining.indexOf(chosen), 1);
      await this.fireOneSubTrigger(chosen);
    }
  }

  /**
   * The watchers armed for the enclosing window's event, as collected effects the resolver can
   * order against the printed ones. Each keeps its own body: the resolver builds a context from
   * the watcher's source for the ordering prompt, but the watcher runs through
   * `fireOneSubTrigger`, so its `matches` / `once` / `oncePerTiming` / `[Once Per Turn]` ledgers
   * behave exactly as they do on the SubTrigger bus.
   */
  private pendingWindowCollected(): CollectedEffect[] {
    const subTriggers = this.pendingWindowSubTriggers
      .filter(
        (item) =>
          !this.consumedSubTriggerKeys.has(subTriggerIdentity(item.sub)) && this.subTriggerStillActivatable(item),
      )
      .map((item) => {
        const collected = this.subTriggerAsCollected(item);
        return {
          ...collected,
          // The resolver announces what it resolves, so this body must not announce itself.
          effect: { ...collected.effect, resolve: async () => this.fireOneSubTrigger(item, { announce: false }) },
        };
      });
    return [...this.pendingNestedTimingEffects, ...subTriggers];
  }

  /**
   * Run `fireWindows` — the timing windows for one event — with that event's SubTrigger watchers
   * folded into them, so one player orders their printed effects and their watchers in a SINGLE
   * prompt and can interleave them (CR §15-4). Mirrors the reference implementation, where a
   * digivolution stacks every triggered effect into one list and resolves it one at a time.
   *
   * Whatever the windows did not resolve fires afterwards, still ordered. Watchers armed DURING
   * the windows are picked up by the trailing bus fire, which skips the ones already consumed.
   */
  private async withPendingSubTriggers(
    events: readonly SubTriggerEventName[],
    payload: TriggerInfo | undefined,
    fireWindows: () => Promise<void>,
    opts: { busTrigger?: () => TriggerInfo | undefined; onlyInitiallyArmed?: boolean } = {},
  ): Promise<void> {
    // A rule sweep parks watchers wholesale (see fireSubTrigger); leave that path alone.
    const armed =
      this.ruleProcessing || payload === undefined
        ? []
        : events.flatMap((event) => this.armedSubTriggers(this.subTriggers.subscriptionsFor(event), payload));
    const busFire = async (): Promise<void> => {
      if (opts.onlyInitiallyArmed === true) {
        const remaining = armed.filter((item) => !this.consumedSubTriggerKeys.has(subTriggerIdentity(item.sub)));
        await this.withTriggeredMutations(() => this.runSubTriggersInChosenOrder(remaining));
        return;
      }
      const trigger = opts.busTrigger === undefined ? payload : opts.busTrigger();
      if (trigger === undefined) return;
      for (const event of events) await this.fireSubTrigger(event, trigger);
    };
    if (armed.length === 0) {
      await fireWindows();
      await busFire();
      return;
    }
    const enclosing = this.pendingWindowSubTriggers;
    this.pendingWindowSubTriggers = [...enclosing, ...armed];
    this.subTriggerWindowDepth += 1;
    try {
      await fireWindows();
    } finally {
      this.pendingWindowSubTriggers = enclosing;
      this.subTriggerWindowDepth -= 1;
    }
    // The bus still runs: normally it resolves the armed watchers the windows did not reach
    // and any watcher armed while they were resolving. Entry windows opt into the trigger-time
    // snapshot because an inherited effect acquired during this very play event did not exist
    // when the event happened and cannot retroactively trigger (BT13-013, Q2272).
    await busFire();
    if (this.subTriggerWindowDepth === 0) this.consumedSubTriggerKeys.clear();
  }

  /**
   * Is this armed watcher still activatable RIGHT NOW? A pending trigger whose condition stops
   * being met before it activates can no longer activate (CR §15-4-4-5): two copies of Hina
   * Kurihara EX3-065 both trigger on one digivolution, but if the first one's resolution removes
   * the evolved Digimon, the second has nothing to react to (KB Q3430). Re-checked between
   * resolutions — the SubTrigger bus gets this for free by evaluating `matches` at fire time.
   */
  private subTriggerStillActivatable(item: ArmedSubTrigger): boolean {
    const ctx = item.contextAtFireTime();
    if (ctx === undefined) return false;
    if (item.sub.matches !== undefined && !item.sub.matches(ctx)) return false;
    // Once-per-turn siblings share only their own event occurrence. If a different occurrence
    // consumed the live ledger, this item must drop from the ordering prompt; the per-occurrence
    // success set is what distinguishes an allowed same-event sibling from a later event/group.
    const oncePerTurnKey = item.sub.oncePerTurnKey;
    if (
      oncePerTurnKey !== undefined &&
      this.tracker.count(oncePerTurnKey, "subtrigger") > 0 &&
      !item.occurrence.oncePerTurnSuccessfulKeys.has(oncePerTurnKey)
    )
      return false;
    return item.sub.canFire === undefined || item.sub.canFire(ctx);
  }

  /** Present a watcher to the ordering prompt as an ordinary collected effect. */
  private subTriggerAsCollected({ sub, ctx }: ArmedSubTrigger): CollectedEffect {
    return {
      source: ctx.source,
      // The stack resolver re-creates a context for every collected effect. Carry the event
      // snapshot along with this watcher so placement guards and action filters see the same
      // exact payload that armed it (especially a stack source already moved to trash).
      triggerInfo: ctx.trigger,
      discardedStackSourceProof: ctx.discardedStackSourceProof,
      effect: {
        effectKey: `subtrigger/${sub.id}/${sub.description}`,
        description: sub.description,
        optional: false,
        isInherited: sub.isInheritedSource === true,
        isSecurity: false,
        isLinked: sub.isLinkedSource === true,
        maxPerTurn: -1,
        canTrigger: () => true,
        canActivate: () => true,
        resolve: sub.run,
      },
    };
  }

  /**
   * Announce a watcher body as it starts, the way the effect stack announces the printed
   * effects it resolves (`resolutionDeps.onResolving`). A watcher IS a triggered effect: it can
   * stop the game to ask its controller for a choice, and the players are owed the clause that
   * asked before the wait — a security-removal reaction ("when your opponent's security stack is
   * removed from") activates mid-check, so without this the board simply froze on the check with
   * nothing said. Watchers folded into a timing window are announced by the resolver instead, so
   * that path passes no announcer and neither announces twice.
   */
  private announceSubTrigger(sub: SubTriggerSubscription, ctx: EffectContext | undefined): void {
    if (ctx === undefined) return;
    this.hooks.emit({
      kind: "effectTriggered",
      seat: ctx.source.ownerSeat,
      sourceCardId: ctx.source.cardId,
      effectKey: `subtrigger/${sub.id}/${sub.description}`,
      description: subTriggerDescriptionFor(sub, ctx),
      timing: sub.event,
      ...(sub.isInheritedSource === true ? { isInherited: true } : {}),
      // `securityChecked` closes the check AFTER these bodies have run, so the client needs
      // this to hold the announcement until the checked card's reveal has been shown.
      ...(this.securityCheckDepth > 0 ? { duringSecurityCheck: true } : {}),
    });
  }

  /**
   * Run one armed watcher. `contextAtFireTime` decides which board it sees: the immediate path
   * rebuilds the context now (so `fireSnapshot`'s own `matches` re-check can still drop a watcher
   * whose condition lapsed), while the deferred paths hand back the context bound when their
   * event happened, because their trigger has already activated (KB Q2611/Q2629).
   */
  private async fireOneSubTrigger(
    { sub, contextAtFireTime, occurrence }: ArmedSubTrigger,
    opts: { announce?: boolean } = {},
  ): Promise<void> {
    if (this.subTriggerWindowDepth > 0) this.consumedSubTriggerKeys.add(subTriggerIdentity(sub));
    await this.subTriggers.fireSnapshot(
      [sub],
      () => contextAtFireTime(),
      this.activeWindowToken,
      this.subTriggerTurnLedger(),
      undefined,
      opts.announce === false ? undefined : (fired, ctx) => this.announceSubTrigger(fired, ctx),
      occurrence.oncePerTurnSnapshotKeys,
      occurrence.oncePerTurnSuccessfulKeys,
    );
  }

  /**
   * Anchor a watcher's context on its OWN source permanent (so its body's "this Digimon" and
   * controller scope resolve correctly) with the event `payload` in `ctx.trigger`. Preserves the
   * exact card that installed the watcher: for an inherited effect whose source card is later
   * trashed from the host's stack, the body still means "this card", not the host's current top
   * card. Returns undefined — skipping the watcher — when its anchor has left the field (the
   * subscription should already have been dropped on leave; guard defensively) or when the
   * breeding-area rule hides the event's subject from it.
   */
  private buildSubTriggerContext(sub: SubTriggerSubscription, payload: TriggerInfo): EffectContext | undefined {
    const context = this.buildSubTriggerSourceContext(sub, payload);
    if (context === undefined) return undefined;
    return this.breedingHidesSubjectFrom(sub.event, payload, context.source) ? undefined : context;
  }

  /**
   * Preserve the placement proof for an inherited source that was just discarded from a live
   * host. The normal inherited placement guard intentionally rejects an off-field source; these
   * three discard events are the only seams that carry an exact stack-card identity after the
   * move. Enrich only the bound context (never the shared payload) and require the card to be in
   * trash and the event subject to be the anchored host, so a returned/unrelated card cannot be
   * resurrected as an inherited effect.
   */
  private discardedStackSourceContextPayload(
    sub: SubTriggerSubscription,
    payload: TriggerInfo,
  ): { payload: TriggerInfo; proof: DiscardedStackSourceProof } | undefined {
    const sourceInstanceId = sub.sourceInstanceId;
    if (sourceInstanceId === undefined) return undefined;
    if (
      sub.event !== "onDigiBurstCardDiscarded" &&
      sub.event !== "onDigivolutionCardsDiscardedBatch" &&
      sub.event !== "onDigivolutionCardDiscarded"
    )
      return undefined;
    if (payload.subjectPermanentId === undefined) return undefined;
    if (this.access.permanentById(payload.subjectPermanentId) === undefined) return undefined;
    if (sub.sourcePermanentId !== undefined && payload.subjectPermanentId !== sub.sourcePermanentId) return undefined;
    const listed =
      sub.event === "onDigivolutionCardDiscarded"
        ? payload.trashedDigivolutionInstanceId === sourceInstanceId
        : (payload.trashedDigivolutionInstanceIds ?? []).includes(sourceInstanceId);
    if (!listed || rootZoneOfLooseInstance(this.state, sourceInstanceId) !== "trash") return undefined;
    return {
      payload,
      proof: { sourceInstanceId, hostPermanentId: payload.subjectPermanentId },
    };
  }

  private buildSubTriggerSourceContext(sub: SubTriggerSubscription, payload: TriggerInfo): EffectContext | undefined {
    if (sub.sourcePermanentId !== undefined) {
      const srcPerm = this.access.permanentById(sub.sourcePermanentId);
      if (srcPerm?.topCard === undefined) return undefined;
      const sourceInstance = [srcPerm.topCard, ...srcPerm.stack, ...srcPerm.linked].find(
        (card) => card.instanceId === sub.sourceInstanceId,
      );
      if (sub.sourceInstanceId !== undefined && sourceInstance === undefined) {
        // A stack-card watcher can retain the host as its lifecycle anchor while its printed
        // source has just moved to trash. Rebind only to the exact card named by this discard
        // event; a generic loose-zone lookup here would resurrect unrelated/returned cards.
        const discarded = this.discardedStackSourceContextPayload(sub, payload);
        if (discarded === undefined) return undefined;
        const discardedSource = this.findLooseInstance(sub.sourceInstanceId);
        if (discardedSource === undefined) return undefined;
        const context = this.buildEffectContext(this.cardSourceOf(discardedSource), discarded.payload);
        context.discardedStackSourceProof = discarded.proof;
        return context;
      }
      return this.buildEffectContext(this.cardSourceOf(sourceInstance ?? srcPerm.topCard), payload);
    }
    if (sub.sourceInstanceId !== undefined) {
      // `findLooseInstance` searches EVERY zone, so the zone recorded at install time is the
      // only thing keeping a trash/hand/security watcher from firing after its card moved
      // (CR §15-4-4-3; KB Q2671, Q2805). Checked before the lookup so a security card flipped
      // face-down — which `findLooseInstance` simply stops seeing — still latches as departed.
      // A hand-resident watcher for "when this card is trashed from your hand" activates
      // because its source JUST moved from hand to trash. Preserve that one event's source
      // through context construction; every later event still observes the departed hand
      // root and drops the watcher normally.
      const activatesFromItsOwnHandTrash =
        sub.event === "whenTrashedFromHand" && payload.trashedFromHandInstanceId === sub.sourceInstanceId;
      if (!activatesFromItsOwnHandTrash && this.looseSourceLeftInstallZone(sub, sub.sourceInstanceId)) return undefined;
      const loose = this.findLooseInstance(sub.sourceInstanceId);
      if (loose === undefined) return undefined;
      const discarded = this.discardedStackSourceContextPayload(sub, payload);
      const context = this.buildEffectContext(this.cardSourceOf(loose), discarded?.payload ?? payload);
      if (discarded !== undefined) context.discardedStackSourceProof = discarded.proof;
      return context;
    }
    if (sub.activationContext !== undefined) {
      return { ...sub.activationContext, trigger: payload, selections: new Map() };
    }
    return undefined;
  }

  /**
   * Has this loose-anchored watcher's source card left the root zone it was installed from?
   * CR §15-4-4-3 (KB Q2671, Q2805): the card must still be in the trash, still in the hand, or
   * still in security AND face-up — otherwise the pending effect can no longer activate.
   *
   * Only a zone-resident watcher carries a recorded zone (see `SubTriggerSubscription`'s
   * `sourceRootZone`); everything else is never dropped by this check — an already-activated
   * effect's one-shot consequence (Q1495), a source in no nameable zone (§9-1-4), and a
   * permanent-anchored watcher, whose lifecycle `dropPermanent` already owns.
   *
   * Departure LATCHES: once observed, the watcher stays dead even if the card returns, so a
   * trash -> hand -> trash round trip inside one window cannot revive it (§15-4-4-3) — the same
   * one-way semantics as `everCollected`/`departed` in `effects/stack.ts`. Like those sets, this
   * can only observe moves that happen BETWEEN context builds: a move made and undone inside a
   * single effect body is invisible to it (see the note in `stack.test.ts`).
   */
  private looseSourceLeftInstallZone(sub: SubTriggerSubscription, sourceInstanceId: string): boolean {
    if (sub.sourceRootZone === undefined) return false;
    if (sub.sourceRootZoneDeparted === true) return true;
    if (rootZoneOfLooseInstance(this.state, sourceInstanceId) === sub.sourceRootZone) return false;
    sub.sourceRootZoneDeparted = true;
    return true;
  }

  /**
   * Fire a DEFERRED snapshot: watchers whose event already happened but whose activation waited
   * for the resolving effect (a security removal) or the rule fixpoint to finish. They are still
   * simultaneous triggers of one event, so several of them are ordered by their controller just
   * like an immediate fire.
   */
  private async fireSubTriggerSnapshot(
    subscriptions: readonly SubTriggerSubscription[],
    payload: TriggerInfo,
    boundContexts?: ReadonlyMap<number, EffectContext>,
  ): Promise<void> {
    const armed = this.armedSubTriggers(subscriptions, payload, boundContexts);
    if (armed.length > 1) {
      await this.runSubTriggersInChosenOrder(armed);
    } else {
      await this.subTriggers.fireSnapshot(
        subscriptions,
        (sub) => boundContexts?.get(sub.id) ?? this.buildSubTriggerContext(sub, payload),
        this.activeWindowToken,
        this.subTriggerTurnLedger(),
        (sub) => this.consumedSubTriggerKeys.has(subTriggerIdentity(sub)),
        (sub, ctx) => this.announceSubTrigger(sub, ctx),
      );
    }
    await this.recomputeContinuousEffects();
  }

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
        this.continuousMode = true;
        try {
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
          let seed = this.continuousDpSeeds();
          let converged = false;
          for (let pass = 0; pass < maxFixpointPasses; pass++) {
            await this.continuousScope.run(true, () => this.runContinuousPass(noPromptAsk, seed));
            this.updateContinuousDpSeeds();
            const next = this.continuousDpSeeds();
            if (sameNumericMap(seed, next)) {
              converged = true;
              break;
            }
            seed = next;
          }
          if (!converged) {
            throw new Error(`continuous effects did not converge after ${maxFixpointPasses} passes`);
          }
        } finally {
          this.continuousMode = false;
        }
      } while (this.recomputeQueued);

      this.syncActivatableEffects();
      this.syncKeywords();
      this.syncSummoningSickness();
      this.syncRestrictions();
      this.syncAttackTargets();
      this.syncHandAffordances();
    });
    this.recomputeInFlight = task;
    try {
      await task;
    } finally {
      if (this.recomputeInFlight === task) this.recomputeInFlight = undefined;
    }
  }

  /** Capture continuous DP deltas without including one-shot duration modifiers. */
  private continuousDpSeeds(): Map<string, number> {
    const seeds = new Map<string, number>();
    const liveIds = new Set<string>();
    for (const player of this.state.players) {
      const permanents = player.breeding === undefined ? player.battleArea : [...player.battleArea, player.breeding];
      for (const permanent of permanents) {
        liveIds.add(permanent.permanentId);
        const seed = this.continuousDpSeedState.get(permanent.permanentId);
        if (seed !== undefined && seed !== 0) seeds.set(permanent.permanentId, seed);
      }
    }
    for (const permanentId of this.continuousDpSeedState.keys()) {
      if (!liveIds.has(permanentId)) this.continuousDpSeedState.delete(permanentId);
    }
    return seeds;
  }

  private updateContinuousDpSeeds(): void {
    const liveIds = new Set<string>();
    for (const player of this.state.players) {
      const permanents = player.breeding === undefined ? player.battleArea : [...player.battleArea, player.breeding];
      for (const permanent of permanents) {
        const permanentId = permanent.permanentId;
        liveIds.add(permanentId);
        if (!this.modifiers.hasContinuousDp(permanentId)) {
          this.continuousDpSeedState.delete(permanentId);
          continue;
        }
        const contribution = this.modifiers.continuousDpSeed(this.state, permanentId);
        if (contribution === 0) this.continuousDpSeedState.delete(permanentId);
        else this.continuousDpSeedState.set(permanentId, contribution);
      }
    }
    for (const permanentId of this.continuousDpSeedState.keys()) {
      if (!liveIds.has(permanentId)) this.continuousDpSeedState.delete(permanentId);
    }
  }

  /**
   * The number of security cards an attack by `permanentId` checks. Single reader for both
   * the live security-check loop (`strikeFor`) and the {@link syncRestrictions}
   * projection, so the inspector value cannot drift from the rule.
   */
  private securityStrikeFor(permanentId: string): number {
    // When SA-sign inversion is active on the attacker, each existing ＜Security Attack ±N＞
    // grant has its amount NEGATED per-instance before summing (two ＜SA -1＞ → two ＜SA +1＞ =
    // +2 to the strike, NOT ＜SA +2＞ recomputed). The sign is applied per grant inside the
    // reduce, so the composition is faithful to the per-instance flip with no value math here.
    const invert = this.continuous.securityAttackInverted(permanentId);
    const saGrants = this.continuous.grantedKeywords(permanentId).filter((g) => g.keyword === "SecurityAttack");
    return securityStrikeCount(saGrants, invert);
  }

  /**
   * Publish the blanket restrictions imposed on each permanent, plus its resolved
   * ＜Security Attack＞ count. Both seats and every phase, like {@link syncSummoningSickness}
   * and unlike {@link syncAttackTargets}: these are board-state facts about the permanent
   * itself, not "can this attack be declared right now", so the client can pulse a freeze
   * the moment a restriction lands, wear a standing debuff badge for as long as one holds,
   * and show a truthful strike count in the inspector.
   */
  private syncRestrictions(): void {
    for (const player of this.state.players) {
      for (const perm of player.battleArea) this.projectRestrictions(perm);
      // A permanent in the raising area can neither attack nor block by the rules of the
      // area itself, so those two have nothing to add there; the unsuspend and [When
      // Digivolving] locks do apply in the raising area, and {@link projectRestrictions}
      // publishes every one of them from the same ledger the rules read.
      if (player.breeding) this.projectRestrictions(player.breeding);
    }
  }

  private projectRestrictions(perm: Permanent): void {
    perm.cannotAttack = this.continuous.hasRestriction(perm.permanentId, "attack");
    perm.cannotBlock = this.continuous.hasRestriction(perm.permanentId, "block");
    perm.cannotUnsuspend = this.continuous.hasRestriction(perm.permanentId, "unsuspend");
    perm.cannotActivateWhenDigivolving = this.continuous.hasRestriction(
      perm.permanentId,
      "cannotActivateWhenDigivolving",
    );
    perm.securityAttack = this.securityStrikeFor(perm.permanentId);
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
    this.applySuspendRestrictionRecompute();

    // A seed is only an input to this pass. Recompute every seeded permanent from the rebuilt
    // ledgers so a gate that stopped matching cannot leave the seed's stale DP visible.
    for (const permanentId of seed.keys()) this.modifiers.recomputeDP(this.state, permanentId);
  }

  /**
   * BT23-024 suspend-restriction-with-superlative-exception. For each ARMED source (its [All
   * Turns] link trigger fired `ArmSuspendRestriction` this turn), restrict every OPPONENT
   * battle-area Digimon from suspending EXCEPT the recomputed highest-play-cost one. The exempt
   * set tracks the live board: a newly-played higher-cost Digimon becomes exempt and the prior
   * top loses its exemption (Q5250/Q5251); removing the top re-exempts the next (Q5252); if no
   * opponent Digimon has a play cost, NONE is exempt and all are restricted (Q6025/Q6026). The
   * recorded restrictions are CONTINUOUS, so the recompute's `clearContinuous` drops the prior
   * pass's set before this re-derives it — no accumulation (CR-01). The consume-site is
   * combat/legality.canAttackerDeclare (a "can't suspend" Digimon can't declare a tapping attack).
   */
  private applySuspendRestrictionRecompute(): void {
    for (const player of this.state.players) {
      for (const armer of player.battleArea) {
        if (!this.continuous.hasSuspendRestrictionSource(armer.permanentId)) continue;
        const opponentSeat = this.access.opponentOf(armer.controllerSeat);
        const opponentDigimon = this.access
          .player(opponentSeat)
          .battleArea.filter((p) => this.access.isBattleAreaDigimon(p));
        const exemptIds = this.highestPlayCostExemptions(opponentDigimon);
        for (const target of opponentDigimon) {
          if (exemptIds.has(target.permanentId)) continue;
          this.continuous.addRestriction(target.permanentId, "suspend", EffectDuration.UntilOpponentTurnEnd, {
            continuous: true,
          });
        }
      }
    }
  }

  /**
   * The set of permanents EXEMPT from the BT23-024 suspend restriction: those tied for the highest
   * play cost in `pool`. Permanents with no play cost never qualify (Q6025/Q6026 — when NONE has a
   * cost the set is empty and all are restricted). On a tie the KB exempts EACH highest-cost
   * Digimon (Q5249 "either can be suspended"), so the whole tied group is returned.
   */
  private highestPlayCostExemptions(pool: readonly Permanent[]): Set<string> {
    let best = Number.NEGATIVE_INFINITY;
    const costs = new Map<string, number>();
    for (const p of pool) {
      if (p.topCard === undefined) continue;
      const cost = lookupDefinition(p.topCard.cardId)?.playCost;
      if (cost === undefined) continue;
      costs.set(p.permanentId, cost);
      if (cost > best) best = cost;
    }
    const exempt = new Set<string>();
    if (best === Number.NEGATIVE_INFINITY) return exempt; // no opponent Digimon has a play cost
    for (const [id, cost] of costs) if (cost === best) exempt.add(id);
    return exempt;
  }

  /**
   * Recompute which [Main] activated abilities are currently usable for the turn
   * player's battle-area/breeding permanents, hand cards and trash cards. The server projects the result
   * onto each source so the client can render affordances without embedding rules
   * logic. Hand is private state; loose-card projections are cleared before every
   * pass so an ability cannot leak after the card changes zones.
   */
  private syncActivatableEffects(): void {
    for (const instance of this.listCandidateInstances()) instance.activatableEffectsJson = "";
    for (const player of this.state.players) {
      for (const p of player.battleArea) p.activatableEffectsJson = "";
      if (player.breeding) player.breeding.activatableEffectsJson = "";
    }
    if (this.state.phase !== Phase.Main) return;

    const turnPlayer = this.state.players[this.state.turnSeat];
    if (!turnPlayer) return;

    const activatablePermanents = [...turnPlayer.battleArea];
    if (turnPlayer.breeding !== undefined) activatablePermanents.push(turnPlayer.breeding);
    for (const perm of activatablePermanents) {
      const entries: { instanceId: string; effectKey: string; description: string }[] = [];
      const candidates = [perm.topCard, ...perm.stack, ...perm.linked].filter(Boolean);
      for (const { source, effect } of this.activatableEffectsFor(candidates)) {
        entries.push({
          instanceId: source.instanceId,
          effectKey: effect.effectKey,
          description: effect.description,
        });
      }
      perm.activatableEffectsJson = entries.length ? JSON.stringify(entries) : "";
    }

    for (const instance of turnPlayer.hand) {
      const entries: { instanceId: string; effectKey: string; description: string }[] = [];
      for (const { source, effect } of this.activatableEffectsFor([instance])) {
        entries.push({
          instanceId: source.instanceId,
          effectKey: effect.effectKey,
          description: effect.description,
        });
      }
      instance.activatableEffectsJson = entries.length ? JSON.stringify(entries) : "";
    }

    // `[Trash][Main]` abilities are activated from their card's actual trash-zone
    // instance (Q5653), just as hand-resident Main abilities are projected from hand.
    // `canTrigger` keeps ordinary Main effects out because only effects registered with
    // `isFromTrash` accept a source whose current zone is trash.
    for (const instance of turnPlayer.trash) {
      const entries: { instanceId: string; effectKey: string; description: string }[] = [];
      for (const { source, effect } of this.activatableEffectsFor([instance])) {
        entries.push({
          instanceId: source.instanceId,
          effectKey: effect.effectKey,
          description: effect.description,
        });
      }
      instance.activatableEffectsJson = entries.length ? JSON.stringify(entries) : "";
    }
  }

  /**
   * Collect currently usable [Main] effects for these physical cards, including
   * own effects conferred from a buried digivolution card onto its host.
   */
  private activatableEffectsFor(instances: readonly CardInstance[]): CollectedEffect[] {
    return gatherTriggeredEffects(this.effectEnvironment({}), ACTIVATE_TIMING, instances).filter((collected) =>
      canActivate(collected.effect, this.activationContext(collected), this.tracker),
    );
  }

  /** Build a direct-activation context while retaining stack-conferral provenance. */
  private activationContext(collected: CollectedEffect): EffectContext {
    return {
      ...this.buildEffectContext(collected.source, {}),
      activeTiming: collected.effect.irTrigger ?? EffectTiming[ACTIVATE_TIMING],
      activeEffectText: collected.effect.description,
      activeEffectKey: collected.effect.effectKey,
      ...(collected.conferredToPermanentId === undefined
        ? {}
        : { conferredToPermanentId: collected.conferredToPermanentId }),
      ...(collected.conferralGranterInstanceId === undefined
        ? {}
        : { conferralGranterInstanceId: collected.conferralGranterInstanceId }),
    };
  }

  /**
   * Re-derive each permanent's resolved keyword list (printed icons ∪ continuous grants)
   * into the synchronized `Permanent.keywords` field so the client can drive keyword-gated
   * affordances (e.g. a ＜Vortex＞ attack) without embedding rules logic. Both seats'
   * battle areas plus breeding are projected (keywords are public information). Run after
   * the continuous-recompute pass has re-derived the grant store, so grants are reflected.
   */
  private syncKeywords(): void {
    for (const player of this.state.players) {
      for (const perm of player.battleArea) this.projectKeywords(perm);
      if (player.breeding) this.projectKeywords(player.breeding);
    }
  }

  private projectKeywords(perm: Permanent): void {
    const resolved = resolveKeywords(perm, this.continuous);
    const granted = new Set(this.continuous.grantedKeywords(perm.permanentId).map(({ keyword }) => keyword));
    // Temporary Piercing grants live in the battle modifier ledger because
    // combat consumes them directly. Publish that active state too; otherwise
    // the client either hides a real grant or has to guess from card prose.
    if (this.modifiers.hasPierce(perm.permanentId) && !resolved.includes("Piercing")) {
      resolved.push("Piercing");
      granted.add("Piercing");
    }
    replaceIfChanged(perm.keywords, resolved);
    replaceIfChanged(perm.grantedKeywords, [...granted]);
    replaceIfChanged(perm.digiXrosNames, this.continuous.grantedDigiXrosNames(perm.permanentId));
  }

  /**
   * Publish which permanents entered the field this turn without ＜Rush＞, i.e. which ones
   * cannot declare an ordinary attack yet (Comprehensive Rules §16-1). Both seats and every
   * phase, unlike {@link syncAttackTargets}: the client draws the summoning-sickness ring
   * from this flag and must not re-derive the rule from `enterFieldTurnCount`.
   */
  private syncSummoningSickness(): void {
    for (const player of this.state.players) {
      for (const perm of player.battleArea) {
        perm.summoningSick = hasSummoningSickness(perm, this.state.turnCount, this.continuous);
      }
      // A permanent in the raising area cannot attack at all, so summoning sickness has
      // nothing to say about it.
      if (player.breeding) player.breeding.summoningSick = false;
    }
  }

  /**
   * Publish the exact attack targets accepted by the server's combat legality seam.
   * This keeps click, drag and highlighting clients correct for unsuspended-target
   * grants and target-specific restrictions without duplicating card rules in React.
   */
  private syncAttackTargets(): void {
    for (const player of this.state.players) {
      for (const perm of player.battleArea) clearAttackProjection(perm);
      if (player.breeding) clearAttackProjection(player.breeding);
    }

    const seat = this.state.turnSeat;
    const player = this.state.players[seat];
    const opponent = this.state.players[this.access.opponentOf(seat)];
    if (!player || !opponent) return;
    const deps = this.attackDeps();
    for (const attacker of player.battleArea) {
      // Once memory has crossed, only a Blitz opportunity explicitly accepted by the
      // player is actionable. Before acceptance the decision overlay owns the input.
      if (this.memory.hasCrossedToOpponent() && !this.acceptedBlitzAttackers.has(attacker.permanentId)) continue;
      attacker.canAttackPlayer =
        validateAttack(deps, seat, {
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }) === null;
      for (const defender of opponent.battleArea) {
        const legal =
          validateAttack(deps, seat, {
            attackerPermanentId: attacker.permanentId,
            target: { kind: "permanent", permanentId: defender.permanentId },
          }) === null;
        if (legal) attacker.attackablePermanentIds.push(defender.permanentId);
      }
      // The ＜Vortex＞ declaration is a separate legality question (§16-33 / §16-33-1),
      // so it gets its own pass — but only for a Digimon that actually has the keyword,
      // which is the overwhelming majority-case skip.
      if (!attacker.keywords.includes("Vortex")) continue;
      attacker.canVortexAttackPlayer =
        validateAttack(deps, seat, {
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
          vortex: true,
        }) === null;
      for (const defender of opponent.battleArea) {
        const legal =
          validateAttack(deps, seat, {
            attackerPermanentId: attacker.permanentId,
            target: { kind: "permanent", permanentId: defender.permanentId },
            vortex: true,
          }) === null;
        if (legal) attacker.vortexAttackablePermanentIds.push(defender.permanentId);
      }
    }
  }

  /**
   * Publish, per card in the turn player's hand, whether it can be played right now and
   * which of that player's permanents it can legally digivolve onto — the play-side
   * counterpart to {@link syncAttackTargets}. Hand is private state (`@view`-tagged), so
   * only its owner receives these fields; every other card's projection is cleared each
   * pass so an affordance cannot survive a zone change.
   *
   * A card whose only affordable route is a material declaration (DigiXros / Assembly)
   * cannot be validated without the materials the player has not chosen yet, so an
   * `insufficient-memory` rejection is not treated as unplayable for those cards: the
   * cost reduction is applied from the declaration. Every other rejection still hides it.
   */
  private syncHandAffordances(): void {
    const seat = this.state.turnSeat;
    const turnPlayer = this.state.phase === Phase.Main ? this.state.players[seat] : undefined;
    const active =
      turnPlayer === undefined
        ? undefined
        : {
            player: turnPlayer,
            playDeps: this.playCardDeps(),
            digivolveDeps: this.digivolveDeps(),
            bases: [...turnPlayer.battleArea, ...(turnPlayer.breeding ? [turnPlayer.breeding] : [])],
          };

    // One pass that writes each card's final affordance, rather than clearing every hand and
    // refilling the turn player's: an ArraySchema splice is a wire-level change even when the
    // contents come back identical, and this projection runs on every continuous recompute.
    for (const player of this.state.players) {
      for (const instance of player.hand) {
        const definition =
          active !== undefined && player === active.player ? lookupDefinition(instance.cardId) : undefined;
        if (active === undefined || definition === undefined) {
          instance.playableFromHand = false;
          instance.projectedPlayCost = NO_PROJECTED_COST;
          replaceIfChanged(instance.digivolveTargetPermanentIds, NO_DIGIVOLVE_TARGETS);
          continue;
        }

        // A DigiEgg is never played from hand, so it skips the validation entirely.
        const playCheck = definition.kinds.includes(CardKind.DigiEgg)
          ? undefined
          : validatePlayCard(this.state, seat, { type: "playCard", instanceId: instance.instanceId }, active.playDeps);
        instance.playableFromHand = playCheck !== undefined && playableFromHand(playCheck, instance.cardId);
        // Only the success branch carries a cost. A card that reads as playable through the
        // material-route escape hatch was rejected for memory, so it has no figure to publish.
        instance.projectedPlayCost = playCheck?.ok === true ? playCheck.cost : NO_PROJECTED_COST;

        if (!definition.kinds.includes(CardKind.Digimon)) {
          replaceIfChanged(instance.digivolveTargetPermanentIds, NO_DIGIVOLVE_TARGETS);
          continue;
        }
        const targets: string[] = [];
        for (const base of active.bases) {
          const check = validateDigivolve(
            this.state,
            seat,
            { type: "digivolve", permanentId: base.permanentId, instanceId: instance.instanceId },
            active.digivolveDeps,
          );
          if (check.ok) targets.push(base.permanentId);
        }
        replaceIfChanged(instance.digivolveTargetPermanentIds, targets);
      }
    }
  }

  /**
   * Fire a timing window scoped to one source instance (subsystem:
   * effect-stack-resolution). The play-card verb fires On Play for a newly placed
   * permanent and the option activation for an Option card; only the played card's
   * effects should fire at that window (the rest of the board is not triggering on
   * its own play here), so the candidate set is narrowed to that single instance.
   *
   * `trigger` is carried into the window's `ctx.trigger` (e.g. `enteredByEffect` for an
   * effect-driven play/digivolve — see {@link fireEnteredByEffectTiming}). Each window's
   * environment carries its OWN trigger payload (no shared engine field), so firing NESTED
   * inside an outer effect's resolution — or interleaved with a concurrent one — can never
   * strip or clobber another window's trigger.
   */
  private async fireTimingForInstance(
    timing: EffectTiming,
    sourceInstanceId: string,
    trigger: TriggerInfo = {},
  ): Promise<void> {
    if (this.shouldDeferNestedTiming()) {
      await this.recomputeContinuousEffects();
      this.deferNestedTimingEffects(timing, trigger, this.instancesById([sourceInstanceId]));
      return;
    }
    const wasOutermostWindow = this.beginResolvingWindow();
    try {
      await this.recomputeContinuousEffects();
      await runTiming(
        timing,
        this.effectEnvironment(trigger),
        this.resolutionDeps(() => this.instancesById([sourceInstanceId]), { outermost: wasOutermostWindow }),
      );
      if (wasOutermostWindow) {
        await this.flushDeferredTimingWindows();
        await this.flushDeferredSecurityRemovalTriggers();
      }
      await this.recomputeContinuousEffects();
    } finally {
      this.endResolvingWindow(wasOutermostWindow);
    }
  }

  /**
   * Fire `timing` scoped to a single permanent (its top card plus its digivolution-stack
   * and linked cards). The [When Digivolving] / [When Attacking] windows are the
   * permanent's OWN timing — they must NOT collect the same timing from OTHER permanents
   * on the board. Cross-permanent reactions ("when one of your Digimon digivolves")
   * go through `fireSubTrigger` watchers, not this window.
   */
  private async fireTimingForPermanent(
    timing: EffectTiming,
    permanent: Permanent,
    trigger: TriggerInfo = {},
  ): Promise<void> {
    if (this.shouldDeferNestedTiming()) {
      await this.recomputeContinuousEffects();
      const scoped: CardInstance[] = [];
      this.collectPermanentInstances(permanent, scoped);
      this.deferNestedTimingEffects(timing, trigger, scoped);
      return;
    }
    const wasOutermostWindow = this.beginResolvingWindow();
    // Freeze the subject instance set at window open. The resolver re-collects every pass
    // (to fold in effects that BECOME active during resolution), but a card that digivolves
    // onto this permanent MID-WINDOW would otherwise be re-collected here and have its
    // WhenDigivolving fired a SECOND time — it already fired through the effect-driven entry
    // seam (`fireEnteredByEffect` -> `fireTimingForInstance`). Restricting the live re-collect
    // to instances present at open keeps genuine re-triggers on those same instances while
    // excluding a newly-arrived top card (a distinct instanceId).
    const subjectInstanceIds = new Set<string>();
    {
      const opening: CardInstance[] = [];
      this.collectPermanentInstances(permanent, opening);
      for (const instance of opening) subjectInstanceIds.add(instance.instanceId);
    }
    try {
      await this.recomputeContinuousEffects();
      await runTiming(
        timing,
        this.effectEnvironment(trigger),
        this.resolutionDeps(
          () => {
            const scoped: CardInstance[] = [];
            this.collectPermanentInstances(permanent, scoped);
            return scoped.filter((instance) => subjectInstanceIds.has(instance.instanceId));
          },
          { outermost: wasOutermostWindow },
        ),
      );
      if (wasOutermostWindow) {
        await this.flushDeferredTimingWindows();
        await this.flushDeferredSecurityRemovalTriggers();
      }
      await this.recomputeContinuousEffects();
    } finally {
      this.endResolvingWindow(wasOutermostWindow);
    }
  }

  /**
   * The entry windows one PLAY opens, as a single pool: the played card's own [On Play], the
   * board-wide enter-field window, and every armed `whenPlayed` watcher ("when you play a green
   * Tamer, draw 1"). Shared by every play seam (playCard, DigiXros, Assembly) so they sequence
   * identically. Only `OnPlay` carries the board-wide half; any other timing just fires scoped.
   *
   * The pool is snapshotted from the board as it is when the card ENTERS, which is when those
   * triggers are determined. The trailing bus resolves only that snapshot: a watcher gained
   * during this play's windows did not exist when the event happened (BT13-013, Q2272).
   */
  private async firePlayEntryWindows(
    timing: EffectTiming,
    sourceInstanceId: string,
    scopedTrigger: TriggerInfo = {},
  ): Promise<void> {
    if (timing !== EffectTiming.OnPlay) {
      await this.fireTimingForInstance(timing, sourceInstanceId, scopedTrigger);
      return;
    }
    const entryPermanentId = this.findInstance(sourceInstanceId)?.permanent?.permanentId;
    const playedEventTrigger = { ...this.playedTrigger(entryPermanentId), entryCause: "play" as const };
    if (entryPermanentId !== undefined) {
      this.materializePlayerCustomEffects(this.access.permanentById(entryPermanentId));
    }
    // The played card is already in the battle area when its play event happens, so its
    // resident `whenPlayed` watchers are eligible to trigger on that same event (BT25-028;
    // BT22-039 Q4893). Install those entry-state subscriptions before taking the event
    // snapshot. Effects gained later while [On Play] resolves remain excluded by
    // `onlyInitiallyArmed`, preserving the trigger-time snapshot rule (BT13-013 Q2272).
    await this.recomputeContinuousEffects();
    await this.withPendingSubTriggers(
      ["whenPlayed", "onEnterFieldAnyone"],
      playedEventTrigger,
      async () => {
        // State-based rules run after the card enters and continuous effects apply, before
        // its triggered On Play effect can activate. Keep the play-event snapshot above so
        // other when-played watchers still observe the event even if a 0-DP entrant is deleted
        // here and its own On Play source becomes ineligible (EX4-074 Q3523).
        await this.ruleProcess();
        await this.fireTimingForInstance(timing, sourceInstanceId, scopedTrigger);
        await this.fireTiming(EffectTiming.OnEnterFieldAnyone, {
          ...(entryPermanentId !== undefined ? { subjectPermanentId: entryPermanentId } : {}),
          entryCause: "play",
        });
      },
      {
        onlyInitiallyArmed: true,
        busTrigger: () => playedEventTrigger,
      },
    );
  }

  /** Materialize filtered player-scoped named grants before a new permanent's On Play window. */
  private materializePlayerCustomEffects(permanent: Permanent | undefined): void {
    const top = permanent?.topCard;
    if (permanent === undefined || top === undefined) return;
    for (const grant of this.continuous.playerCustomEffectsFor(permanent.permanentId, permanent.controllerSeat)) {
      this.continuous.addCustomEffectGrant(top.instanceId, top.ownerSeat, grant.token, grant.duration, {
        activationIdentity: grant.activationIdentity,
      });
    }
  }

  /** The `whenPlayed` payload for a played permanent: its subject id plus its printed level/cost. */
  private playedTrigger(playedPermanentId: string | undefined): TriggerInfo | undefined {
    if (playedPermanentId === undefined) return undefined;
    const played = this.access.permanentById(playedPermanentId);
    const definition = played?.topCard === undefined ? undefined : definitionOf(played.topCard.cardId);
    return {
      subjectPermanentId: playedPermanentId,
      ...(definition?.level !== undefined ? { playedLevel: definition.level } : {}),
      ...(definition?.playCost !== undefined ? { playedPlayCost: definition.playCost } : {}),
    };
  }

  /**
   * Producer for the `triggerEnteredByEffect` gate (BT25-084): an EFFECT just played or
   * digivolved `instanceId` into the battle area, so fire that card's OWN [On Play] /
   * [When Digivolving] window with `enteredByEffect` set to its controller's seat. This
   * is also the seam that makes an effect-played Digimon's [On Play] fire AT ALL — the
   * effect-driven play/digivolve verbs (`playInstances` / `digivolveFromInstance` /
   * `dnaDigivolveInto`) previously placed the permanent without firing its entry window.
   * A MANUAL hard play/digivolve takes the play/digivolve action's own seam (no
   * `enteredByEffect`), so the by-effect gate stays false there.
   */
  private async fireEnteredByEffectTiming(
    timing: EffectTiming,
    instanceId: string,
    ownerSeat: Seat,
    opts?: {
      isDnaDigivolve?: boolean;
      digivolvedFromZone?: ZoneRef;
      playedFromZone?: ZoneRef;
      digiXrosMaterialCount?: number;
      playedByEffectSourceCardId?: string;
    },
  ): Promise<void> {
    const attackerPermanentId = this.combat?.currentAttackerId;
    const subjectPermanent = this.findInstance(instanceId)?.permanent;
    if (subjectPermanent !== undefined) subjectPermanent.enteredByEffect = true;
    if (timing === EffectTiming.OnPlay) this.materializePlayerCustomEffects(subjectPermanent);
    // Effect-driven digivolutions are genuine digivolutions for "digivolved this turn"
    // conditions (BT1-007 Q871). As with the manual action seam, breeding-area evolutions
    // remain excluded unless card text explicitly references that area (Q870).
    if (timing === EffectTiming.WhenDigivolving && subjectPermanent !== undefined && !subjectPermanent.inBreeding) {
      this.tracker.register(`seat:${ownerSeat}`, "digivolvedThisTurn");
    }
    await this.fireTimingForInstance(timing, instanceId, {
      enteredByEffect: ownerSeat,
      ...(attackerPermanentId !== undefined ? { attackerPermanentId } : {}),
      ...(opts?.isDnaDigivolve === true ? { isDnaDigivolve: true } : {}),
      ...(opts?.digivolvedFromZone !== undefined ? { digivolvedFromZone: opts.digivolvedFromZone } : {}),
      ...(opts?.playedFromZone !== undefined ? { playedFromZone: opts.playedFromZone } : {}),
      ...(opts?.digiXrosMaterialCount !== undefined ? { digiXrosMaterialCount: opts.digiXrosMaterialCount } : {}),
      ...(opts?.playedByEffectSourceCardId !== undefined
        ? { playedByEffectSourceCardId: opts.playedByEffectSourceCardId }
        : {}),
    });
    const subjectPermanentId = subjectPermanent?.permanentId;
    if (subjectPermanentId === undefined) return;
    if (timing === EffectTiming.OnPlay) {
      await this.fireTiming(EffectTiming.OnEnterFieldAnyone, {
        subjectPermanentId,
        entryCause: "play",
        enteredByEffect: ownerSeat,
      });
      await this.fireSubTrigger("onEnterFieldAnyone", {
        subjectPermanentId,
        entryCause: "play",
        enteredByEffect: ownerSeat,
      });
    } else if (timing === EffectTiming.WhenDigivolving) {
      await this.fireTiming(EffectTiming.OnEnterFieldAnyone, {
        subjectPermanentId,
        entryCause: "digivolve",
        enteredByEffect: ownerSeat,
        ...(opts?.isDnaDigivolve === true ? { isDnaDigivolve: true } : {}),
      });
      await this.fireSubTrigger("onEnterFieldAnyone", {
        subjectPermanentId,
        entryCause: "digivolve",
        enteredByEffect: ownerSeat,
        ...(opts?.isDnaDigivolve === true ? { isDnaDigivolve: true } : {}),
      });
      await this.fireSubTrigger("whenOneOfYoursDigivolves", {
        subjectPermanentId,
        enteredByEffect: ownerSeat,
        ...(opts?.isDnaDigivolve === true ? { isDnaDigivolve: true } : {}),
        ...(opts?.digivolvedFromZone !== undefined ? { digivolvedFromZone: opts.digivolvedFromZone } : {}),
      });
      await this.fireSubTrigger("whenAnyDigivolves", {
        subjectPermanentId,
        enteredByEffect: ownerSeat,
        ...(opts?.isDnaDigivolve === true ? { isDnaDigivolve: true } : {}),
        ...(opts?.digivolvedFromZone !== undefined ? { digivolvedFromZone: opts.digivolvedFromZone } : {}),
      });
    }
  }

  /**
   * Re-activate one (or, with `chooseOne: false`, ALL) of a TARGET permanent's own effects at
   * the given timing(s) — generalized from EX3-065's original "activate 1 of that Digimon's
   * [On Play] effects" (`timings` defaults to `[OnPlay]`, matching EX3-065 exactly) to also
   * cover BT11-112 ("[When Digivolving] effects"), BT24-102 ("[On Play] or [When Digivolving]
   * effect" — a combined pool across both timings), BT22-092 ("[Main] effects", i.e.
   * `EffectTiming.OnDeclaration`), and BT15-041 ("activate the [When Digivolving] effects" —
   * plural: `chooseOne: false` runs every matching effect instead of picking one).
   *
   * A genuine re-fire of another card's timing effect (not a proxy): each chosen effect
   * resolves with the TARGET permanent's top card as source, so its actions belong to that
   * Digimon and its controller. Collects the target's non-security effects across every listed
   * timing; with 2+ candidates and `chooseOne`, asks the target's controller to pick exactly
   * one (KB Q3430/Q3431 for the OnPlay case).
   *
   * Returns whether an effect actually resolved (false when there were no eligible candidates,
   * or the chosen one's `canActivate` failed) — BT22-092's "if this activated any effect, gain
   * 1 memory" reads this result rather than assuming success.
   */
  private async reactivateOnPlay(
    permanentId: string,
    opts?: { timings?: EffectTiming[]; chooseOne?: boolean; outsideTriggerWindow?: boolean },
  ): Promise<boolean> {
    const permanent = this.access.permanentById(permanentId);
    if (permanent?.topCard === undefined) return false;
    const timings = opts?.timings ?? [EffectTiming.OnPlay];
    const chooseOne = opts?.chooseOne ?? true;
    // Both gates, matching every other manual-resolution path (e.g. syncActivatableEffects,
    // fireBeforePayCost): canTrigger encodes the effect's declared `when` condition, which
    // canActivate alone does not — an effect whose trigger condition no longer holds must not
    // be offered/resolved even if its (often unconditional) canActivate would pass.
    const candidates = [permanent.topCard, ...permanent.stack]
      .flatMap((instance) => {
        const source = this.cardSourceOf(instance);
        const ctx: EffectContext = { ...this.buildEffectContext(source, {}), selections: new Map() };
        return timings.flatMap((timing) => effectsOf(timing, source).map((effect) => ({ effect, source, ctx })));
      })
      .filter(({ effect }) => !effect.isSecurity)
      .filter(({ effect, ctx }) => opts?.outsideTriggerWindow === true || canTrigger(effect, ctx, this.tracker));
    if (candidates.length === 0) return false;
    if (!chooseOne) {
      let activatedAny = false;
      for (const { effect, ctx } of candidates) {
        if (!canActivate(effect, ctx, this.tracker)) continue;
        await effect.resolve(ctx);
        activatedAny = true;
      }
      await this.recomputeContinuousEffects();
      return activatedAny;
    }
    let chosen = candidates[0]!;
    if (candidates.length > 1) {
      const index = await this.decisionApi.chooseOption(
        chosen.ctx,
        candidates.map(({ effect }) => effect.description),
      );
      chosen = candidates[index] ?? candidates[0]!;
    }
    if (!canActivate(chosen.effect, chosen.ctx, this.tracker)) return false;
    await chosen.effect.resolve(chosen.ctx);
    await this.recomputeContinuousEffects();
    return true;
  }

  /**
   * Read-only hand-use-cost projection for card filters such as LM-023's Q5516 clause.
   * It mirrors only automatic card-local would-be-played reducers; paid/optional reducers remain
   * unknown until the actual payment window and must not be assumed or consumed by targeting.
   */
  private projectLooseUseCost(instanceId: string, controllerSeat: Seat): number | undefined {
    const instance = this.findLooseInstance(instanceId);
    if (instance === undefined) return undefined;
    const source = this.cardSourceOf(instance);
    const baseCost = this.modifiers.playCostFor(
      { def: source.definition, controllerSeat },
      Math.max(0, source.definition.playCost),
    );
    if (this.continuous.blocksCostReduction(controllerSeat, "play")) return baseCost;
    const ctx: EffectContext = { ...this.buildEffectContext(source, {}), selections: new Map() };
    const reduction = wouldBePlayedSelfReducersFor(instance.cardId).reduce(
      (total, reducer) => total + potentialWouldBePlayedSelfReduction(ctx, reducer),
      0,
    );
    return Math.max(0, baseCost - reduction);
  }

  /**
   * The pay-time interactive cost-reduction hook (subsystem: play-card / effect-framework). Fired
   * by the play action for the card being played WHILE IT IS STILL IN HAND, before memory is paid:
   * collect the played instance's `BeforePayCost` effects, resolve each through a single shared
   * EffectContext (so a `ReducePlayCost` action can run its OPTIONAL server-side payment — trash a
   * card / sacrifice a Digimon — and accumulate the earned delta on `ctx.playCostDelta`), then
   * return the FINAL cost floored at 0 (EX9-043 / BT25-076). The reduction is computed entirely
   * server-side — the client never supplies the delta (T-08-26 / T-08-27).
   *
   * This does NOT route through `runTiming`: that resolver narrates a triggered-effect stack and
   * cannot return a per-resolution value. The cost delta is a synchronous-within-await output of
   * the played card's own effects, so it is run directly against a focused context (mirroring the
   * `recomputeContinuousEffects` per-instance `resolve` loop), keeping the value observable.
   */
  private async fireBeforePayCost(
    instance: CardInstance,
    baseCost: number,
    useAsOption = false,
    originZone?: ZoneRef,
    projectOnly = false,
  ): Promise<number> {
    const source = this.cardSourceOf(instance);
    const reductionBlocked = this.continuous.blocksCostReduction(source.ownerSeat, "play");
    // A prohibition blocks the reduction, not its optional processing cost.
    // Projection stays read-only; an unaffordable blocked play cannot start paying
    // side-effect costs. Free plays enter this window with a zero base (Q4784).
    if (reductionBlocked && (projectOnly || this.memory.maxCostFor(source.ownerSeat) < baseCost)) return baseCost;
    const effects = effectsOf(EffectTiming.BeforePayCost, source).filter((effect) => effect.costWindow !== "digivolve");
    // Self-targeted "when this card would be played, [by cost / gated by condition], reduce by N"
    // reducers (EX8-074, BT17-068, BT12-112, BT8-043, BT9-097, ...): the runtime record compiled these as
    // inert `wouldBePlayed reduceCost` replacements (never consulted; `ReplacementSubscription.apply`
    // has no call site and self-reducers on a card still in hand never reach a Static continuous
    // recompute anyway). Run them here in the pay-time window alongside the BeforePayCost effects.
    const selfReducers = wouldBePlayedSelfReducersFor(instance.cardId);
    // Cross-permanent reducers: a permanent OTHER than the played card (BT10-093 / EX3-040)
    // that reduces the cost of a matching played card. Scanned so the early-return below does not
    // skip the pay-time window when only such a reducer applies.
    const crossWatchers = this.crossPermanentPlayReducerWatchers(instance, source.ownerSeat);
    const residentEffects = this.residentPlayCostEffects(source.ownerSeat);
    const breeding = this.state.players[source.ownerSeat]?.breeding;
    const breedingResidentEffects = [breeding?.topCard, ...Array.from(breeding?.stack ?? [])].flatMap((card, index) => {
      if (card === undefined) return [];
      const residentSource = this.cardSourceOf(card);
      return effectsOf(EffectTiming.BeforePayCost, residentSource)
        .filter((effect) => index === 0 || effect.isInherited)
        .map((effect) => ({ effect, source: residentSource }));
    });
    if (
      effects.length === 0 &&
      selfReducers.length === 0 &&
      crossWatchers.length === 0 &&
      residentEffects.length === 0 &&
      breedingResidentEffects.length === 0 &&
      !this.subTriggers.hasInteractiveReductionsFor("wouldBePlayed", source.ownerSeat)
    )
      return baseCost;
    // Seed `selections` so the interpreter's runEffect does NOT clone the context (it clones only
    // when `selections` is unset). The ReducePlayCost action writes the earned delta onto THIS
    // context's `playCostDelta`; a clone would strand the write and the reduction would be lost.
    const ctx: EffectContext = {
      ...this.buildEffectContext(source, {
        wouldBePlayedInstanceId: instance.instanceId,
        wouldBePlayedCardId: instance.cardId,
        wouldBePlayedAsOption: useAsOption,
      }),
      selections: new Map(),
    };
    const playTarget = new Permanent();
    playTarget.permanentId = `pending-play-${instance.instanceId}`;
    playTarget.controllerSeat = source.ownerSeat;
    setTopCard(playTarget, instance);
    playTarget.inBreeding = false;
    playTarget.baseDP = source.definition.dp ?? 0;
    playTarget.currentDP = playTarget.baseDP;
    if (projectOnly) {
      const selfReduction = selfReducers.reduce(
        (total, reducer) => total + potentialWouldBePlayedSelfReduction(ctx, reducer),
        0,
      );
      const interactiveReduction = this.subTriggers.potentialInteractiveReductionFor(
        "wouldBePlayed",
        source.ownerSeat,
        playTarget,
        source.definition,
        {
          hasFired: (key) => this.tracker.count(key, "replacement") > 0,
          markFired: (key) => this.tracker.register(key, "replacement"),
        },
        originZone,
      );
      return Math.max(0, baseCost - selfReduction - interactiveReduction);
    }
    for (const effect of effects) {
      if (!canTrigger(effect, ctx, this.tracker)) continue;
      if (!canActivate(effect, ctx, this.tracker)) continue;
      await effect.resolve(ctx);
    }
    // Generic battle-area pay-time watchers. Unlike the card being played, their
    // EffectContext source is the physical resident carrying the effect; the imminent
    // card identity is carried in TriggerInfo. This lets independent copies resolve and
    // account OPT separately while accumulating their reductions in the shared cost window.
    for (const { effect, source: residentSource } of residentEffects) {
      const residentCtx: EffectContext = {
        ...this.buildEffectContext(residentSource, {
          wouldBePlayedInstanceId: instance.instanceId,
          wouldBePlayedCardId: instance.cardId,
          wouldBePlayedAsOption: useAsOption,
        }),
        selections: new Map(),
        playCostDelta: ctx.playCostDelta,
      };
      if (!canTrigger(effect, residentCtx, this.tracker)) continue;
      if (!canActivate(effect, residentCtx, this.tracker)) continue;
      const beforeDelta = residentCtx.playCostDelta ?? 0;
      await effect.resolve(residentCtx);
      ctx.playCostDelta = residentCtx.playCostDelta;
      if ((residentCtx.playCostDelta ?? 0) > beforeDelta && effect.maxPerTurn > 0) {
        this.tracker.register(residentSource.instanceId, effect.effectKey);
      }
    }
    // [Breeding] inherited pay-time effects are supplied by cards in the owner's
    // breeding-area stack (the card being played is still in hand, so its own
    // module cannot host the watcher). Resolve these against the same shared
    // play-cost context so their reductions are paid before memory is charged.
    for (const { effect, source: residentSource } of breedingResidentEffects) {
      const residentCtx: EffectContext = {
        ...this.buildEffectContext(residentSource, {
          wouldBePlayedInstanceId: instance.instanceId,
          wouldBePlayedCardId: instance.cardId,
          wouldBePlayedAsOption: useAsOption,
        }),
        selections: new Map(),
        playCostDelta: ctx.playCostDelta,
      };
      if (!canTrigger(effect, residentCtx, this.tracker)) continue;
      if (!canActivate(effect, residentCtx, this.tracker)) continue;
      const beforeDelta = residentCtx.playCostDelta ?? 0;
      await effect.resolve(residentCtx);
      ctx.playCostDelta = residentCtx.playCostDelta;
      if ((residentCtx.playCostDelta ?? 0) > beforeDelta && effect.maxPerTurn > 0) {
        this.tracker.register(residentSource.instanceId, effect.effectKey);
      }
    }
    // Resolve interactive would-be-played subscriptions only after resident effects have run:
    // inherited [Breeding] reducers live in the breeding stack and install their subscription
    // during this very pay-time pass, so consulting earlier would miss the current play entirely.
    const interactiveReduction = await this.subTriggers.activateInteractiveReductionsFor(
      "wouldBePlayed",
      source.ownerSeat,
      playTarget,
      source.definition,
      undefined,
      (sourcePermanentId, sourceInstanceId) => {
        const resident =
          this.access.permanentById(sourcePermanentId) ??
          (this.state.players[source.ownerSeat]?.breeding?.permanentId === sourcePermanentId
            ? this.state.players[source.ownerSeat]?.breeding
            : undefined);
        return resident?.topCard === undefined
          ? undefined
          : this.buildEffectContext(
              this.cardSourceOf(this.findInstance(sourceInstanceId ?? "")?.instance ?? resident.topCard),
              {
                wouldBePlayedInstanceId: instance.instanceId,
                wouldBePlayedCardId: instance.cardId,
                wouldBePlayedAsOption: useAsOption,
              },
            );
      },
      {
        hasFired: (key) => this.tracker.count(key, "replacement") > 0,
        markFired: (key) => this.tracker.register(key, "replacement"),
      },
      undefined,
      originZone,
    );
    if (interactiveReduction > 0) ctx.playCostDelta = (ctx.playCostDelta ?? 0) + interactiveReduction;
    const passiveReduction = this.continuous.blocksCostReduction(source.ownerSeat, "play")
      ? 0
      : this.subTriggers.costReductionFor("wouldBePlayed", playTarget, source.definition, {
          consume: true,
          hasFired: (key) => this.tracker.count(key, "replacement") > 0,
          markFired: (key) => this.tracker.register(key, "replacement"),
        });
    if (passiveReduction > 0) ctx.playCostDelta = (ctx.playCostDelta ?? 0) + passiveReduction;
    for (const reducer of selfReducers) await applyWouldBePlayedSelfReducer(ctx, reducer);
    // A self-reducer's cost body may have selected a permanent (BT12-112's chosen [Shoutmon]) to
    // relocate under the played card's own permanent — which does not exist yet at this point. Stash
    // it for `placePendingDigivolution` to relocate once it does (see `pendingSelfReducerRelocations`).
    if (ctx.pendingSelfReducerRelocations && ctx.pendingSelfReducerRelocations.length > 0) {
      const pending = this.pendingSelfReducerRelocations.get(instance.instanceId) ?? [];
      this.pendingSelfReducerRelocations.set(instance.instanceId, [...pending, ...ctx.pendingSelfReducerRelocations]);
    }
    if (ctx.pendingSelfReducerPlacements && ctx.pendingSelfReducerPlacements.length > 0) {
      const pending = this.pendingPlayReducerPlacements.get(instance.instanceId) ?? [];
      this.pendingPlayReducerPlacements.set(instance.instanceId, [...pending, ...ctx.pendingSelfReducerPlacements]);
    }
    await this.runCrossPermanentPlayReducers(instance, ctx, crossWatchers);
    if (this.continuous.blocksCostReduction(source.ownerSeat, "play")) return baseCost;
    const delta = Math.max(0, ctx.playCostDelta ?? 0);
    return Math.max(0, baseCost - delta);
  }

  /** Resolve the in-hand half of BeforePayCost for an imminent digivolution. */
  private async fireBeforeDigivolveCost(instance: CardInstance, target: Permanent): Promise<void> {
    const source = this.cardSourceOf(instance);
    const effects = effectsOf(EffectTiming.BeforePayCost, source).filter((effect) => effect.costWindow === "digivolve");
    if (effects.length === 0) return;
    const ctx: EffectContext = {
      ...this.buildEffectContext(source, { subjectPermanentId: target.permanentId }),
      selections: new Map(),
    };
    for (const effect of effects) {
      if (!canTrigger(effect, ctx, this.tracker)) continue;
      if (!canActivate(effect, ctx, this.tracker)) continue;
      await effect.resolve(ctx);
    }
  }

  /** Battle-area effects that react while their controller would play/use another card. */
  private residentPlayCostEffects(seat: Seat): Array<{ effect: Effect; source: CardSource }> {
    const player = this.state.players[seat];
    if (player === undefined) return [];
    return Array.from(player.battleArea).flatMap((permanent) => {
      if (permanent.inBreeding || permanent.topCard === undefined) return [];
      return [permanent.topCard, ...permanent.stack].flatMap((card, index) => {
        const residentSource = this.cardSourceOf(card);
        return effectsOf(EffectTiming.BeforePayCost, residentSource)
          .filter((effect) => effect.costWindow !== "digivolve")
          .filter((effect) => index === 0 || effect.isInherited)
          .map((effect) => ({ effect, source: residentSource }));
      });
    });
  }

  /**
   * Battle-area permanents the playing seat controls that carry a VERIFIED cross-permanent play-cost
   * reducer matching the card being played. BT10-093 handles Lv.4+ [Bagra Army] Digimon; EX3-040
   * handles green Digimon by suspending the Parasaurmon carrying the effect.
   * These reducers live on a watcher, not the played card, so `wouldBePlayedSelfReducersFor` (keyed
   * on the played card's own id) does not cover them. The accepted card IDs are explicit because
   * generated cross-card Replacement IR can omit decisive source/subject identity.
   */
  private crossPermanentPlayReducerWatchers(instance: CardInstance, seat: Seat): Permanent[] {
    const def = lookupDefinition(instance.cardId);
    if (def === undefined) return [];
    const isLv4PlusBagraArmy =
      def.kinds.includes(CardKind.Digimon) &&
      def.level !== undefined &&
      def.level >= 4 &&
      (cardHasTrait(def, "Bagra Army") || cardHasTrait(def, "BagraArmy"));
    const player = this.state.players[seat];
    if (player === undefined) return [];
    const isBossOrTsDigimon =
      def.kinds.includes(CardKind.Digimon) && (cardHasTrait(def, "Boss") || cardHasTrait(def, "TS"));
    return player.battleArea.filter((perm) => {
      if (perm.inBreeding) return false;
      if (perm.topCard?.cardId === "BT10-093") return isLv4PlusBagraArmy;
      if (perm.topCard?.cardId === "BT26-088") {
        return (
          isBossOrTsDigimon &&
          !perm.isSuspended &&
          !this.continuous.hasRestriction(perm.permanentId, "beSuspended") &&
          !this.continuous.hasRestriction(perm.permanentId, "beAffected")
        );
      }
      return false;
    });
  }

  /**
   * Run each verified cross-permanent reducer. Decisions use the watcher's own context so the UI
   * attributes the printed clause to the permanent providing the reduction, not the card in hand.
   */
  private async runCrossPermanentPlayReducers(
    instance: CardInstance,
    ctx: EffectContext,
    watchers: Permanent[],
  ): Promise<void> {
    if (watchers.length === 0) return;
    const seat = ctx.source.ownerSeat;
    const player = this.state.players[seat];
    if (player === undefined) return;
    for (const watcher of watchers) {
      if (watcher.topCard?.cardId === "BT26-088") {
        const watcherSource = this.cardSourceOf(watcher.topCard);
        const watcherCtx: EffectContext = {
          ...this.buildEffectContext(watcherSource, {}),
          selections: new Map(),
          activeTiming: "YourTurn",
          activeEffectText:
            "[Your Turn] When a [Boss] or [TS] Digimon would be played, by suspending this Tamer, reduce the cost.",
        };
        if (!(await watcherCtx.ask.optional(watcherCtx, "Suspend Hiroko Sagisaka to reduce this play cost?"))) {
          continue;
        }
        const paid = watcherCtx.fx.payActivationCost?.(watcher.permanentId, "suspend") ?? false;
        if (!paid) continue;
        const hasDigimon = player.battleArea.some((permanent) => {
          if (permanent.inBreeding || permanent.topCard === undefined) return false;
          return lookupDefinition(permanent.topCard.cardId)?.kinds.includes(CardKind.Digimon) === true;
        });
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + (hasDigimon ? 1 : 2);
        continue;
      }
      const key = `crossPlayReducer:${watcher.permanentId}`;
      if (this.tracker.count(key, "crossReducer") > 0) continue;
      const candidates = this.purpleDigimonUnderTamers(player);
      if (candidates.length === 0) continue;
      const prompt =
        "BT10-093: place up to 3 purple Digimon from under your Tamers as digivolution cards to reduce the play cost by 2 each?";
      if (!(await ctx.ask.optional(ctx, prompt))) continue;
      this.tracker.register(key, "crossReducer");
      const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 3 });
      if (chosen.length === 0) continue;
      ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 2 * chosen.length;
      const pending = this.pendingPlayReducerPlacements.get(instance.instanceId) ?? [];
      this.pendingPlayReducerPlacements.set(instance.instanceId, [...pending, ...chosen]);
    }
  }

  /** InstanceIds of purple Digimon sitting in the digivolution stacks of the seat's Tamers. */
  private purpleDigimonUnderTamers(player: PlayerState): string[] {
    const out: string[] = [];
    for (const perm of player.battleArea) {
      const topDef = perm.topCard ? lookupDefinition(perm.topCard.cardId) : undefined;
      if (topDef === undefined || !topDef.kinds.includes(CardKind.Tamer)) continue;
      for (const card of perm.stack) {
        const def = lookupDefinition(card.cardId);
        if (def === undefined) continue;
        if (def.kinds.includes(CardKind.Digimon) && def.colors.includes("Purple" as CardColor)) {
          out.push(card.instanceId);
        }
      }
    }
    return out;
  }

  /**
   * The framework environment a timing resolution runs against: authoritative state,
   * the effect verbs (fx), the player-decision API (ask), and the per-turn use ledger
   * (shared with activateEffect so maxPerTurn accounting is unified).
   */
  private effectEnvironment(trigger: TriggerInfo): EffectEnvironment {
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
      triggerInfo: trigger,
    };
  }

  /**
   * Engine-side dependencies for the stack resolver. `listCandidate` defaults to the
   * full candidate-zone enumeration ({@link listCandidateInstances}); a caller may
   * narrow it (e.g. fireTimingForInstance scopes to the one played card). `ruleProcess`
   * is the state-based-action fixpoint ({@link ruleProcess}); the resolver calls it
   */
  private resolutionDeps(
    listCandidate: () => readonly CardInstance[] = () => this.listCandidateInstances(),
    opts: { outermost?: boolean } = {},
  ): ResolutionDeps {
    return {
      // Only the outermost loop settles the deferred queues between effects: at a nested one
      // the effect that parked them is still running its body (see ResolutionEnv.betweenEffects).
      // The pending watchers belong to the windows the event opened, not to a window a
      // resolving effect opens from inside its own body: a nested (cut-in) resolution must not
      // reach into the pool and resolve a sibling trigger mid-body. Both are the same test —
      // only the outermost loop runs with no card body on the stack.
      ...(opts.outermost === true
        ? { betweenEffects: () => this.settleBetweenEffects(), collectPending: () => this.pendingWindowCollected() }
        : {}),
      turnSeat: this.state.turnSeat,
      listCandidateInstances: listCandidate,
      ruleProcess: () =>
        this.optionResolutionDepth > 0 || this.effectResolutionDepth > 0 ? Promise.resolve() : this.ruleProcess(),
      isGameOver: () => this.state.gameOver,
      chooseOrder: (seat, active, timing) => this.resolverDecisions.chooseOrder(seat, active, timing),
      askOptional: (seat, collected) => this.resolverDecisions.askOptional(seat, collected),
      onResolving: (timing, collected) => {
        this.hooks.emit({
          kind: "effectTriggered",
          seat: collected.source.ownerSeat,
          sourceCardId: collected.source.cardId,
          effectKey: collected.effect.effectKey,
          description: collected.effect.description,
          timing: EffectTiming[timing],
          ...(collected.effect.isInherited ? { isInherited: true } : {}),
          // `securityChecked` closes the check AFTER these effects have resolved, so the
          // client needs this to hold the announcement until the reveal has been shown.
          ...(this.securityCheckDepth > 0 ? { duringSecurityCheck: true } : {}),
        });
      },
      onResolved: (timing, collected) => {
        this.hooks.emit({
          kind: "effectResolved",
          seat: collected.source.ownerSeat,
          sourceCardId: collected.source.cardId,
          effectKey: collected.effect.effectKey,
          description: collected.effect.description,
          timing: EffectTiming[timing],
          ...(collected.effect.isInherited ? { isInherited: true } : {}),
        });
      },
    };
  }

  /**
   * Guards `doRuleProcess` against re-entry while a state-based-action pass is mid-flight
   * (a deletion can fire an [On Deletion] effect that itself drives `resolveTiming`, which
   */
  private ruleProcessing = false;

  /**
   * Triggered watcher events produced while a rule check is still reaching its fixpoint.
   * They become pending only after every immediately applicable rule process has finished.
   * This is observable for BT25-084/Q6399: paying its leave-prevention cost trashes the
   * controller's hand, but the resulting watcher cannot activate before the repeated
   * 0-DP rule check deletes Titamon.
   */
  private readonly deferredRuleSubTriggers: {
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
  private ruleTriggerPool: PooledRuleDeletion[] | undefined = undefined;

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
  private async ruleProcess(): Promise<void> {
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
    while (this.doRuleProcess()) {
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
        if (this.runEndGameProcess()) return;
        // BT26-060 Q7082: peeling a Digimon stack down to a no-DP card trashes the invalid
        // remnant at rule-check timing; a normally played Tamer remains a legal permanent.
        await this.trashInvalidNoDpStackTops();
        // §17-1-3-2-1 TrashNoDPPermanentProcess — raw DP < 0 ⇒ trash via deletePermanent(byRule).
        await this.trashNoDpPermanents();
        // §17-1-3-1-1 DigimonLackDPProcess — raw DP == 0 Digimon ⇒ delete via deletePermanent(byRule).
        await this.deleteZeroDpDigimon();
        // §17-1-3-2-3 TrashNonDigimonPermanentProcess — a non-Digimon/non-DigiEgg card in the
        // breeding slot (a Digi-Egg is NOT a violation — CR §4-2-1 treats it as a Digimon).
        await this.trashBreedingNonDigimon();
        // §17-1-3-2-4 CardFaceDownProcess — a permanent whose top card is face-down.
        await this.trashFaceDownTopCards();
        // §17-1-3-2-5 DigimonLackLinkMaxCountProcess — linked cards beyond the effective link
        // limit (only the excess is trashed, not the whole permanent).
        await this.trashExcessLinkCards();
        // §17-1-3-2-6 / §17-1-3-2-7 — a linked card whose own printed <Link> requirement
        // (names/traits) its live host no longer (or never did) satisfy.
        await this.trashInvalidLinkedCards();
        // §17-1-3-2-2 — Option cards in the battle area, except Option cards placed there BY
        // AN EFFECT (`Permanent.placedByEffect`). BT7-102's <Delay> Option (placed via
        // primitives.ts' `placeOptionAsPermanent`, which sets the marker) survives this sweep.
        await this.trashOptionsInBattleArea();
        // "Battle as Tamer" NOT IMPLEMENTED — no such rule was located in Comprehensive Rules
        // Chapter 17 (Rule Checks) or elsewhere. "Tamer cards can't attack" (glossary, CR §4-3)
        // is an attack-DECLARATION legality gate (combat/legality.ts), not a rule-check sweep
        // condition; inventing a deletion/trash behavior for it would not be faithful.
      } finally {
        this.ruleProcessing = false;
      }
    }
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
        await this.withTriggeredMutations(() => this.runSubTriggersInChosenOrder(armed));
      } else {
        const merged = mergeRuleDeletions(pool);
        await this.resolveDeletionReactions(merged.trigger, merged.ascensionCandidates, (deletionTrigger) =>
          this.runTimingWindow(EffectTiming.OnDestroyedAnyone, deletionTrigger, merged.transientCandidates),
        );
        // A deletion can have no printed [On Deletion] candidates, in which case the empty
        // timing window never requests its pending watcher collection. The watcher was already
        // armed while its target was live; resolve any it did not consume in that window now.
        await this.withTriggeredMutations(() =>
          this.runSubTriggersInChosenOrder(
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
   * Whether any state-based action is pending: re-evaluated every
   * pass so the fixpoint terminates when the board is quiet. Returns false during a pass
   * (the `ruleProcessing` re-entrancy latch) so an [On Deletion] effect that re-enters
   * resolution does not recurse into a second concurrent sweep.
   */
  private doRuleProcess(): boolean {
    if (this.ruleProcessing) return false;
    if (this.state.gameOver) return false;
    return (
      this.anyPlayerLost() ||
      this.anyInvalidNoDpStackTop() ||
      this.anyNegativeDpToTrash() ||
      this.anyZeroDpDigimon() ||
      this.anyBreedingNonDigimon() ||
      this.anyFaceDownTopCard() ||
      this.anyExcessLinkCards() ||
      this.anyInvalidLinkedCards() ||
      this.anyOptionInBattleArea()
    );
  }

  /** #1: resolve pending `lost` flags into a game-over. True iff ended. */
  private runEndGameProcess(): boolean {
    return this.win.resolveLossFlags();
  }

  /** Any player marked lost but not yet resolved into a game-over. */
  private anyPlayerLost(): boolean {
    return this.state.players.some((p) => p?.lost === true) && !this.state.gameOver;
  }

  /** A Digimon stack peeled by an effect until its new top is an invalid no-DP remnant (BT26-060 Q7082). */
  private anyInvalidNoDpStackTop(): boolean {
    return this.battleAreaPermanents().some((permanent) => permanent.invalidNoDpStackTop);
  }

  /** Trash invalid no-DP remnants before the ordinary DP and kind rule checks. */
  private async trashInvalidNoDpStackTops(): Promise<void> {
    const ids = this.battleAreaPermanents()
      .filter((permanent) => permanent.invalidNoDpStackTop)
      .map((permanent) => permanent.permanentId);
    if (ids.length > 0) await this.primitives.trashPermanentByRule(ids);
  }

  /** All battle-area permanents across both players (top-card present). */
  private battleAreaPermanents(): Permanent[] {
    const out: Permanent[] = [];
    for (const player of this.state.players) {
      if (player === undefined) continue;
      for (const perm of player.battleArea) {
        if (perm.topCard !== undefined) out.push(perm);
      }
    }
    return out;
  }

  /**
   * #3 predicate — a permanent whose RAW DP is below 0 and is a battle-area Digimon
   *. `currentDP` floors at 0, so the rule check reads the unclamped
   * Phase-4 territory and omitted with the rest of the option lifecycle.)
   */
  private anyNegativeDpToTrash(): boolean {
    return this.battleAreaPermanents().some(
      (p) => this.access.isBattleAreaDigimon(p) && this.modifiers.rawDp(this.state, p.permanentId) < 0,
    );
  }

  /** #4 predicate — a battle-area Digimon at exactly raw DP 0. */
  private anyZeroDpDigimon(): boolean {
    return this.battleAreaPermanents().some(
      (p) => this.access.isBattleAreaDigimon(p) && this.modifiers.rawDp(this.state, p.permanentId) === 0,
    );
  }

  /** #3 process — trash every raw-DP-below-0 Digimon via deletePermanent(byRule). */
  private async trashNoDpPermanents(): Promise<void> {
    const ids = this.battleAreaPermanents()
      .filter((p) => this.access.isBattleAreaDigimon(p) && this.modifiers.rawDp(this.state, p.permanentId) < 0)
      .map((p) => p.permanentId);
    if (ids.length > 0) await this.primitives.deletePermanent(ids, "byRule");
  }

  /** #4 process — delete every raw-DP-0 Digimon via deletePermanent(byRule). */
  private async deleteZeroDpDigimon(): Promise<void> {
    const ids = this.battleAreaPermanents()
      .filter((p) => this.access.isBattleAreaDigimon(p) && this.modifiers.rawDp(this.state, p.permanentId) === 0)
      .map((p) => p.permanentId);
    if (ids.length > 0) await this.primitives.deletePermanent(ids, "byRule");
  }

  /** Each player's breeding-slot permanent with a top card present (at most one per player). */
  private breedingPermanents(): Permanent[] {
    const out: Permanent[] = [];
    for (const player of this.state.players) {
      if (player?.breeding?.topCard !== undefined) out.push(player.breeding);
    }
    return out;
  }

  /**
   * All field permanents with a top card — battle area (both players) plus each player's
   * breeding slot (CR §3-4-4: the field is divided into the breeding area and the battle
   * area). Used by the face-down-top-card sweep (§17-1-3-2-4), which is a whole-field
   * condition, not battle-area-only.
   */
  private fieldPermanents(): Permanent[] {
    return [...this.battleAreaPermanents(), ...this.breedingPermanents()];
  }

  /**
   * A field permanent's top card counts as a Digimon for rule purposes: CR §4-2-1 "Digi-Egg
   * cards and Digimon cards placed on the field are treated as Digimon."
   */
  private isDigimonOrDigiEgg(permanent: Permanent): boolean {
    if (permanent.topCard === undefined) return false;
    const kinds = definitionOf(permanent.topCard).kinds;
    return kinds.includes(CardKind.Digimon) || kinds.includes(CardKind.DigiEgg);
  }

  /** §17-1-3-2-3 predicate — a breeding-slot card that is neither a Digimon nor a Digi-Egg. */
  private anyBreedingNonDigimon(): boolean {
    return this.breedingPermanents().some((p) => !this.isDigimonOrDigiEgg(p));
  }

  /** §17-1-3-2-3 process — trash every non-Digimon/non-DigiEgg breeding permanent. */
  private async trashBreedingNonDigimon(): Promise<void> {
    const ids = this.breedingPermanents()
      .filter((p) => !this.isDigimonOrDigiEgg(p))
      .map((p) => p.permanentId);
    if (ids.length > 0) await this.primitives.deletePermanent(ids, "byRule");
  }

  /**
   * §17-1-3-2-4 predicate — a permanent whose TOP card is face-down. Per CR §4-6-9/§4-6-10 a
   * face-down card UNDER another (a digivolution or link card) is legitimate hidden
   * information and is NOT targeted here — only a face-down card sitting directly on the
   * field (the top card itself, which represents no valid game state) is illegal.
   */
  private anyFaceDownTopCard(): boolean {
    return this.fieldPermanents().some((p) => p.topCard?.faceUp === false);
  }

  /** §17-1-3-2-4 process — trash every permanent whose top card is face-down. */
  private async trashFaceDownTopCards(): Promise<void> {
    const ids = this.fieldPermanents()
      .filter((p) => p.topCard?.faceUp === false)
      .map((p) => p.permanentId);
    if (ids.length > 0) await this.primitives.deletePermanent(ids, "byRule");
  }

  /**
   * §17-1-3-2-5 predicate — a battle-area Digimon whose linked-card count exceeds its
   * effective link limit (`linkMaxOf`: base 1 plus active `<Link +N>` grants).
   */
  private anyExcessLinkCards(): boolean {
    return this.battleAreaPermanents().some((p) => p.linked.length > this.linkMaxOf(p));
  }

  /**
   * §17-1-3-2-5 process — trash only the EXCESS linked cards (beyond `linkMaxOf`) per
   * Digimon, not the whole permanent. The rule fixes the COUNT and the controller picks
   * WHICH (Q6370, BT25-075: "The link cards to trash are chosen by the player"), so each
   * over-linked Digimon's controller is prompted once.
   */
  private async trashExcessLinkCards(): Promise<void> {
    const toTrash: string[] = [];
    for (const permanent of this.battleAreaPermanents()) {
      const excess = permanent.linked.length - this.linkMaxOf(permanent);
      if (excess > 0) toTrash.push(...(await this.chooseExcessLinkCards(permanent, excess)));
    }
    this.justLinked.clear();
    if (toTrash.length > 0) await this.primitives.trash(toTrash, { byRule: true });
  }

  /**
   * Which of `permanent`'s link cards its controller gives up to bring the count back to the
   * limit (Q6370, BT25-075: "The link cards to trash are chosen by the player"). A choice
   * that is not a choice — every candidate has to go — resolves without a prompt. An answer
   * that does not name exactly `excess` of the candidates cannot be honored without leaving
   * the rule violated, so it falls back to the oldest link cards.
   *
   * §4-9-5 removes the just-linked cards from the choice: linking onto a Digimon already at
   * its limit trashes "the same number of the EXISTING link cards", so the card that caused
   * the overflow is never the one offered up. The other route to an over-limit permanent —
   * the limit itself shrinking (Q6370's ＜Link +1＞ wearing off) — links nothing, so every
   * card stays a candidate there and the player picks freely. The exclusion is dropped if it
   * would leave too few candidates to satisfy the rule.
   */
  private async chooseExcessLinkCards(permanent: Permanent, excess: number): Promise<string[]> {
    const linkedIds = permanent.linked.map((card) => card.instanceId);
    const existing = linkedIds.filter((id) => !this.justLinked.has(id));
    const candidates = existing.length >= excess ? existing : linkedIds;
    if (excess >= candidates.length) return candidates;
    const response = await this.decisions.request({
      seat: permanent.controllerSeat,
      kind: "selectCards",
      promptText: `Choose ${excess} link card${excess === 1 ? "" : "s"} to trash.`,
      options: { candidateInstanceIds: candidates, min: excess, max: excess },
    });
    const chosen =
      response.kind === "selectCards" ? [...new Set(response.instanceIds)].filter((id) => candidates.includes(id)) : [];
    return chosen.length === excess ? chosen : candidates.slice(candidates.length - excess);
  }

  /**
   * §17-1-3-2-6/§17-1-3-2-7's category gate, parsed from the printed
   * `CardDefinition.linkRequirement` header ("[Link] [Appmon] trait: Cost 1"). The
   * STRUCTURED `LinkRequirement[]` array on `CompiledCard` (packages/shared/src/effects/ir/requirements.ts)
   * exists but is populated only on the 2 hand-authored cards that reference it in an
   * effect body (BT25-045, EX10-029) — every AUTO-GENERATED card (BT21-009 among them,
   * the fixture this rule check is proven against) carries the requirement ONLY as this
   * flat string, so that array cannot be the source of truth for a check meant to cover
   * all ~70 real link cards. Every observed printed form (`node tools/kb/query.mjs rules
   * "link"` + a full scan of `cards.json.linkRequirement`) is one of four shapes:
   *   "[Link] [<Trait>] trait: Cost N"   -> trait
   *   "[Link] [<Name>] in text: Cost N"  -> name/trait/text union ("has X in its text")
   *   "[Link] [<Name>]: Cost N"          -> name
   *   "[Link] Lv.N or higher: Cost N"    -> level floor
   * The printed cost is enforced at declaration time (existing `canLinkToTargetPermanent`
   * / `linkCostOf` seams), not re-checked here — this gate only re-evaluates the CATEGORY
   * against the live host, which is what §17-1-3-2-6/§17-1-3-2-7 asks a rule-check sweep
   * to keep honest as the host's own traits/name/level can never change after linking.
   */
  private parseLinkCategory(
    req: string,
  ): { tokens: string[]; match: "trait" | "name" | "text" } | { minLevel: number } | undefined {
    const trait = /^\[Link\]\s*\[(.+?)\]\s*trait\s*:/i.exec(req);
    if (trait?.[1] !== undefined) return { tokens: [trait[1]], match: "trait" };
    const inText = /^\[Link\]\s*\[(.+?)\]\s*in text\s*:/i.exec(req);
    if (inText?.[1] !== undefined) return { tokens: [inText[1]], match: "text" };
    const name = /^\[Link\]\s*\[(.+?)\]\s*:/i.exec(req);
    if (name?.[1] !== undefined) return { tokens: [name[1]], match: "name" };
    const level = /^\[Link\]\s*Lv\.(\d+)\s*or higher\s*:/i.exec(req);
    if (level?.[1] !== undefined) return { minLevel: Number(level[1]) };
    return undefined;
  }

  /**
   * §17-1-3-2-6/§17-1-3-2-7 — whether a linked card's own printed `<Link>` category
   * requirement is satisfied by its live host's CURRENT definition. A card with no
   * `linkRequirement` at all, or one whose printed header this engine can't parse into a
   * category, carries nothing to violate (conservative: never invents a gate from an
   * unrecognized shape).
   */
  private linkRequirementSatisfied(hostDef: CardDefinition, linkedCard: CardInstance): boolean {
    const req = definitionOf(linkedCard).linkRequirement;
    if (typeof req !== "string" || req.length === 0 || req === "-") return true;
    const parsed = this.parseLinkCategory(req);
    if (parsed === undefined) return true;
    if ("minLevel" in parsed) return hostDef.level !== undefined && hostDef.level >= parsed.minLevel;
    return matchNameOrTrait(hostDef, parsed);
  }

  /** §17-1-3-2-6/§17-1-3-2-7 predicate — some battle-area Digimon holds a link card its own printed requirement no longer matches. */
  private anyInvalidLinkedCards(): boolean {
    return this.battleAreaPermanents().some((p) => {
      if (p.topCard === undefined) return false;
      const hostDef = definitionOf(p.topCard);
      return p.linked.some((card) => !this.linkRequirementSatisfied(hostDef, card));
    });
  }

  /** §17-1-3-2-6/§17-1-3-2-7 process — trash every linked card whose own requirement its host no longer satisfies. */
  private async trashInvalidLinkedCards(): Promise<void> {
    const toTrash: string[] = [];
    for (const permanent of this.battleAreaPermanents()) {
      if (permanent.topCard === undefined) continue;
      const hostDef = definitionOf(permanent.topCard);
      for (const card of permanent.linked) {
        if (!this.linkRequirementSatisfied(hostDef, card)) toTrash.push(card.instanceId);
      }
    }
    if (toTrash.length > 0) await this.primitives.trash(toTrash, { byRule: true });
  }

  /**
   * §17-1-3-2-2 predicate — a PURE Option-kind battle-area permanent (no Digimon/DigiEgg
   * kind of its own) NOT placed there by an effect. `placedByEffect` (packages/shared/
   * src/schema/Permanent.ts) is the marker; a normal Option play never reaches
   * `placePermanent` (it resolves as a one-shot use, not a field placement), so a pure
   * Option permanent existing at all is either effect-placed (exempt) or an illegal state
   * this sweep exists to clean up. Excludes DUAL Digimon/Option cards (e.g. BT25-104
   * "ShineGreymon: Burst Mode", `kinds: ["Digimon","Option"]`): those are legitimately on
   * the battle area as a DIGIMON via a normal digivolution, not "an Option card in the
   * battle area" — the printed Option side is a second, separately-activated use mode on
   * the same card, not a distinct permanent placement §17-1-3-2-2 is aimed at.
   */
  private anyOptionInBattleArea(): boolean {
    return this.battleAreaPermanents().some(
      (p) =>
        p.topCard !== undefined &&
        isOption(definitionOf(p.topCard)) &&
        !this.isDigimonOrDigiEgg(p) &&
        !p.placedByEffect,
    );
  }

  /** §17-1-3-2-2 process — trash every non-effect-placed pure-Option permanent via deletePermanent(byRule). */
  private async trashOptionsInBattleArea(): Promise<void> {
    const ids = this.battleAreaPermanents()
      .filter(
        (p) =>
          p.topCard !== undefined &&
          isOption(definitionOf(p.topCard)) &&
          !this.isDigimonOrDigiEgg(p) &&
          !p.placedByEffect,
      )
      .map((p) => p.permanentId);
    if (ids.length > 0) await this.primitives.deletePermanent(ids, "byRule");
  }

  /**
   * The card instances that could contribute an effect at a timing — the union of the
   * zones the source `GetSkillInfos` (documented behavior) scans: each player's field
   * permanents (top card + digivolution stack + linked cards), hand, trash, and
   * face-up security, for BOTH players. The framework's `gatherTriggeredEffects`
   * then applies the per-effect timing/`when`/per-turn-limit filter, so over-listing
   * here is harmless (a card with no effect at the timing contributes nothing).
   */
  private listCandidateInstances(): CardInstance[] {
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
  private candidateSourceLocation(instanceId: string): string | undefined {
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
  private collectPermanentInstances(permanent: Permanent, out: CardInstance[]): void {
    if (permanent.topCard !== undefined) out.push(permanent.topCard);
    for (const card of permanent.stack) out.push(card);
    for (const card of permanent.linked) out.push(card);
  }

  /** Resolve a set of instance ids to live CardInstances anywhere on the board. */
  private instancesById(instanceIds: readonly string[]): CardInstance[] {
    const wanted = new Set(instanceIds);
    return this.listCandidateInstances().filter((c) => wanted.has(c.instanceId));
  }

  /** Allocate a permanentId unique within the match (subsystem: play-card / digivolve). */
  private nextPermanentId(): string {
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
    } while (this.findInstance(candidate) !== undefined);
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
   *     stack (Comprehensive Rules §15-14-5: a {Security} effect activates while its
   *     card is face-up in the security stack), returning true when one existed.
   *   - dpOf / securityCardDp / isDigimon / deletePermanents: backed by the shared
   *     GameStateAccess + card data, identical to combat's own reads.
   */
  /**
   * Non-zero while `runSecurityCheck` is resolving. Effects triggered inside the check
   * announce themselves before the closing `securityChecked` event, so their
   * `effectTriggered` is stamped `duringSecurityCheck` for the client to hold.
   */
  private securityCheckDepth = 0;

  private async runSecurityCheck(
    defenderSeat: Seat,
    attackerPermanentId: string,
    reason: SecurityCheckReason = "attack",
  ): Promise<void> {
    // Re-derive the continuous tier at the start of the live security battle so the
    // continuous ModifySecurityDP (ST3-12's [Opponent's Turn] +2000) is re-applied under its
    // guard before any securityCardDp read — the deferred IR-01 fix. recomputeContinuousEffects
    // clears the securityDp ledger itself, so this is a single, fresh re-application rather than
    // a one-shot stale value left from an earlier window.
    await this.recomputeContinuousEffects();
    const deps: SecurityCheckDeps = {
      recomputeContinuousEffects: () => this.recomputeContinuousEffects(),
      // Strike = the number of security cards checked: base 1 plus every ＜Security
      // Attack +N＞ granted to the attacker. The securityAttack IR producer writes these
      // grants into continuous.keywordGrants; this is the consuming read (Permanent.Strike,
      // source documented behavior). The floor stays at 1 (no grant ⇒ check 1 card).
      strikeFor: (attacker) => {
        // inversion is active on the attacker, each existing ＜Security Attack ±N＞ grant has its
        // amount NEGATED per-instance before summing (two ＜SA -1＞ → two ＜SA +1＞ = +2 to the
        // strike, NOT ＜SA +2＞ recomputed). The sign is applied per grant inside the reduce, so the
        // composition is faithful to the per-instance flip with no per-permanent value math.
        return this.securityStrikeFor(attacker.permanentId);
      },
      permanentById: (permanentId) => this.access.permanentById(permanentId),
      fireTiming: async (timing, info) =>
        this.fireTiming(timing, {
          attackerPermanentId: info.attackerPermanentId,
          securityInstanceId: info.securityInstanceId,
          removedFromSecuritySeat: info.removedFromSecuritySeat,
        }),
      fireSubTrigger: async (event, info) =>
        this.fireSubTrigger(event, {
          attackerPermanentId: info.attackerPermanentId,
          securityInstanceId: info.securityInstanceId,
          removedFromSecuritySeat: info.removedFromSecuritySeat,
          subjectPermanentId: info.subjectPermanentId,
        }),
      fireFaceUpSecurityAdded: async (info) =>
        this.fireSubTrigger("whenFaceUpCardsAddedToOpponentSecurity", {
          addedToSecuritySeat: info.seat,
          addedToSecurityInstanceIds: [info.instanceId],
        }),
      resolveSecurityEffect: async (card, resolvingAttackerId, wasFaceUp) =>
        this.resolveSecurityEffect(card, resolvingAttackerId, wasFaceUp),
      // Reveal hint only: true whenever the card HAS a [Security] effect that would
      // activate, even if that effect later declines to do anything. The client uses it to
      // dock the card while the effect resolves, matching the reference client.
      hasSecurityEffect: (card, hintAttackerId, wasFaceUp) =>
        this.securityEffectsFor(card, hintAttackerId, wasFaceUp).length > 0,
      dpOf: (permanentId) => this.access.permanentById(permanentId)?.currentDP ?? 0,
      hasKeyword: (permanentId, keyword) => {
        const permanent = this.access.permanentById(permanentId);
        return permanent !== undefined && resolveKeywords(permanent, this.continuous).includes(keyword);
      },
      hasRestriction: (permanentId, restriction) => this.continuous.hasRestriction(permanentId, restriction),
      securityCardDp: (card) => {
        const owner = card.ownerSeat;
        return (lookupDefinition(card.cardId)?.dp ?? 0) + this.securityDp.deltaFor(owner);
      },
      isDigimon: (card) => {
        const result = this.access.isDigimonCard(card);
        log("[securityCheck]", card.cardId, `isDigimon=${result} kinds=`, lookupDefinition(card.cardId)?.kinds);
        return result;
      },
      deletePermanents: async (permanentIds) => {
        // Security battles use the authoritative deletion primitive too. It owns the complete
        // replacement pipeline (Armor Purge, Decoy, Material Save, On Deletion and teardown),
        // preventing this seam from drifting from field-battle and effect deletion behavior.
        await this.primitives.deletePermanent(permanentIds, "byBattle");
      },
    };
    const emitWithLog = (event: ServerEvent) => {
      this.hooks.emit(event);
      if (event.kind === "securityChecked") {
        log("[securityCheck]", "securityChecked event:", JSON.stringify(event));
      }
    };
    this.securityCheckDepth += 1;
    try {
      await runSecurityCheck(
        this.state,
        emitWithLog,
        this.win,
        deps,
        defenderSeat,
        { permanentId: attackerPermanentId },
        reason,
      );
    } finally {
      this.securityCheckDepth -= 1;
    }
  }

  /**
   * Resolve a revealed security card's [Security] effect, if it has one (subsystem:
   * effect-stack-resolution + effect-framework). Looks up the card's registered
   * module for effects filed under {@link EffectTiming.SecuritySkill}; if any
   * trigger, it runs them through the same ordered stack resolver every other timing
   * uses (scoped to this one card so only its security effect fires). Returns true
   * when at least one security effect ACTUALLY activated: an effect that could not
   * activate, or an optional the owner declined, leaves the card to be trashed as if it
   * had no security effect (KB Q886).
   *
   * The card is still IN the security stack (face-up) when this runs — the loop
   * removes it after resolution — so a [Security] "play this card" effect
   * (playFromSecurity) can locate it there (§15-14-5).
   *
   * Resolved as a single ordered pass over the card's own security effects rather
   * than through the re-collecting `runTiming` fixpoint: a [Security] effect
   * activates once when the card is flipped (the source activates the single
   * security skill), and the card leaves the security zone as part of resolving, so
   * a re-collection of the same instance must not re-offer it.
   */
  private async resolveSecurityEffect(
    card: CardInstance,
    attackerPermanentId: string,
    securityWasFaceUp?: boolean,
  ): Promise<boolean> {
    const securityEffects = this.securityEffectsFor(card, attackerPermanentId, securityWasFaceUp);
    log(
      "[resolveSecurityEffect]",
      card.cardId,
      `found ${securityEffects.length} effect(s)`,
      securityEffects.map((e) => ({ key: e.effectKey, optional: e.optional, desc: e.description })),
    );
    if (securityEffects.length === 0) return false;

    const source = this.cardSourceOf(card);
    const def = lookupDefinition(card.cardId);

    // A DUAL card's [Security] clause printed on its Digimon face resolves as a
    // Digimon effect (BT26-075 Q7102), even though the physical card is also an
    // Option for security-effect suppression (Q7103). Keep those two rule queries
    // separate: the disable above reads the full definition, while effect provenance
    // below uses only the face that owns the resolving clause.
    const securityEffectSourceKinds =
      def?.isDualCard === true && def.effectText?.includes("[Security]") === true
        ? [CardKind.Digimon]
        : [...(def?.kinds ?? source.definition.kinds)];
    // KB Q886: an Option whose [Security] effect could not activate (condition unmet) or
    // whose optional was declined is simply trashed — nothing activated, so the check must
    // not report an "effect" resolution.
    let activated = false;
    for (const effect of securityEffects) {
      const ctx = {
        // Security conditions observe the checked card as already removed from the printed
        // security count while it remains physically present for source lookup (CR 15-14-5,
        // e.g. EX1-027 Q3211). Preserve the timing provenance here so securityCount predicates
        // apply the same exclusion in the real attack path as in the SecuritySkill seam.
        ...this.buildEffectContext(source, { securityWasFaceUp }),
        activeTiming: "SecuritySkill",
        effectSourceKinds: securityEffectSourceKinds,
      };
      if (!canActivate(effect, ctx, this.tracker)) {
        log("[resolveSecurityEffect]", card.cardId, `canActivate=false for ${effect.effectKey}, skipping`);
        continue;
      }
      if (effect.optional && !(await this.resolverDecisions.askOptional(source.ownerSeat, { source, effect }))) {
        log("[resolveSecurityEffect]", card.cardId, `optional declined for ${effect.effectKey}`);
        continue;
      }
      log("[resolveSecurityEffect]", card.cardId, `resolving ${effect.effectKey}`);
      ctx.fx.enterEffectResolution?.(source.ownerSeat, securityEffectSourceKinds);
      try {
        await effect.resolve(ctx);
      } finally {
        ctx.fx.leaveEffectResolution?.();
      }
      this.tracker.register(source.instanceId, effect.effectKey);
      activated = true;
    }
    log("[resolveSecurityEffect]", card.cardId, `returning ${activated}`);
    return activated;
  }

  /**
   * The [Security] effects of `card` that would activate under this attacker right now —
   * the shared lookup behind both {@link resolveSecurityEffect} and the
   * `hasSecurityEffect` reveal hint, so the hint can never disagree with what resolves.
   *
   * Security-effect disable (DisableSecurityEffect, the security half of the source rule
   * implementation split): while the attacker carries the disable, this flipped card's
   * {Security} effect does not activate at all. Reporting none lets the security loop trash
   * an Option (KB Q886) and battle a Digimon normally.
   */
  private securityEffectsFor(
    card: CardInstance,
    attackerPermanentId: string,
    securityWasFaceUp?: boolean,
  ): ReturnType<typeof effectsOf> {
    const source = this.cardSourceOf(card);
    const def = lookupDefinition(card.cardId);
    if (def !== undefined && this.continuous.isSecurityEffectDisabled(attackerPermanentId, def)) {
      log("[securityEffectsFor]", card.cardId, "SECURITY EFFECT DISABLED by attacker", attackerPermanentId);
      return [];
    }
    return effectsOf(EffectTiming.SecuritySkill, source).filter((effect) => {
      const ctx = this.buildEffectContext(source, { securityWasFaceUp });
      return canTrigger(effect, ctx, this.tracker);
    });
  }

  /**
   * Assemble the side-effect dependencies the play-card action needs (subsystem:
   * play-card). Memory math is delegated to the shared MemoryGauge (its single
   * owner, identical binding to digivolve); the On Play / option timing is fired
   * through the effect stack scoped to the played instance; permanent ids come from
   * the engine's allocator; narration is forwarded to the room.
   */
  private playCardDeps(): PlayCardDeps {
    const mem = memoryDepsFromGauge(this.memory);
    return {
      maxAffordable: mem.maxAffordable,
      payMemory: mem.payMemory,
      // Apply active continuous play-cost modifiers (CostModifier play/use forms) to the
      // printed cost. The recompute runs before each fired timing, so the store is
      // current when a play is validated. `controllerSeat` is the seat paying.
      adjustedPlayCost: (_state, seat, definition, base) =>
        this.modifiers.playCostFor({ def: definition, controllerSeat: seat }, base),
      optionUseCost: (_state, seat, instance, passiveCost) =>
        this.projectLooseUseCost(instance.instanceId, seat) ?? passiveCost,
      // Seat-level "your opponent can't play <X>" prohibition (RestrictPlay). A manual play
      // is the playing seat's own action, so the prohibition on that seat applies.
      playProhibited: (_state, seat, definition) => this.continuous.isPlayBlocked(seat, definition, "play"),
      // MINIMAL color-requirement legality gate (CONTEXT.md LOCKED Q3): the printed color
      // requirement must overlap the seat's available colors, UNLESS WaiveColorRequirement
      // has waived this instance — `continuous.hasColorWaiver` is the consuming read that
      // makes the waiver observable. Deliberately not the full color subsystem (Phase 4).
      colorRequirementMet: (_state, seat, instance, definition, mode) =>
        this.continuous.hasColorWaiver(instance.instanceId) ||
        this.printedColorRequirementMet(
          seat,
          definition,
          mode,
          this.continuous.colorRequirementAlternatives(instance.instanceId),
        ),
      nextPermanentId: () => this.nextPermanentId(),
      // Pay-time interactive cost reduction (BeforePayCost): fire the played card's BeforePayCost
      // window (where a ReducePlayCost action runs its optional server-side payment) and return the
      // finalized cost. Runs in the async apply path BEFORE memory is paid (EX9-043 / BT25-076).
      finalizePlayCost: async (_state, _seat, instance, _definition, baseCost, mode) =>
        this.fireBeforePayCost(instance, baseCost, mode === "option", "hand"),
      // Synchronous fast-path gate: only cards with a BeforePayCost effect take the async
      // finalization path. Every other card keeps same-microtask placement (no timing change).
      hasBeforePayCost: (instance) =>
        effectsOf(EffectTiming.BeforePayCost, this.cardSourceOf(instance)).some(
          (effect) => effect.costWindow !== "digivolve",
        ) ||
        wouldBePlayedSelfReducersFor(instance.cardId).length > 0 ||
        (this.state.players[this.cardSourceOf(instance).ownerSeat]?.breeding?.stack.length ?? 0) > 0 ||
        this.crossPermanentPlayReducerWatchers(instance, this.cardSourceOf(instance).ownerSeat).length > 0 ||
        this.residentPlayCostEffects(this.cardSourceOf(instance).ownerSeat).length > 0 ||
        this.subTriggers.hasInteractiveReductionsFor("wouldBePlayed", this.cardSourceOf(instance).ownerSeat),
      // After the played permanent is created (before On Play), place any cards a cross-permanent
      // reducer (BT10-093) committed under it, and relocate any whole permanent a SELF reducer's cost
      // body (BT12-112) selected to become one of its digivolution cards. No-op when nothing was
      // committed/selected for this play.
      placePendingDigivolution: async (playedInstanceId, permanentId) => {
        const ids = this.pendingPlayReducerPlacements.get(playedInstanceId);
        if (ids !== undefined && ids.length > 0) {
          this.pendingPlayReducerPlacements.delete(playedInstanceId);
          await this.primitives.placeUnder(permanentId, ids);
        }
        const relocations = this.pendingSelfReducerRelocations.get(playedInstanceId);
        if (relocations !== undefined && relocations.length > 0) {
          this.pendingSelfReducerRelocations.delete(playedInstanceId);
          for (const relocation of relocations) {
            const opts = {
              belowTop: true,
              ...(relocation.shedOwnCards === true ? { shedOwnCards: true } : {}),
            };
            if (this.primitives.relocatePermanentByEffect !== undefined) {
              await this.primitives.relocatePermanentByEffect(permanentId, relocation.permanentId, opts);
            } else {
              this.primitives.relocatePermanent(permanentId, relocation.permanentId, opts);
            }
          }
        }
      },
      fireTiming: async (_state, _seat, timing, sourceInstanceId) =>
        this.firePlayEntryWindows(timing, sourceInstanceId),
      beginOptionResolution: () => {
        this.optionResolutionDepth += 1;
      },
      finishOptionResolution: async () => {
        this.optionResolutionDepth = Math.max(0, this.optionResolutionDepth - 1);
        if (this.optionResolutionDepth === 0) await this.ruleProcess();
      },
      fireOptionUsed: async (usedInstanceId, usedOptionCost) =>
        this.primitives.fireOptionUsed(usedInstanceId, usedOptionCost),
      // CR §4-19 Arts Digivolve (Task 4): a rule on DUAL cards, not a per-card effect —
      // see `resolveArtsDigivolve` below for the eligibility + decision + commit steps.
      artsDigivolve: async (_state, seat, instance, definition) =>
        this.resolveArtsDigivolve(seat, instance, definition),
      emit: (event) => this.hooks.emit(event as ServerEvent),
    };
  }

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
  private async resolveArtsDigivolve(seat: Seat, instance: CardInstance, definition: CardDefinition): Promise<boolean> {
    const eligible = this.access
      .battleAreaPermanents(seat)
      .filter(
        (p) => p.topCard !== undefined && canDigivolveOntoWithAlternates(definition, definitionOf(p.topCard.cardId)),
      );
    if (eligible.length === 0) return false;

    const response = await this.decisions.request({
      seat,
      kind: "selectCards",
      promptText: `＜Arts Digivolve＞: digivolve one of your Digimon into [${definition.cardId}] instead of trashing it?`,
      options: { candidateInstanceIds: eligible.map((p) => p.topCard!.instanceId), min: 0, max: 1 },
    });
    if (response.kind !== "selectCards" || response.instanceIds.length === 0) return false;
    const chosenInstanceId = response.instanceIds[0];
    const target = eligible.find((p) => p.topCard?.instanceId === chosenInstanceId);
    if (target === undefined) return false;

    let artsRulePool: PooledRuleDeletion[] = [];
    const result = await this.primitives.digivolveFromInstance(target.permanentId, instance.instanceId, {
      payCost: false,
      beforeWhenDigivolving: async () => {
        await this.recomputeContinuousEffects();
        artsRulePool = await this.collectRuleProcessMovements();
      },
    });
    if (result !== undefined && !this.state.gameOver) await this.flushRuleTriggerPool(artsRulePool);
    return result !== undefined;
  }

  /**
   * The printed-color-requirement predicate behind the play-card color gate (§4-21-2: "To
   * meet color requirements, you must have a Digimon or Tamer on your field that's the same
   * color as the Option card you want to use.").
   *
   * The requirement is `optionColorRequirements` where a card carries it — the 6 DUAL cards
   * where the Option side's colors differ from `colors` (the card's own, Digimon-side,
   * printed colors) — and otherwise `definition.colors` itself, but ONLY when this play
   * resolves as an Option (`mode === "option"`): §4-21-1 scopes color requirements to
   * "using an Option card", so a DUAL card played on its Digimon/Tamer side, or any
   * Digimon/Tamer/DigiEgg play, is never gated by this fallback. §4-21-3: a multicolor
   * requirement needs EVERY listed color represented, not just one — `every`, not `some`.
   * §4-21-4: a multicolor Digimon/Tamer can satisfy more than one required color at once,
   * handled by unioning `effectiveColorsOf` below rather than requiring distinct sources.
   * §4-21-5 ("...don't have to be met when activating its effects without using it") holds
   * by construction: this predicate is reachable only from `validatePlayCard`'s "use" path,
   * never from effect activation.
   *
   * The requirement is met when EVERY required color is among the seat's available colors —
   * the union of the colors of the top cards of that seat's battle-area permanents and its
   * breeding slot (a real, already present data source; no new continuous/static color
   * derivation, which is Phase 4). Used also to give WaiveColorRequirement an observable
   * consumer; the waiver short-circuit is applied by the caller before this runs.
   */
  private printedColorRequirementMet(
    seat: Seat,
    definition: CardDefinition,
    mode: PlayMode,
    alsoColors: readonly CardColor[] = [],
  ): boolean {
    const required = definition.optionColorRequirements ?? (mode === "option" ? (definition.colors ?? []) : []);
    if (required.length === 0) return true;
    const player = this.state.players[seat];
    if (player === undefined) return false;
    const available = new Set<CardColor>();
    const sources: (Permanent | undefined)[] = [...player.battleArea, player.breeding];
    for (const perm of sources) {
      if (perm?.topCard === undefined) continue;
      // §4-21-2 and Memory Boost Q4149/Q4151/Q4153/Q4155/Q4157/Q4159:
      // only a Digimon or Tamer can satisfy an Option's color requirement. A hatched
      // Digi-Egg is treated as a Digimon while it is on the field (Q2684), so its color
      // counts from the breeding slot even though its printed CardKind remains DigiEgg.
      // An Option placed in the battle area for ＜Delay＞ keeps its color but is not a
      // color source.
      const sourceDefinition = definitionOf(perm.topCard);
      const isHatchedDigiEgg = perm.inBreeding === true && sourceDefinition.kinds.includes(CardKind.DigiEgg);
      if (!isDigimon(sourceDefinition) && !isTamer(sourceDefinition) && !isHatchedDigiEgg) {
        continue;
      }
      // The available-color set is the EFFECTIVE color of each board permanent — its printed
      // colors UNIONED with every continuously-derived "also treated as <color>" grant
      // (static-continuous-effects subsystem, LOCKED Q4). This closes the Phase-2-Q3 deferral:
      // a permanent that is continuously treated as another color contributes that color here.
      for (const color of this.effectiveColorsOf(perm)) available.add(color);
    }
    // "X ALSO meets this card's colour requirements" (LM Memory Boost family, Q4063/Q4064):
    // one extra colour on the field satisfies the printed requirement in full.
    if (alsoColors.some((color) => available.has(color))) return true;
    return required.every((color) => available.has(color));
  }

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
   * Dependencies the attack verb needs (subsystem: attack-and-block). The shared
   * state-access layer and the single CombatController instance back it; a fatal
   * error from the async combat continuation is surfaced to the room as an
   * actionRejected entry rather than an unhandled rejection.
   */
  private attackDeps(): AttackDeps {
    return {
      state: this.state,
      access: this.access,
      combat: this.combat,
      continuous: this.continuous,
      attackedThisTurn: this.combat.attackedThisTurn,
      onCombatComplete: () => this.checkTurnEndAfterVerb(),
      onCombatError: (err) => {
        logError("[engine] combat resolve failed:", err);
        this.hooks.emit({
          kind: "actionRejected",
          intent: "attack",
          reason: err instanceof Error ? err.message : "combat-error",
        });
        // A combat that died mid-resolution already released the controller's guards
        // (resolveAttack's finally), but it skipped onCombatComplete — and with it the
        // turn-end check. If an effect pushed memory across before the throw, no later
        // verb is legal to re-trigger that check, so the Main phase would hang open
        // until a manual endPhase (field bug: api.log 2026-08-20, BT21-021).
        this.syncAttackTargets();
        this.syncHandAffordances();
        this.checkTurnEndAfterVerb();
      },
    };
  }

  /** Dependencies the block verbs need (subsystem: attack-and-block). */
  private blockDeps(): BlockDeps {
    return { state: this.state, access: this.access, combat: this.combat, continuous: this.continuous };
  }

  private combatDecisionDeps(): CombatDecisionDeps {
    return { state: this.state, access: this.access, combat: this.combat };
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
      const verdict = validateDecklist(options.deck);
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
   * Validate and apply a single client intent (subsystem: intent-protocol-and-room).
   * Mutates state only on success; every path returns a stable IntentResult the room
   * surfaces (the rejection codes are the API-CONTRACT section 4 vocabulary).
   *
   * Replaces all network transport RPC entry points (RoomManager / TurnStateMachine / OptionalSkill
   * / MultipleSkills RPCs): the only client->server channel is this dispatch table.
   * Each verb's own action module enforces the validation contract (seat/turn ->
   * open-decision -> legality) and is server-authoritative.
   *
   * The decision gate is enforced per verb (and, for the always-available verbs,
   * deliberately bypassed): while a decision is open only respondDecision and
   * surrender are accepted. Every gated verb keys off the synchronized
   * state.pendingDecision (the contract's source of truth, which the DecisionManager
   * mirrors), so the action modules and the router agree.
   */
  applyIntent(seat: Seat, intent: Intent): IntentResult {
    switch (intent.type) {
      case "playCard":
        return this.handlePlayCard(seat, intent);

      case "digivolve":
        return this.handleDigivolve(seat, intent);

      case "attack":
        return this.handleAttack(seat, intent);

      case "declareBlock":
        return applyDeclareBlock(this.blockDeps(), seat, intent);

      case "declineBlock":
        return applyDeclineBlock(this.blockDeps(), seat);

      case "respondCounter":
        return this.handleRespondCounter(seat, intent);

      case "respondAlliance":
        return applyRespondAlliance(this.combatDecisionDeps(), seat, intent);

      case "respondEvade":
        return applyRespondEvade(this.combatDecisionDeps(), seat, intent);

      case "respondBarrier":
        return applyRespondBarrier(this.combatDecisionDeps(), seat, intent);

      case "activateEffect":
        return this.handleActivateEffect(seat, intent);

      case "linkCard":
        return this.handleLinkCard(seat, intent);

      case "dnaDigivolve":
        return this.handleDnaDigivolve(seat, intent);

      case "endPhase":
        // During the Breeding phase, endPhase is "do nothing" — it skips the breeding
        // action window (API-CONTRACT "advance Main -> End (or skip Breeding action)").
        // During the Main phase it ends the turn (intentRouter / MainPhaseController).
        if (this.state.phase === Phase.Breeding) {
          return this.handleBreedingSkip(seat);
        }
        return handleEndPhase(this.intentRouterDeps(), seat);

      case "respondDecision":
        return handleRespondDecision(this.intentRouterDeps(), seat, intent);

      case "ready":
        return handleReady(this.intentRouterDeps(), seat);

      case "surrender":
        return handleSurrender(this.intentRouterDeps(), seat);

      case "mulligan":
        return this.mulligan.answer(seat, intent.keep) ? { ok: true } : { ok: false, reason: "decision-pending" };

      case "hatchEgg":
        return this.handleHatchEgg(seat, intent);

      case "moveFromBreeding":
        return this.handleMoveFromBreeding(seat, intent);

      default: {
        // Exhaustiveness guard: a new Intent variant must be handled above.
        const exhaustive: never = intent;
        void exhaustive;
        return { ok: false, reason: "unknown-intent" };
      }
    }
  }

  /**
   * Re-evaluate the turn-end condition after a turn-player verb has resolved: end the
   * Main phase if the gauge has crossed to the opponent, then auto-end it if the turn
   * player has no remaining legal action. Must run AFTER a continuation-based verb's
   * awaited effect resolves — running it synchronously after dispatch would end the
   * turn on the play cost's cross before the On Play effect ever ran.
   */
  private checkTurnEndAfterVerb(): void {
    // Main becomes observable before its asynchronous entry timing has completely
    // unwound. If a client submits a verb in that interval, the entry finalizer and
    // any nested state sync must not end the phase from the already-paid memory cost;
    // the continuation's own final check will run after every effect and decision.
    if (this.mainVerbContinuationsInFlight > 0) return;
    // Nested plays/digivolutions can invoke this hook while the outer card effect is
    // still resolving. Blitz belongs after that whole effect window, never between its
    // clauses or ahead of their target selections.
    if (this.activeWindowToken !== undefined) return;

    // Effects resolved inside an attack (for example ST12-10 playing Sistermon Ciel)
    // may restore memory and call this hook before CombatController has released its
    // in-progress guard. At that instant every normal Main verb is intentionally
    // illegal, so `hasAnyMainPhaseAction` would mistake the transient combat window
    // for a dead Main phase and close the turn. The attack continuation calls this
    // method again after `isAttacking` becomes false; only that final check may decide
    // whether the restored-memory turn remains open.
    if (this.combat.isAttacking) return;

    // ＜Blitz＞ (§16-22): when memory has crossed to the opponent but the turn
    // player has an unsuspended Blitz Digimon that hasn't attacked this turn, keep
    // the Main phase open for one more attack. Skip the turn-end check so the
    // player can declare the Blitz attack; after it resolves this method is called
    // again and the turn ends normally.
    if (this.memory.hasCrossedToOpponent()) {
      const accepted = this.combat
        .blitzEligiblePermanentIds(this.state.turnSeat)
        .find((permanentId) => this.acceptedBlitzAttackers.has(permanentId));
      if (accepted !== undefined || this.blitzDecisionInFlight) return;

      const candidate = this.combat
        .blitzEligiblePermanentIds(this.state.turnSeat)
        .find((permanentId) => !this.resolvedBlitzOpportunities.has(permanentId));
      if (candidate !== undefined && this.state.pendingDecision === undefined) {
        const permanent = this.access.permanentById(candidate);
        this.blitzDecisionInFlight = true;
        void this.decisions
          .request({
            seat: this.state.turnSeat,
            kind: "optional",
            promptText: "Activate Blitz?",
            ...(permanent?.topCard?.cardId !== undefined ? { sourceCardId: permanent.topCard.cardId } : {}),
            options: { promptKey: "activateBlitz" },
          })
          .then((response) => {
            this.resolvedBlitzOpportunities.add(candidate);
            if (response.kind === "optional" && response.accept) {
              this.acceptedBlitzAttackers.add(candidate);
              this.syncAttackTargets();
            }
          })
          .finally(() => {
            this.blitzDecisionInFlight = false;
            this.checkTurnEndAfterVerb();
          });
        return;
      }
    }
    this.mainPhase.checkTurnEnd();
    if (this.mainPhase.isOpen && !this.hasAnyMainPhaseAction(this.state.turnSeat)) {
      this.mainPhase.endPhaseRequested(this.state.turnSeat);
    }
  }

  /**
   * Track one accepted async Main verb and make its final turn-end check authoritative.
   *
   * `start` is a THUNK, not a promise: the verb must not begin until every previously
   * accepted verb has fully settled. Intents are gated on an open decision, but nothing
   * gated them on a verb whose triggers were merely still settling, so two resolutions
   * ran concurrently and both could reach a prompt — the second threw out of
   * `DecisionManager.request`, aborting a card's clause halfway (memory never gained, a
   * card never drawn) in whichever card lost the race.
   *
   * Only these turn-player verbs queue. The replies that DRIVE a running resolution —
   * respondDecision, respondCounter, and the combat decisions — deliberately bypass this
   * seam, so serializing here cannot deadlock the chain they are answering.
   *
   * A verb arriving while nothing is in flight still begins SYNCHRONOUSLY, exactly as
   * before: a verb's synchronous prefix (paying cost, moving the card out of hand) has
   * always run by the time `applyIntent` returns, and callers read state expecting that.
   * Only a verb that arrives while another is still settling waits.
   *
   * The trade-off for that waiting verb is deliberate: it was validated when it arrived
   * but applies after the previous chain finishes, so it may find a board that moved.
   * That beats the alternative it replaces — applying against state another chain is
   * mutating underneath it.
   */
  private continueMainVerb<T>(
    start: () => Promise<T>,
    onResolved: (value: T) => void,
    onRejected: (error: unknown) => void,
  ): void {
    const idle = this.mainVerbContinuationsInFlight === 0;
    this.mainVerbContinuationsInFlight += 1;
    const begun = idle ? start() : this.mainVerbChain.then(start);
    const settled = begun.then(onResolved).catch(onRejected);
    // The queue tail must never carry a rejection forward, or one failed verb would
    // reject every verb queued behind it.
    this.mainVerbChain = settled.then(
      () => {},
      () => {},
    );
    void settled.finally(() => {
      this.mainVerbContinuationsInFlight -= 1;
      this.checkTurnEndAfterVerb();
    });
  }

  /** Enforce that a crossed-memory attack is the single Blitz window the player accepted. */
  private handleAttack(seat: Seat, intent: AttackIntent): IntentResult {
    if (this.memory.hasCrossedToOpponent() && !this.acceptedBlitzAttackers.has(intent.attackerPermanentId)) {
      return { ok: false, reason: this.state.pendingDecision ? "decision-pending" : "wrong-phase" };
    }
    const deps = this.attackDeps();
    const result = applyAttack(
      {
        ...deps,
        onCombatComplete: () => {
          this.acceptedBlitzAttackers.delete(intent.attackerPermanentId);
          this.resolvedBlitzOpportunities.add(intent.attackerPermanentId);
          this.syncAttackTargets();
          // Combat moves memory, so what the hand can afford moved with it.
          this.syncHandAffordances();
          this.checkTurnEndAfterVerb();
          this.hooks.onActionSettled?.(seat, "attack");
        },
      },
      seat,
      intent,
    );
    return result;
  }

  /** Public legality signal used by clients/tests to know the confirmed Blitz window is ready. */
  hasAcceptedBlitzAttack(permanentId: string): boolean {
    return this.acceptedBlitzAttackers.has(permanentId);
  }

  /** Assemble the non-combat verb router's dependencies (subsystem: intent-protocol-and-room). */
  private intentRouterDeps(): IntentRouterDeps {
    return {
      state: this.state,
      win: this.win,
      decisions: this.decisions,
      mainPhase: this.mainPhase,
      markReady: (seat) => {
        this.readySeats.add(seat);
        const bothReady = this.readySeats.size >= 2;
        if (bothReady && !this.bothReadyFired) {
          this.bothReadyFired = true;
          this.hooks.onBothReady?.();
        }
        return bothReady;
      },
    };
  }

  /**
   * Route the activateEffect verb (subsystem: intent-protocol-and-room). Validates
   * synchronously for the immediate IntentResult; on success runs the named [Main]
   * ability as a continuation (it may await player decisions, whose prompts arrive on
   * the decision channel and whose state mutations sync as Colyseus deltas), then
   * re-checks the turn-end condition. Mirrors the play/digivolve handler shape.
   */
  private handleActivateEffect(seat: Seat, intent: ActivateEffectIntent): IntentResult {
    const deps = this.activateEffectDeps();
    const check = validateActivateEffect(this.state, seat, intent, deps);
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }
    this.continueMainVerb(
      async () => {
        const outcome = await applyActivateEffect(this.state, seat, intent, deps);
        // Direct [Main] activations do not pass through a timing-window resolver, so
        // perform the post-effect rule check here (e.g. a stack peel exposing a 0-DP card).
        await this.ruleProcess();
        return outcome;
      },
      (outcome) => {
        if (outcome.ok) {
          this.hooks.emit({
            kind: "effectActivated",
            seat,
            sourceCardId: outcome.outcome.sourceCardId,
            effectKey: outcome.outcome.effectKey,
            description: outcome.outcome.description,
          });
          // Tracker was updated by applyActivateEffect; re-derive the activatable set
          // so the UI reflects the consumed use immediately (maxPerTurn exhausted).
          this.syncActivatableEffects();
          // An ability that paid or gained memory changes what the hand can afford.
          this.syncHandAffordances();
        }
      },
      (err) => {
        logError("[engine] activateEffect apply failed:", err);
        this.hooks.emit({
          kind: "actionRejected",
          intent: "activateEffect",
          reason: err instanceof Error ? err.message : "activate-effect-apply-error",
        });
      },
    );
    return { ok: true };
  }

  /**
   * Route the respondCounter verb (subsystem: attack-and-block; §11-3 Counter
   * Timing). Validates synchronously for the immediate IntentResult; on success
   * runs the chosen [Counter] effect (if any) as a continuation, mirroring
   * handleActivateEffect — but unlike a turn-player verb, does NOT run
   * `checkTurnEndAfterVerb` (this fires mid-attack, for the defending seat; the
   * sibling combat-decision verbs in combatDecisions.ts don't run it either).
   */
  private handleRespondCounter(seat: Seat, intent: RespondCounterIntent): IntentResult {
    if (intent.sourceInstanceId !== undefined && intent.effectKey?.startsWith("blast-digivolve:") === true) {
      if (!this.combat.hasOpenCounterWindow) return { ok: false, reason: "wrong-phase" };
      if (this.combat.counterWindowSeat !== seat) return { ok: false, reason: "not-your-turn" };
      if (this.combat.counterActivationsRemaining <= 0) return { ok: false, reason: "illegal-target" };
      const eligible = this.counterEligibleSources(seat).find(
        (entry) => entry.instanceId === intent.sourceInstanceId && entry.effectKey === intent.effectKey,
      );
      if (eligible === undefined) return { ok: false, reason: "illegal-target" };
      const permanentId = intent.effectKey.slice("blast-digivolve:".length);
      const blastIntent: DigivolveIntent = {
        type: "digivolve",
        permanentId,
        instanceId: intent.sourceInstanceId,
        useBlastDigivolve: true,
      };
      const digivolveDeps = this.digivolveDeps();
      void applyDigivolve(this.state, seat, blastIntent, digivolveDeps)
        .then((outcome) => {
          if (!outcome.ok) throw new Error(outcome.reason);
          this.combat.resolveCounterActivated(seat);
          this.hooks.emit({
            kind: "effectActivated",
            seat,
            sourceCardId: outcome.outcome.newTopCardId,
            effectKey: intent.effectKey!,
            description: eligible.description,
          });
        })
        .catch((err) => {
          logError("[engine] Blast Digivolve apply failed:", err);
          this.hooks.emit({
            kind: "actionRejected",
            intent: "respondCounter",
            reason: err instanceof Error ? err.message : "blast-digivolve-apply-error",
          });
        });
      return { ok: true };
    }
    const deps = this.respondCounterDeps();
    const check = validateRespondCounter(seat, intent, deps);
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }
    void applyRespondCounter(seat, intent, deps)
      .then((outcome) => {
        if (outcome.ok && !outcome.outcome.pass) {
          this.hooks.emit({
            kind: "effectActivated",
            seat,
            sourceCardId: outcome.outcome.sourceCardId,
            effectKey: outcome.outcome.effectKey,
            description: outcome.outcome.description,
          });
        }
      })
      .catch((err) => {
        logError("[engine] respondCounter apply failed:", err);
        this.hooks.emit({
          kind: "actionRejected",
          intent: "respondCounter",
          reason: err instanceof Error ? err.message : "respond-counter-apply-error",
        });
      });
    return { ok: true };
  }

  /** Dependencies the respondCounter verb needs (subsystem: attack-and-block). */
  private respondCounterDeps(): RespondCounterDeps {
    return {
      combat: this.combat,
      findInstance: (instanceId) => this.findInstance(instanceId),
      cardSourceOf: (instance) => this.cardSourceOf(instance),
      // A player-activated [Counter] ability has no incoming trigger payload (it is
      // not reacting to another event), so the TriggerInfo is empty — same as
      // activateEffectDeps.makeContext.
      makeContext: (source, _effect) => this.buildEffectContext(source, {}),
      tracker: this.tracker,
    };
  }

  /**
   * List `seat`'s currently-activatable [Counter] effects (§11-3-1), one entry per
   * (source instance, effect) pair. Mirrors `syncActivatableEffects` but scoped to
   * one (defending) seat and `EffectTiming.OnCounterTiming` rather than the turn
   * player and `ACTIVATE_TIMING`. Both battle-area Counter effects and explicit
   * `[Hand][Counter]` effects are eligible. Bound into `CombatController`'s
   * `counterEligible` hook so `runCounterWindow` can skip the round trip when nothing is eligible.
   */
  private counterEligibleSources(seat: Seat): { instanceId: string; effectKey: string; description: string }[] {
    const player = this.state.players[seat];
    if (player === undefined) return [];
    const entries: { instanceId: string; effectKey: string; description: string }[] = [];
    for (const perm of player.battleArea) {
      const candidates = [perm.topCard, ...perm.stack, ...perm.linked].filter(
        (c): c is CardInstance => c !== undefined,
      );
      for (const instance of candidates) {
        const source = this.cardSourceOf(instance);
        for (const effect of effectsOf(EffectTiming.OnCounterTiming, source)) {
          const ctx = this.buildEffectContext(source, {});
          if (canTrigger(effect, ctx, this.tracker) && canActivate(effect, ctx, this.tracker)) {
            entries.push({
              instanceId: instance.instanceId,
              effectKey: effect.effectKey,
              description: effect.description,
            });
          }
        }
      }
    }
    for (const instance of player.hand) {
      const source = this.cardSourceOf(instance);
      for (const effect of effectsOf(EffectTiming.OnCounterTiming, source)) {
        const ctx = this.buildEffectContext(source, {});
        if (canTrigger(effect, ctx, this.tracker) && canActivate(effect, ctx, this.tracker)) {
          entries.push({
            instanceId: instance.instanceId,
            effectKey: effect.effectKey,
            description: effect.description,
          });
        }
      }
    }
    const blastDeps = { ...this.digivolveDeps(), blastWindowAllowed: () => true };
    for (const instance of player.hand) {
      if (!hasBlastDigivolveKeyword(instance.cardId)) continue;
      for (const permanent of player.battleArea) {
        const intent: DigivolveIntent = {
          type: "digivolve",
          permanentId: permanent.permanentId,
          instanceId: instance.instanceId,
          useBlastDigivolve: true,
        };
        if (!validateDigivolve(this.state, seat, intent, blastDeps).ok) continue;
        entries.push({
          instanceId: instance.instanceId,
          effectKey: `blast-digivolve:${permanent.permanentId}`,
          description: "＜Blast Digivolve＞",
        });
      }
    }
    return entries;
  }

  /** Dependencies the activateEffect verb needs (subsystem: intent-protocol-and-room). */
  private activateEffectDeps(): ActivateEffectDeps {
    return {
      findInstance: (instanceId) => this.findInstance(instanceId),
      cardSourceOf: (instance) => this.cardSourceOf(instance),
      activationEffectsFor: (instance) => this.activatableEffectsFor([instance]),
      // A directly-activated [Main] ability has no incoming trigger payload (it is
      // not reacting to another event), so the TriggerInfo is empty. It still carries
      // the named effect's provenance because every nested decision must render this
      // exact [Main]/Delay clause rather than guessing from the card's first text box.
      makeContext: (source, effect, conferredToPermanentId, conferralGranterInstanceId) =>
        this.activationContext({
          source,
          effect,
          ...(conferredToPermanentId === undefined ? {} : { conferredToPermanentId }),
          ...(conferralGranterInstanceId === undefined ? {} : { conferralGranterInstanceId }),
        }),
      tracker: this.tracker,
      enterEffectResolution: (seat, sourceKinds, sourcePermanentId) =>
        this.primitives.enterEffectResolution?.(seat, sourceKinds, sourcePermanentId),
      leaveEffectResolution: () => this.primitives.leaveEffectResolution?.(),
    };
  }

  /**
   * Locate a CardInstance anywhere on the board (a permanent's top card, its
   * digivolution stack, or a linked card), returning the instance and the permanent
   * carrying it (undefined for a loose card not on a permanent). Used by
   * activateEffect to resolve the source of a `[Main]` ability.
   */
  private findInstance(instanceId: string): { instance: CardInstance; permanent: Permanent | undefined } | undefined {
    for (const player of this.state.players) {
      for (const permanent of player.battleArea) {
        const onPerm = this.instanceOnPermanent(permanent, instanceId);
        if (onPerm !== undefined) return { instance: onPerm, permanent };
      }
      if (player.breeding !== undefined) {
        const onBreeding = this.instanceOnPermanent(player.breeding, instanceId);
        if (onBreeding !== undefined) return { instance: onBreeding, permanent: player.breeding };
      }
      // A loose card in hand (no carrying permanent): reachable so a [Hand] activated ability
      // resolves. The activate verb's controller check falls back to the loose card's ownerSeat, so
      // a player can only activate their own hand card. permanent stays undefined (no field anchor).
      const inHand = player.hand.find((c) => c.instanceId === instanceId);
      if (inHand !== undefined) return { instance: inHand, permanent: undefined };
      // A loose card in trash: reachable so a `[Trash][Main]` activated ability resolves
      // (the eighth engine gap's activation-path half — the corresponding regression coverage).
      // permanent stays undefined; the `activated` builder's residency guard (isFromTrash vs.
      // not) is what keeps this from also making an ordinary on-field-only [Main] ability
      // activatable once its card has been trashed.
      const inTrash = player.trash.find((c) => c.instanceId === instanceId);
      if (inTrash !== undefined) return { instance: inTrash, permanent: undefined };
    }
    return undefined;
  }

  /**
   * Locate a CardInstance anywhere the continuous-recompute pass reaches (battle area,
   * breeding, hand, trash, face-up security, a mid-resolution Option) — the superset
   * `findInstance` does NOT cover (findInstance is scoped to what `activateEffect` needs:
   * a permanent's own stack/linked cards, or a loose hand/trash card). Used by
   * `fireSubTrigger`'s context builder to bind `ctx.source` for an anchor-less watcher
   * (`SubTriggerInstall.sourceInstanceId`) installed by a hand/trash-resident card.
   */
  private findLooseInstance(instanceId: string): CardInstance | undefined {
    return this.listCandidateInstances().find((c) => c.instanceId === instanceId);
  }

  private instanceOnPermanent(permanent: Permanent, instanceId: string): CardInstance | undefined {
    if (permanent.topCard !== undefined && permanent.topCard.instanceId === instanceId) {
      return permanent.topCard;
    }
    for (const card of permanent.stack) {
      if (card.instanceId === instanceId) return card;
    }
    for (const card of permanent.linked) {
      if (card.instanceId === instanceId) return card;
    }
    return undefined;
  }

  /**
   * Route the play-card verb (subsystem: play-card). Validates synchronously to
   * produce the immediate IntentResult the room returns to the client; on success,
   * applies the action. Because applyPlayCard can await player decisions while
   * resolving On Play (or the option activation), it runs as a continuation — its
   * state mutations sync to clients as Colyseus deltas and any prompt arrives on the
   * decision channel, matching the API-CONTRACT "Play a card" flow.
   */
  private handlePlayCard(seat: Seat, intent: PlayCardIntent): IntentResult {
    // A DigiXros declaration (place named materials under the card for a per-material cost
    // reduction) routes to the dedicated DigiXros play subsystem.
    if (intent.digiXros !== undefined) {
      return this.handleDigiXros(seat, intent as DigiXrosIntent);
    }
    // An Assembly declaration (place the exact named/traited trash-card count under the card for
    // a flat cost reduction, §7-3) routes to the dedicated Assembly play subsystem.
    if (intent.assembly !== undefined) {
      return this.handleAssembly(seat, intent as AssemblyIntent);
    }
    const deps = this.playCardDeps();
    const check = validatePlayCard(this.state, seat, intent, deps);
    if (!check.ok) {
      return { ok: false, reason: mapPlayCardReason(check.reason) };
    }
    this.continueMainVerb(
      () => applyPlayCard(this.state, seat, intent, deps),
      () => {},
      (err) => {
        logError("[engine] playCard apply failed:", err);
        this.hooks.emit({
          kind: "actionRejected",
          intent: "playCard",
          reason: err instanceof Error ? err.message : "play-card-apply-error",
        });
      },
    );
    return { ok: true };
  }

  /**
   * Route a DigiXros play (subsystem: digiXros). Validates the material/expander declaration
   * synchronously for the immediate IntentResult; on success applies it as a continuation (the
   * placement + On Play can await player decisions), matching the playCard router.
   */
  private handleDigiXros(seat: Seat, intent: DigiXrosIntent): IntentResult {
    const deps = this.digiXrosDeps();
    const check = validateDigiXros(this.state, seat, intent, deps);
    if (!check.ok) {
      return { ok: false, reason: mapDigiXrosReason(check.reason) };
    }
    this.continueMainVerb(
      () => applyDigiXros(this.state, seat, intent, deps),
      () => {},
      (err) => {
        logError("[engine] digiXros apply failed:", err);
        this.hooks.emit({
          kind: "actionRejected",
          intent: "playCard",
          reason: err instanceof Error ? err.message : "digixros-apply-error",
        });
      },
    );
    return { ok: true };
  }

  /**
   * Side-effect dependencies for the DigiXros play subsystem. Memory math is the shared gauge
   * (identical to playCard / digivolve); placement and suspension are delegated to the canonical
   * primitives; On Play fires through the effect stack scoped to the played instance, plus the
   * board-wide OnEnterFieldAnyone / whenPlayed seams (mirroring playCardDeps.fireTiming).
   */
  private digiXrosDeps(): DigiXrosDeps {
    const mem = memoryDepsFromGauge(this.memory);
    return {
      maxAffordable: mem.maxAffordable,
      payMemory: mem.payMemory,
      adjustedPlayCost: (_state, seat, definition, base) =>
        this.modifiers.playCostFor({ def: definition, controllerSeat: seat }, base),
      finalizePlayCost: async (_state, _seat, instance, _definition, baseCost) =>
        this.fireBeforePayCost(instance, baseCost, false, "hand"),
      digiXrosNamesOf: (instanceId) => {
        const located = this.findInstance(instanceId);
        if (located === undefined) return [];
        const aliases = [
          ...universalNameAliasesFor(located.instance.cardId),
          ...digiXrosOnlyNameAliasesFor(located.instance.cardId),
        ];
        if (located.permanent === undefined) return aliases;
        return [
          ...new Set([
            ...aliases,
            ...this.continuous.grantedNames(located.permanent.permanentId),
            ...this.continuous.grantedDigiXrosNames(located.permanent.permanentId),
          ]),
        ];
      },
      canSubstituteMaterial: (permanentId) => this.continuous.hasKeyword(permanentId, "DigiXrosSubstitute"),
      nextPermanentId: () => this.nextPermanentId(),
      placeUnder: (targetPermanentId, instanceIds) => this.primitives.placeUnder(targetPermanentId, instanceIds),
      placePendingDigivolution: this.playCardDeps().placePendingDigivolution,
      relocatePermanent: (destPermanentId, sourcePermanentId, opts) =>
        this.primitives.relocatePermanent(destPermanentId, sourcePermanentId, opts),
      suspendPermanent: async (permanentId) => {
        await this.primitives.suspend([permanentId]);
      },
      fireTiming: async (_state, _seat, timing, sourceInstanceId, materialCount) =>
        this.firePlayEntryWindows(timing, sourceInstanceId, { digiXrosMaterialCount: materialCount }),
      emit: (event) => this.hooks.emit(event as ServerEvent),
    };
  }

  /**
   * Route an Assembly play (subsystem: assembly; §7-3). Validates the trash-material declaration
   * synchronously for the immediate IntentResult; on success applies it as a continuation (the
   * placement + On Play can await player decisions), matching the digiXros/playCard routers.
   */
  private handleAssembly(seat: Seat, intent: AssemblyIntent): IntentResult {
    const deps = this.assemblyDeps();
    const check = validateAssembly(this.state, seat, intent, deps);
    if (!check.ok) {
      return { ok: false, reason: mapAssemblyReason(check.reason) };
    }
    this.continueMainVerb(
      () => applyAssembly(this.state, seat, intent, deps),
      () => {},
      (err) => {
        logError("[engine] assembly apply failed:", err);
        this.hooks.emit({
          kind: "actionRejected",
          intent: "playCard",
          reason: err instanceof Error ? err.message : "assembly-apply-error",
        });
      },
    );
    return { ok: true };
  }

  /**
   * Side-effect dependencies for the Assembly play subsystem (§7-3). Memory math is the shared
   * gauge (identical to playCard / DigiXros / digivolve); placement is delegated to the canonical
   * `placeUnder` primitive; On Play fires through the effect stack scoped to the played instance,
   * plus the board-wide OnEnterFieldAnyone / whenPlayed seams (mirroring digiXrosDeps.fireTiming).
   */
  private assemblyDeps(): AssemblyDeps {
    const mem = memoryDepsFromGauge(this.memory);
    return {
      maxAffordable: mem.maxAffordable,
      payMemory: mem.payMemory,
      adjustedPlayCost: (_state, seat, definition, base) =>
        this.modifiers.playCostFor({ def: definition, controllerSeat: seat }, base),
      nextPermanentId: () => this.nextPermanentId(),
      placeUnder: (targetPermanentId, instanceIds) => this.primitives.placeUnder(targetPermanentId, instanceIds),
      fireTiming: async (_state, _seat, timing, sourceInstanceId) =>
        this.firePlayEntryWindows(timing, sourceInstanceId),
      emit: (event) => this.hooks.emit(event as ServerEvent),
    };
  }

  /**
   * Route the digivolve verb (subsystem: digivolve). Validates synchronously to
   * produce the immediate IntentResult the room returns to the client; on success,
   * applies the action. Because applyDigivolve can await player decisions while
   * resolving When Digivolving, it runs as a continuation — its state mutations sync
   * to clients as Colyseus deltas and any prompt arrives on the decision channel,
   * matching the API-CONTRACT "Digivolve" flow.
   */
  private handleDigivolve(seat: Seat, intent: DigivolveIntent): IntentResult {
    const deps = this.digivolveDeps();
    const check = validateDigivolve(this.state, seat, intent, deps);
    if (!check.ok) {
      return { ok: false, reason: mapDigivolveReason(check.reason) };
    }
    this.continueMainVerb(
      () => applyDigivolve(this.state, seat, intent, deps),
      () => {},
      (err) => {
        logError("[engine] digivolve apply failed:", err);
        this.hooks.emit({
          kind: "actionRejected",
          intent: "digivolve",
          reason: err instanceof Error ? err.message : "digivolve-apply-error",
        });
      },
    );
    return { ok: true };
  }

  /**
   * Dependencies the linkCard verb needs (subsystem: link). The memory gauge is the
   * same seam digivolve uses; `linkRequirementSatisfied` reuses this engine's own
   * §17-1-3-2-6/7 rule-check predicate so declaration-time legality and the ongoing
   * sweep can never disagree; `link` delegates the actual plug-in to the existing
   * Link primitive (effects/primitives.ts).
   */
  private linkCardDeps(): LinkCardDeps {
    const mem = memoryDepsFromGauge(this.memory);
    return {
      maxAffordable: mem.maxAffordable,
      payMemory: mem.payMemory,
      linkRequirementSatisfied: (hostDefinition, linkedCard) =>
        this.linkRequirementSatisfied(hostDefinition, linkedCard),
      linkCostReduction: (targetPermanentId, traits) =>
        this.continuous.linkCostReductionGrant(
          targetPermanentId,
          traits,
          (key) => this.tracker.count(`link-cost/${key}`, "replacement") > 0,
        )?.amount ?? 0,
      resolveLinkCostReduction: async (targetPermanentId, traits) => {
        const grant = this.continuous.linkCostReductionGrant(
          targetPermanentId,
          traits,
          (key) => this.tracker.count(`link-cost/${key}`, "replacement") > 0,
        );
        if (grant === undefined) return 0;
        if (grant.optional === true) {
          const response = await this.decisions.request({
            seat: grant.controllerSeat ?? this.state.turnSeat,
            kind: "optional",
            promptText: `Reduce this Link cost by ${grant.amount}?`,
          });
          if (response.kind !== "optional" || !response.accept) return 0;
        }
        if (grant.oncePerTurnKey !== undefined) {
          this.tracker.register(`link-cost/${grant.oncePerTurnKey}`, "replacement");
        }
        return grant.amount;
      },
      link: (targetPermanentId, instanceIds) => this.primitives.link(targetPermanentId, instanceIds),
      ruleProcess: () => this.ruleProcess(),
    };
  }

  /**
   * Route the linkCard verb (subsystem: link; §6-5-1-4/§10-1 — the hand half only,
   * see actions/link.ts). Validates synchronously to produce the immediate
   * IntentResult the room returns to the client; on success, applies the action as a
   * continuation (the Link primitive can await the `whenLinked` SubTrigger bus),
   * matching the pattern of the other Main-phase verbs above.
   */
  private handleLinkCard(seat: Seat, intent: LinkCardIntent): IntentResult {
    const deps = this.linkCardDeps();
    const check = validateLinkCard(this.state, seat, intent, deps);
    if (!check.ok) {
      return { ok: false, reason: mapLinkReason(check.reason) };
    }
    this.continueMainVerb(
      () => applyLinkCard(this.state, seat, intent, deps),
      () => {},
      (err) => {
        logError("[engine] linkCard apply failed:", err);
        this.hooks.emit({
          kind: "actionRejected",
          intent: "linkCard",
          reason: err instanceof Error ? err.message : "linkCard-apply-error",
        });
      },
    );
    return { ok: true };
  }

  /**
   * Dependencies the dnaDigivolve verb needs (subsystem: dna-digivolve; §8-2). The memory
   * gauge is the same seam digivolve/link use; `matchingCost` binds `dnaDigivolveCostFor`
   * (effects/primitives.ts) so this verb's cost-matching can never drift from the
   * `dnaDigivolveInto` primitive's own; `costWaived` reads the same ＜Blast Digivolve＞/
   * ＜Blast DNA Digivolve＞ compiled-IR registry `digivolveDeps` uses (§16-26/§16-31).
   */
  private dnaDigivolveDeps(): DnaDigivolveDeps {
    const mem = memoryDepsFromGauge(this.memory);
    return {
      maxAffordable: mem.maxAffordable,
      matchingCost: (definition, materials) => dnaDigivolveCostFor(definition, materials),
      effectiveMaterialDefinitions: (_state, materials, definition) =>
        materials.map((material) => {
          const printed = lookupDefinition(material.topCard!.cardId)!;
          const effectiveLevel = this.continuous.dnaLevelFor(material.permanentId, definition);
          const names = effectiveNames(this.continuous, material, printed.nameEn ?? printed.cardId);
          return {
            ...printed,
            ...(effectiveLevel === undefined ? {} : { level: effectiveLevel }),
            nameEn: names.join(" | "),
          };
        }),
      adjustedCost: (_state, materials, definition, printedCost) => {
        let cost = printedCost;
        const target = materials[0];
        if (target !== undefined) {
          const adjustment = this.modifiers.evoCostFor(target, definition);
          if (adjustment !== undefined) {
            cost = "fixed" in adjustment ? adjustment.fixed : cost + adjustment.delta;
          }
        }
        return Math.max(0, cost - this.subTriggers.dnaCostReductionFor(materials, definition));
      },
      potentialInteractiveDnaDigivolveReduction: (_state, seat, materials, definition) => {
        const target = materials[0];
        if (target === undefined || this.continuous.blocksCostReduction(seat, "digivolve")) return 0;
        return this.subTriggers.potentialInteractiveReductionFor("wouldDigivolve", seat, target, definition, {
          hasFired: (key) => this.tracker.count(key, "replacement") > 0,
          markFired: (key) => this.tracker.register(key, "replacement"),
        });
      },
      activateInteractiveDnaDigivolveReduction: async (_state, seat, materials, definition, evolvingInstanceId) => {
        const target = materials[0];
        if (target === undefined || this.continuous.blocksCostReduction(seat, "digivolve")) return 0;
        return this.subTriggers.activateInteractiveReductionsFor(
          "wouldDigivolve",
          seat,
          target,
          definition,
          evolvingInstanceId,
          (sourcePermanentId, sourceInstanceId) => {
            const source = this.access.permanentById(sourcePermanentId);
            return source?.topCard === undefined
              ? undefined
              : this.buildEffectContext(
                  this.cardSourceOf(this.findInstance(sourceInstanceId ?? "")?.instance ?? source.topCard),
                  {},
                );
          },
          {
            hasFired: (key) => this.tracker.count(key, "replacement") > 0,
            markFired: (key) => this.tracker.register(key, "replacement"),
          },
          materials,
        );
      },
      costWaived: (_state, instance) => hasBlastDigivolveKeyword(instance.cardId),
      materialsRestricted: (_state, materials, definition) =>
        materials.some(
          (material) =>
            this.continuous.hasRestriction(material.permanentId, "digivolve") ||
            (definition.level === 7 && this.continuous.hasRestriction(material.permanentId, "digivolveToLevel7")) ||
            (!material.isSuspended && this.continuous.isUnsuspendedDigivolveProhibited(material.controllerSeat)),
        ),
      dnaDigivolveInto: (materialPermanentIds, resultInstanceId, opts) =>
        this.primitives.dnaDigivolveInto(materialPermanentIds, resultInstanceId, opts),
    };
  }

  /**
   * Route the dnaDigivolve verb (subsystem: dna-digivolve; §8-2 DNA digivolution as a
   * player-declared action — see actions/dnaDigivolve.ts). Validates synchronously to
   * produce the immediate IntentResult the room returns to the client; on success, applies
   * the action as a continuation (the merge primitive draws and fires WhenDigivolving),
   * matching the pattern of the other Main-phase verbs above.
   */
  private handleDnaDigivolve(seat: Seat, intent: DnaDigivolveIntent): IntentResult {
    const deps = this.dnaDigivolveDeps();
    const check = validateDnaDigivolve(this.state, seat, intent, deps);
    if (!check.ok) {
      return { ok: false, reason: mapDnaDigivolveReason(check.reason) };
    }
    this.continueMainVerb(
      () => applyDnaDigivolve(this.state, seat, intent, deps),
      () => {},
      (err) => {
        logError("[engine] dnaDigivolve apply failed:", err);
        this.hooks.emit({
          kind: "actionRejected",
          intent: "dnaDigivolve",
          reason: err instanceof Error ? err.message : "dnaDigivolve-apply-error",
        });
      },
    );
    return { ok: true };
  }

  /**
   * Route the hatchEgg verb (subsystem: breeding). Applies the action synchronously
   * (breeding has no cost / draw / awaited effect), and on success closes the open
   * breeding window — the turn player's single breeding action is spent (§6-4-1).
   */
  private handleHatchEgg(seat: Seat, intent: HatchEggIntent): IntentResult {
    void intent;
    const result = applyHatchEgg(this.state, seat, this.breedingDeps());
    if (!result.ok) return { ok: false, reason: mapBreedingReason(result.reason) };
    this.breeding.actionTaken(seat);
    // "[All Turns] when YOU hatch [a Digi-Egg] in the breeding area" (BT17-093). Fire-and-forget
    // from this sync intent handler, mirroring the OnMove fire in handleMoveFromBreeding.
    void this.fireSubTrigger("whenHatch", { subjectPermanentId: result.outcome.permanentId }).catch((err) => {
      logError("[engine] hatchEgg fire failed:", err);
    });
    return { ok: true };
  }

  /**
   * Route the moveFromBreeding verb (subsystem: breeding). Applies the action and, on
   * success, closes the open breeding window (the single breeding action is spent).
   */
  private handleMoveFromBreeding(seat: Seat, intent: MoveFromBreedingIntent): IntentResult {
    const result = applyMoveFromBreeding(this.state, seat, intent, this.breedingDeps());
    if (!result.ok) return { ok: false, reason: mapBreedingReason(result.reason) };
    this.breeding.actionTaken(seat);
    const movedPermanentId = result.outcome.permanentId;
    // The breeding -> battle move fires the OnMove timing, the broad entry timing/bus, then
    // the two movement SubTrigger events below so reactive watchers execute (both fired unconditionally:
    // a watcher's sourceFilter (isSelfRef / controller matching) gates which side reacts):
    //   whenMovedFromBreeding         — "when one of YOUR Digimon moves from breeding" (BT16-082)
    //   whenOpponentMovedFromBreeding — "when your OPPONENT moves a Digimon from breeding" (BT5-044, BT11-087)
    // Fire-and-forget from this sync intent handler, mirroring the OnDraw fire in drawCards —
    // but unlike drawCards (which is itself awaited by its own caller), this handler must return
    // its IntentResult synchronously, so the fires are chained into one promise: sequential
    // internal ordering (each begins only after the previous settles) with a single .catch(logError)
    // so a thrown error surfaces as a log instead of an unhandled rejection. Un-awaited/uncaught
    // fires here previously risked exactly the race P-130's fix eliminated for movePermanentZone:
    // a nested fire clobbering the then-shared engine trigger field out of order (each window
    // now carries its own trigger payload in its environment).
    void this.fireTiming(EffectTiming.OnMove, { movedPermanentId })
      .then(() =>
        this.fireTiming(EffectTiming.OnEnterFieldAnyone, {
          subjectPermanentId: movedPermanentId,
          entryCause: "move",
        }),
      )
      .then(() =>
        this.fireSubTrigger("onEnterFieldAnyone", {
          subjectPermanentId: movedPermanentId,
          entryCause: "move",
        }),
      )
      .then(() => this.fireSubTrigger("whenMovedFromBreeding", { subjectPermanentId: movedPermanentId }))
      .then(() => this.fireSubTrigger("whenOpponentMovedFromBreeding", { subjectPermanentId: movedPermanentId }))
      .catch((err) => {
        logError("[engine] moveFromBreeding fire failed:", err);
      });
    return { ok: true };
  }

  /**
   * Handle an endPhase during the Breeding phase: the turn player chooses to do
   * nothing, closing the breeding window (§6-4-1-3). Rejected when it is not this
   * seat's open breeding window.
   */
  private handleBreedingSkip(seat: Seat): IntentResult {
    if (this.state.gameOver) return { ok: false, reason: "illegal-target" };
    if (this.state.pendingDecision !== undefined) return { ok: false, reason: "decision-pending" };
    if (this.state.turnSeat !== seat) return { ok: false, reason: "not-your-turn" };
    return this.breeding.skip(seat) ? { ok: true } : { ok: false, reason: "wrong-phase" };
  }

  /**
   * Handle a seat disconnecting. `handleDisconnect` marks PlayerState.connected =
   * false; on a consented drop (or once the grace period elapses) the caller
   * resolves the match as a surrender. The grace-period clock lives in
   * `AegisRoom.onLeave` via Colyseus's `allowReconnection`.
   */
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

/** Reset one permanent's four projected attack affordances before a fresh sync pass. */
function clearAttackProjection(perm: Permanent): void {
  perm.attackablePermanentIds.splice(0, perm.attackablePermanentIds.length);
  perm.canAttackPlayer = false;
  perm.vortexAttackablePermanentIds.splice(0, perm.vortexAttackablePermanentIds.length);
  perm.canVortexAttackPlayer = false;
}

/**
 * Whether this card can be played through a material declaration (DigiXros §7-2 or
 * Assembly §7-3) that lowers its cost. The reduction depends on materials the player
 * has not chosen yet, so the plain play cost is not the price such a card actually
 * pays — see {@link GameEngine.syncHandAffordances}.
 */
function hasMaterialCostRoute(cardId: string): boolean {
  return (digiXrosRequirementFor(cardId)?.length ?? 0) > 0 || (assemblyRequirementFor(cardId)?.length ?? 0) > 0;
}

/** Map play-card internal rejection reasons to client-surfaceable RejectReason codes. */
function mapPlayCardReason(reason: PlayCardRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "not-playable-kind":
      return "not-playable-kind";
    case "no-empty-slot":
      return "no-empty-slot";
    case "play-prohibited":
      return "play-prohibited";
    case "color-requirement-unmet":
      return "color-requirement-unmet";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map DigiXros internal rejection reasons to client-surfaceable RejectReason codes. */
function mapDigiXrosReason(reason: DigiXrosRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "not-playable-kind":
      return "not-playable-kind";
    case "not-digixros":
      return "not-digixros";
    case "no-materials":
      return "no-materials";
    case "invalid-material":
      return "invalid-material";
    case "invalid-expander":
      return "invalid-expander";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map Assembly internal rejection reasons to client-surfaceable RejectReason codes. */
function mapAssemblyReason(reason: AssemblyRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "not-playable-kind":
      return "not-playable-kind";
    case "not-assembly":
      return "not-assembly";
    case "no-materials":
      return "no-materials";
    case "invalid-material":
      return "invalid-material";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map breeding internal rejection reasons to client-surfaceable RejectReason codes. */
function mapBreedingReason(reason: BreedingRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "breeding-occupied":
      return "breeding-occupied";
    case "egg-deck-empty":
      return "egg-deck-empty";
    case "breeding-empty":
      return "breeding-empty";
    case "not-movable":
      return "not-movable";
    case "move-prohibited":
      return "move-prohibited";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map digivolve internal rejection reasons to client-surfaceable RejectReason codes. */
function mapDigivolveReason(reason: DigivolveRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "invalid-evolution":
      return "invalid-evolution";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "no-such-permanent":
      return "no-such-permanent";
    case "not-controller":
      return "not-controller";
    case "not-a-digimon":
      return "not-a-digimon";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map dnaDigivolve internal rejection reasons to client-surfaceable RejectReason codes. */
function mapDnaDigivolveReason(reason: DnaDigivolveRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "invalid-evolution":
      return "invalid-evolution";
    case "insufficient-memory":
      return "insufficient-memory";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "no-such-permanent":
      return "no-such-permanent";
    case "not-controller":
      return "not-controller";
    case "not-a-digimon":
      return "not-a-digimon";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}

/** Map linkCard internal rejection reasons to client-surfaceable RejectReason codes. */
function mapLinkReason(reason: LinkCardRejection): RejectReason {
  switch (reason) {
    case "not-your-turn":
      return "not-your-turn";
    case "wrong-phase":
      return "wrong-phase";
    case "decision-pending":
      return "decision-pending";
    case "card-not-in-zone":
      return "card-not-in-zone";
    case "not-linkable":
      return "not-linkable";
    case "no-such-permanent":
      return "no-such-permanent";
    case "not-controller":
      return "not-controller";
    case "link-requirement-unmet":
      return "link-requirement-unmet";
    case "insufficient-memory":
      return "insufficient-memory";
    case "no-such-player":
    case "game-over":
      return "illegal-target";
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return "illegal-target";
    }
  }
}
