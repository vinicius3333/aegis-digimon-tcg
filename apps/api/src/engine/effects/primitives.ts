import { ArraySchema } from "@colyseus/schema";
import {
  CardKind,
  Permanent,
  Zone,
  EffectTiming,
  EffectDuration,
  requireCardDefinition,
  CardInstance,
  dnaDigivolutionRequirementsFor,
  digiXrosRequirementFor,
  resolveTokenCardId,
  appFusionCostFor,
  type AttackTarget,
  type CardColor,
  type CardDefinition,
  type GameState,
  type PlayerState,
  type Seat,
  type ServerEvent,
  type ZoneRef,
} from "@aegis/shared";
import {
  GameStateAccess,
  applyOverflow,
  extractCardAt,
  extractPermanentAt,
  insertCard,
  placePermanent as appendPermanent,
  takeBottom,
  takeTop,
} from "../state/access.js";
import {
  matchingEvoCost,
  canDigivolveOntoWithAlternates,
  cardHasTrait,
  matchingAlternateDigivolutionRequirement,
  isOption,
} from "../cards/cardData.js";
import {
  decoyMatches,
  decoySpecFromText,
  decoySpecMatches,
  digiXrosMatches,
  fragmentCountOf,
  materialSaveCountOf,
  partitionClauseMatches,
  partitionSpecOf,
} from "../combat/keywords.js";
import { ModifierLedger, type EvoCostMatch } from "./modifiers.js";
import { ContinuousEffectLedger } from "./continuous.js";
import { SubTriggerRegistry } from "./subtriggers.js";
import type { EffectContext, Primitives, Restriction } from "./EffectContext.js";
import { resolvePermanentBattle } from "../combat/resolve.js";
import { canAttackerDeclare, canAttackTarget } from "../combat/legality.js";
import { createBreedingVerbs } from "./breeding.js";
import { getEffectModule } from "./registry.js";

export type { Primitives };
export { ModifierLedger } from "./modifiers.js";

/**
 * Effect primitives (subsystem: effect-primitives; sources: documented behavior,
 * documented behavior, documented behavior).
 *
 * `createPrimitives(engine)` is the concrete, server-authoritative implementation of
 * the `Primitives` interface (EffectContext.ts) that card modules are written
 * against (card-module contract). Each verb is the direct analogue of an
 * source the effect runtime / the effect factory operation: it mutates the
 * authoritative GameState and emits the matching ServerEvent. This replaces the
 * `unimplementedPrimitives()` placeholder in context.ts (which threw for every verb).
 *
 * Design (consistent with the sibling action modules digivolve.ts / playCard.ts):
 *   - It depends on a narrow `PrimitivesEngine` PORT, not on the concrete GameEngine,
 *     so there is no import cycle and the primitives are unit-testable with a tiny
 *     fake engine. The real GameEngine builds one from its MemoryGauge, emitter,
 *     decision API, and permanent-id allocator.
 *   - Memory verbs delegate to the MemoryGauge (the single owner of memory math; it
 *     documents these exact entry points). Deletion / suspend / security movement
 *     reuse GameStateAccess (the established state-mutation helper) rather than
 *     re-deriving the same mutations. Duration-scoped verbs (modifyDP / grantPierce /
 *     changeEvoCost) use the ModifierLedger.
 *   - Verbs that require a player choice (which cards to take from a revealed/searched
 *     set, which hand cards to play) call the injected DecisionApi via the engine
 *     port; verbs with a fixed count (draw N, reveal top N) need no round trip
 *     (ARCHITECTURE.md section 5).
 *
 * platform-independent: no presentation component / coroutine / UI / animation / network transport. The source
 * `...AndProcessAccordingToResult` shape — perform the movement, then let the caller
 * branch on what was actually affected — is preserved by returning the affected
 * CardInstance[] / Permanent[] from each targeting verb.
 */

/**
 * What an effect-primitives instance needs from the engine. Each member is owned by
 * a sibling subsystem and injected here, keeping this module decoupled from the
 * GameEngine concrete (ARCHITECTURE.md section 3; the same seam digivolve/playCard
 * use). A `defaultMemoryPort`-style fallback is intentionally NOT provided: memory is
 * a single authoritative gauge and primitives must use the real one.
 */
export interface PrimitivesEngine {
  /** The authoritative match state (the only state these verbs read/mutate). */
  readonly state: GameState;
  /** Emit a server event (narration/log). */
  emit(event: ServerEvent): void;
  /** Allocate a permanentId unique within the match (play-from-hand/security). */
  nextPermanentId(): string;
  /** Allocate an instanceId for token spawn / synthetic instances. */
  nextInstanceId?(): string;
  /** Transient security-DP modifiers for the active security check. */
  securityDp?: import("../security/securityDp.js").SecurityDpLedger;
  /** Continuous DP-based-deletion maximum bonuses (static-continuous-effects). */
  deletionMaxDp?: import("../deletionMaxDp.js").DeletionMaxDpLedger;
  /** Continuous DP-based-deletion BUDGET bonuses (BT19-011's inherited `AddToDPDeleteBudget`). */
  dpDeleteBudget?: import("../dpDeleteBudget.js").DpDeleteBudgetLedger;
  /** Match win declaration (security-and-win-check subsystem). */
  win?: import("../security/winCheck.js").WinCheck;
  /** Fire a timing window (optional; used before deletion / draw hooks). */
  fireTiming?: (
    timing: import("@aegis/shared").EffectTiming,
    trigger?: import("./EffectContext.js").TriggerInfo,
  ) => Promise<void>;
  /**
   * Fire the SubTrigger bus (System B) for an event, running armed watchers whose captured
   * sourceFilter matches the payload (delayed-and-rule-effects). Optional on the port so the
   * existing fake engines in tests need no change; absent => no watcher runs (no-op). Used at
   * the deletion / placeUnder seams that have no co-located EffectTiming analogue exposed here.
   */
  fireSubTrigger?: (
    event: import("./EffectContext.js").SubTriggerEventName,
    payload?: import("./EffectContext.js").TriggerInfo,
  ) => Promise<void>;
  /** Reinstall continuous effects after a permanent enters play, before its entry timing. */
  recomputeContinuousEffects?: () => Promise<void>;
  /** Resolve the trashed card's own deck-trash trigger without requiring a field watcher. */
  resolveSelfWhenTrashedFromDeck?: (instanceId: string) => Promise<void>;
  /** Memory rewards printed on materials that successfully participate in a DNA digivolution. */
  dnaDigivolveMemoryGain?: (materialPermanentIds: readonly string[], into: CardDefinition) => number;
  /**
   * Fire EffectTiming.OnDiscardSecurity for each given instance — cards an EFFECT just moved from a
   * security stack to trash (the `trash` / `trashFromSecurity` verbs). The card now sits in trash (a
   * candidate zone), so its own module's OnDiscardSecurity clause runs (ST22-10). A normal security
   * CHECK trashes via a different path (securityCheck.trashIfStillLoose) and never reaches here, so
   */
  fireDiscardedFromSecurity?: (instanceIds: string[]) => Promise<void>;
  /** Re-activate one (or all) of a target permanent's own effects at the given timing(s)
   * (EX3-065 and its generalization — see `Primitives.reactivateOnPlay`). Engine-backed;
   * re-exposed as Primitives.reactivateOnPlay. Returns whether an effect actually activated. */
  reactivateOnPlay?: (
    permanentId: string,
    opts?: {
      timings?: import("@aegis/shared").EffectTiming[];
      chooseOne?: boolean;
      outsideTriggerWindow?: boolean;
    },
  ) => Promise<boolean>;
  /**
   * Fire the entering card's OWN OnPlay / WhenDigivolving window when an EFFECT played or
   * digivolved it (the producer for the `triggerEnteredByEffect` gate, BT25-084). The trigger's
   * `enteredByEffect` is set to the entering card's controller seat. This is also what makes an
   * effect-played Digimon's [On Play] fire at all — the effect-driven play/digivolve verbs
   * previously placed the permanent without firing its entry window. Optional => no-op in fakes.
   */
  fireEnteredByEffect?: (
    timing: import("@aegis/shared").EffectTiming,
    instanceId: string,
    ownerSeat: Seat,
    opts?: {
      isDnaDigivolve?: boolean;
      digivolvedFromZone?: import("@aegis/shared").ZoneRef;
      playedFromZone?: import("@aegis/shared").ZoneRef;
      digiXrosMaterialCount?: number;
      playedByEffectSourceCardId?: string;
    },
  ) => Promise<void>;
  /**
   * Consult active digivolution-card-trash "redirect" replacements (BT10-084 Tactimon; KB
   * Q2002-Q2008) BEFORE a trash operation selects which cards to take. Returns the redirected
   * single-host id when a reaction fired, or undefined when nothing changed (no reaction
   * installed / not every host eligible / declined). Optional on the port so existing fake
   * engines in tests need no change.
   */
  consultDigivolutionTrashRedirect?: (hostPermanentIds: string[]) => Promise<string | undefined>;
  /**
   * Consult active "prevent" leave/delete replacements for the permanents about to be removed
   * by an effect. Returns the subset whose removal the controller chose to PREVENT (by paying
   * the reaction's cost). Default-safe: empty when no prevent-replacement matches.
   */
  consultLeavePrevention?: (
    permanentIds: string[],
    cause: import("./EffectContext.js").RemovalCause,
    resolvingSeat?: Seat,
    opts?: { isBounce?: boolean },
  ) => Promise<Set<string>>;
  /** The shared memory gauge (memory-gauge subsystem); single owner of memory math. */
  readonly memory: MemoryPort;
  /** Duration-scoped modifier store (DP buffs, pierce, evo-cost). */
  readonly modifiers: ModifierLedger;
  /**
   * Continuous-rule store (restrictions, name/trait aliases, color waivers). Optional
   * on the port so the existing fake engines in tests need no change; when absent a
   * private ledger is used (the verbs still mutate real server state, just not the
   * engine's shared one — production supplies the shared instance).
   */
  readonly continuous?: ContinuousEffectLedger;
  /** Delayed / triggered sub-effect + replacement registry (optional; see `continuous`). */
  readonly subTriggers?: SubTriggerRegistry;
  /**
   * Combat lifecycle driver (attack-and-block subsystem), used by the effect-driven
   * attack / redirect verbs. Optional on the port so the existing fake engines in
   * tests need no change; when absent those verbs narrate the gap instead of running.
   */
  readonly combat?: CombatPort;
  /** Player-decision API (effect-stack-resolution); used by selection verbs. */
  readonly ask: SelectionPort;
  /**
   * The seat currently driving resolution (the turn player / effect controller). Some
   * verbs default a target seat or a "you" reference to the controller; the engine
   * supplies it from `state.turnSeat`. Kept on the port (rather than re-deriving from
   * state inside each verb) so the controller is unambiguous when a future verb needs
   * it during nested resolution.
   */
  controllerSeat(): Seat;
  /**
   * True while the engine is RE-FIRING persistent (static / `EffectTiming.None`)
   * effects in its continuous-recompute pass. When true, the continuous-capable verbs
   * (modifyDP / restrict / grantKeyword / grantNameTrait / grantPierce / waiveColor /
   * the cost modifiers) tag what they record as `continuous`, so the next recompute can
   * clear and re-derive it without double-applying. Absent (or false) for ordinary
   * one-shot effect resolution. Optional on the port so the test fakes need no change.
   */
  inContinuousPass?(): boolean;
  /**
   * Once-per-turn prevention ledger (＜Barrier＞). `barrierFired` returns true
   * when the given per-permanent key has already prevented a removal this turn;
   * `markBarrierFired` records it after a successful prevent.
   */
  barrierFired?: (key: string) => boolean;
  markBarrierFired?: (key: string) => void;
}

/** The slice of MemoryGauge the primitives use (memory-gauge subsystem owns the impl). */
export interface MemoryPort {
  gainMemory(amount: number, reason?: string): void;
  addMemoryForSeat(seat: Seat, amount: number, reason?: string, opts?: { isTamerEffect?: boolean }): void;
  setMemory(value: number, reason?: string): void;
  setTurnEndMinMemory?(seat: Seat, minimum: number): void;
  pay(seat: Seat, cost: number, reason?: string): number;
  maxCostFor(seat: Seat): number;
}

/**
 * The slice of the CombatController the effect-driven attack verbs use
 * (attack-and-block subsystem owns the impl). `resolveAttack` runs a full attack;
 * `isAttacking` guards against unsafe nesting; `redirectTarget` switches the
 * in-flight attack's target.
 */
export interface CombatPort {
  readonly isAttacking: boolean;
  readonly currentAttackerId: string | undefined;
  resolveAttack(
    attackerSeat: Seat,
    attacker: Permanent,
    target: AttackTarget,
    opts?: {
      withoutTap?: boolean;
      afterAttackTriggers?: () => Promise<void>;
      drainTimingWindow?: () => Promise<void>;
    },
  ): Promise<void>;
  redirectTarget(target: AttackTarget): boolean;
  /** An actual suspend -> unsuspend transition lets that permanent declare another attack. */
  resetAttackEligibility?(permanentId: string): void;
  /** End the in-flight attack (BT23-069) — transition to end-of-attack, skipping block/battle. */
  endAttack(): boolean;
  /**
   * Open an ＜Evade＞ decision window for a single permanent and await the
   * controller's accept/decline (Comprehensive Rules §16-22-3: activation is an
   * optional processing condition). Shared with the combat (battle-loss) path so
   * both routes use the same evadePrompt/respondEvade plumbing.
   */
  runEvadeDecision(seat: Seat, permanentId: string): Promise<boolean>;
  /**
   * Open a ＜Barrier＞ decision window for a single permanent and await the
   * controller's accept/decline (Comprehensive Rules §16-25-3: activation is an
   * optional processing condition). Shared with the combat (battle-loss) path so
   * both routes use the same barrierPrompt/respondBarrier plumbing.
   */
  runBarrierDecision(seat: Seat, permanentId: string): Promise<boolean>;
}

/**
 * The slice of the decision API the selection verbs use. The full DecisionApi
 * (EffectContext.ts) is keyed by an EffectContext; primitives that need a choice are
 * invoked from inside a card's resolve where the seat is known, so this narrower
 * seat-keyed form is what the engine adapts to. effect-stack-resolution owns the impl.
 */
export interface SelectionPort {
  /**
   * Ask `seat` to pick between `min` and `max` of `candidateInstanceIds`; returns the
   * chosen instance ids (the engine enforces the count and that they are candidates).
   */
  selectInstances(
    seat: Seat,
    candidateInstanceIds: string[],
    min: number,
    max: number,
    promptText: string,
    provenance?: { sourceCardId?: string; timing?: string; effectText?: string },
  ): Promise<string[]>;
}

/**
 * Build the concrete Primitives bound to `engine`. The returned object is what the
 * effect context's `fx` is set to (replacing `unimplementedPrimitives()`).
 */
export function createPrimitives(engine: PrimitivesEngine): Primitives {
  const state = engine.state;
  const access = new GameStateAccess(state, engine.memory);
  const ledger = engine.modifiers;
  const continuous = engine.continuous ?? new ContinuousEffectLedger();
  const decoyCostPermanentIds = new Set<string>();
  const subTriggers = engine.subTriggers ?? new SubTriggerRegistry();
  const effectSeatStack: Seat[] = [];
  const enterEffectResolution: Primitives["enterEffectResolution"] = (seat) => effectSeatStack.push(seat);
  const leaveEffectResolution: Primitives["leaveEffectResolution"] = () => {
    effectSeatStack.pop();
  };
  const restrictSecurityAddsFromEffect: Primitives["restrictSecurityAddsFromEffect"] = (
    blockedEffectSeat,
    granterSeat,
    duration,
  ) => continuous.restrictSecurityAddsFromEffect(blockedEffectSeat, granterSeat, duration);

  // DigiXros material zone expansion ledger (BT19-079/BT19-087).
  // The play-card / DigiXros material-picking path reads expanded zones here.
  const digiXrosZoneExpansions = new Map<Seat, { zones: ZoneRef[]; expiresAtTurnEndOf?: Seat }>();
  const digiXrosExpandedZones: Primitives["digiXrosExpandedZones"] = (seat) => {
    const entry = digiXrosZoneExpansions.get(seat);
    return entry?.zones ?? [];
  };
  const expandDigiXrosZones: Primitives["expandDigiXrosZones"] = (seat, zones, _duration) => {
    // Record the zone expansion. Duration-based expiry is a future concern
    // (the DigiXros material-picking path in the play-card subsystem will
    // consult this ledger and handle the time-boundary cleanup).
    digiXrosZoneExpansions.set(seat, { zones });
  };

  // Engine-backed: re-activate one of a permanent's own [On Play] effects (EX3-065). Needs the
  // effect-collection + stack the engine owns, so it delegates to the engine hook.
  const reactivateOnPlay: Primitives["reactivateOnPlay"] = engine.reactivateOnPlay
    ? (permanentId, opts) => engine.reactivateOnPlay!(permanentId, opts)
    : undefined;

  const player = (seat: Seat): PlayerState => access.player(seat);

  // Breeding/hatch effect verbs (the Digi-Egg-deck seam): hatch a Digi-Egg into the empty
  // breeding slot, or place the top of the Digi-Egg deck under a permanent as a digivolution
  // card. Kept in breeding.ts so the Digi-Egg-deck zone logic stays co-located.
  const { hatch, placeUnderFromEggDeck, placeAsTopFromEggDeck } = createBreedingVerbs(engine);

  /**
   * Single-sourced three-ledger teardown for every seam where a permanent leaves the
   * battle area (delete, DNA-material consumption, relocate-under, battle->breeding,
   * and bounce-to-hand/deck/security via collectForReturn).
   * Drops the modifier, continuous, and subTrigger entries anchored to `permanentId`
   * together so a dead/relocated/inert source's duration modifiers, continuous statics,
   * and replacement/watcher subscriptions cannot survive to apply, recompute, or fire.
   * Mirrors GameEngine.dropPermanentSubscriptions (the combat/security seam) — hand-
   * rolling the drop list per site is exactly how the subTrigger drop drifted out of the
   * relocate/toBreeding seams.
   */
  const dropPermanentLedgers = (permanentId: string): void => {
    ledger.dropPermanent(permanentId);
    continuous.dropPermanent(permanentId);
    subTriggers.dropPermanent(permanentId);
  };

  /** Whether the engine is currently re-firing persistent effects (see PrimitivesEngine). */
  const continuousPass = (): boolean => engine.inContinuousPass?.() ?? false;
  /** `{ continuous: true }` while re-firing persistent effects, else undefined. */
  const continuousOpt = (): { continuous: boolean } | undefined =>
    continuousPass() ? { continuous: true } : undefined;

  /**
   * Modifier ledgers frame owner/opponent durations from the affected permanent's seat.
   * Printed durations are framed from the resolving effect's controller, so swap the two
   * relative boundaries when an effect grants a modifier to an opponent's permanent.
   */
  const durationForTarget = (permanentId: string, duration: EffectDuration): EffectDuration => {
    if (duration !== EffectDuration.UntilOwnerTurnEnd && duration !== EffectDuration.UntilOpponentTurnEnd) {
      return duration;
    }
    const targetSeat = access.permanentById(permanentId)?.controllerSeat;
    const resolvingSeat = effectSeatStack.at(-1) ?? engine.controllerSeat();
    if (targetSeat === undefined || targetSeat === resolvingSeat) return duration;
    return duration === EffectDuration.UntilOwnerTurnEnd
      ? EffectDuration.UntilOpponentTurnEnd
      : EffectDuration.UntilOwnerTurnEnd;
  };

  // --- draw / memory ---------------------------------------------------------

  /**
   * Draw `n` from `seat`'s deck to its hand (source rule implementation(owner, n).Draw():
   * deck top -> hand). Stops at an empty deck and returns fewer cards; the deck-out
   * LOSS is the security-and-win-check subsystem's call (a 0-card draw request that
   * could not be met is its signal). Emits cardsMoved for the log. Async to match the
   * interface (the source draw is a coroutine and OnDraw triggers fire through the
   * stack), even though the movement itself is synchronous.
   */
  const draw = async (seat: Seat, n: number): Promise<CardInstance[]> => {
    const p = player(seat);
    const drawn: CardInstance[] = [];
    for (let i = 0; i < n; i++) {
      const top = takeTop(p, Zone.Deck);
      if (top === undefined) break; // deck-out; loss handled by security-and-win-check
      top.faceUp = true; // now in hand, visible to its owner
      insertCard(p, Zone.Hand, top);
      drawn.push(top);
    }
    if (drawn.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: drawn.map((c) => c.instanceId),
        from: Zone.Deck,
        to: Zone.Hand,
      });
      // An effect Draw is an effect-driven hand addition ("when an effect adds cards to
      // your opponent's hand"/"...your hand"). The normal draw-phase draw routes through
      // GameEngine.drawCards, not this fx.draw, so it does not fire here.
      await engine.fireSubTrigger?.("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: seat });
      await engine.fireSubTrigger?.("whenEffectAddsToHand", { effectAddedToHandSeat: seat });
    }
    return drawn;
  };

  const gainMemory = (amount: number): void => {
    engine.memory.gainMemory(amount, "gainMemory");
  };

  const gainMemoryForSeat = (seat: Seat, amount: number, opts?: { isTamerEffect?: boolean }): void => {
    engine.memory.addMemoryForSeat(seat, amount, "gainMemory", {
      isTamerEffect: opts?.isTamerEffect ?? false,
    });
  };

  const restrictMemoryGain = (seat: Seat, duration: EffectDuration): void => {
    continuous.addMemoryGainPolicy(seat, duration, continuousOpt());
  };

  const restrictCostReduction = (
    seat: Seat,
    costType: "play" | "digivolve" | "all",
    duration: EffectDuration,
  ): void => {
    continuous.addCostReductionBlock(seat, costType, duration, continuousOpt());
  };

  const restrictUnsuspendedDigivolve: Primitives["restrictUnsuspendedDigivolve"] = (seat, sourceSeat, duration) => {
    continuous.addUnsuspendedDigivolveProhibition(seat, sourceSeat, duration);
  };

  const restrictPlay: Primitives["restrictPlay"] = (seat, sourceSeat, match, mode, duration, byEffectOnly) => {
    continuous.addPlayProhibition(seat, sourceSeat, match, mode, duration, {
      ...continuousOpt(),
      byEffectOnly,
    });
  };

  const isPlayProhibited: Primitives["isPlayProhibited"] = (seat, cardId, mode) => {
    const def = requireCardDefinition(cardId);
    // Pass effectPlay=true so byEffectOnly prohibitions are honored on the effect-play path.
    return continuous.isPlayBlocked(seat, def, mode, true);
  };

  const disableSecurityEffect: Primitives["disableSecurityEffect"] = (attackerPermanentId, sourceKind, duration) => {
    continuous.addSecurityEffectDisable(attackerPermanentId, sourceKind, duration, continuousOpt());
  };

  const disableSecurityEffectsForSeat: Primitives["disableSecurityEffectsForSeat"] = (
    attackerSeat,
    sourceKind,
    duration,
  ) => {
    continuous.addSecurityEffectDisableForSeat(attackerSeat, sourceKind, duration, continuousOpt());
  };

  const disableTimingEffect: Primitives["disableTimingEffect"] = (permanentId, timings, duration) => {
    continuous.addEffectTimingDisable(permanentId, timings, durationForTarget(permanentId, duration), continuousOpt());
  };
  const isTimingEffectDisabled: NonNullable<Primitives["isTimingEffectDisabled"]> = (permanentId, timing) =>
    continuous.isTimingEffectDisabled(permanentId, timing) && !continuous.hasRestriction(permanentId, "beAffected");

  const declareWinner = (seat: Seat): void => {
    if (engine.win) engine.win.declareWinner(seat, "effect");
  };

  const setMemory = (value: number): void => {
    engine.memory.setMemory(value, "setMemory");
  };

  // --- DP / keywords / cost (duration-scoped) --------------------------------

  const modifyDP: Primitives["modifyDP"] = (permanentId, delta, duration, opts): void => {
    const before = access.permanentById(permanentId);
    if (before === undefined) return; // no such battle-area permanent; nothing to buff
    // "DP can't be reduced" (§15-1-3). Every printed instance of this protection says REDUCED
    // (BT3-105, EX1-073, BT23-085, BT7-064, BT9-098, BT19-089), so it gates negative deltas
    // only — a buff still lands on a DP-immune Digimon.
    if (delta < 0 && isRestricted(permanentId, "dpImmune")) return;
    ledger.addDpModifier(state, permanentId, delta, durationForTarget(permanentId, duration), {
      ...(opts?.continuous === undefined ? continuousOpt() : { continuous: opts.continuous }),
      ...(opts?.sourceInstanceId !== undefined ? { sourceInstanceId: opts.sourceInstanceId } : {}),
    });
    // currentDP was recomputed by the ledger; no dedicated ServerEvent in the
    // protocol for a DP change — the schema delta (currentDP) is the source of truth.
  };

  const setBaseDP = (permanentId: string, value: number, duration: EffectDuration): void => {
    const before = access.permanentById(permanentId);
    if (before === undefined) return; // no such battle-area permanent; nothing to override
    // A "this Digimon's DP becomes N" override that LOWERS the DP is a DP reduction, so the same
    // `dpImmune` protection applies. An override that raises it is not, and lands normally.
    if (value < before.currentDP && isRestricted(permanentId, "dpImmune")) return;
    ledger.addBaseDpOverride(state, permanentId, value, durationForTarget(permanentId, duration), continuousOpt());
    // currentDP was recomputed by the ledger (override replaces base, deltas sum on top).
  };

  const grantPierce: Primitives["grantPierce"] = (permanentId, duration, opts): void => {
    ledger.addPierceGrant(
      permanentId,
      durationForTarget(permanentId, duration),
      opts?.continuous === true ? { continuous: true } : continuousOpt(),
    );
  };

  const changeEvoCost = (
    filter: (m: EvoCostMatch) => boolean,
    delta: number,
    opts?: { setFixed?: boolean; once?: boolean; onConsume?: (match: EvoCostMatch) => void },
  ): void => {
    ledger.addEvoCostAdjustment(filter, delta, opts?.setFixed ?? false, {
      ...(continuousOpt() ?? {}),
      once: opts?.once,
      onConsume: opts?.onConsume,
    });
  };

  const changePlayCost: Primitives["changePlayCost"] = (filter, delta, opts) => {
    ledger.addPlayCostAdjustment(filter, delta, opts?.setFixed ?? false, continuousOpt());
  };

  // --- play from hand / security --------------------------------------------

  const playFromHand = async (
    instanceIds: string[],
    opts?: { payCost?: boolean; suspended?: boolean; costDelta?: number },
  ): Promise<Permanent[]> => {
    const created: Permanent[] = [];
    for (const instanceId of instanceIds) {
      const located = locateInHand(state, instanceId);
      if (located === undefined) continue;
      const { owner, index } = located;
      const definition = requireCardDefinition(owner.hand[index]!.cardId);
      if (!isPermanentKind(definition)) continue; // only permanents are "played" onto the field
      if (opts?.payCost) {
        // The reduced-cost play (EX10-035 "with the play cost reduced by 5"): subtract the
        // costDelta from the printed cost, floored at 0, then pay that. costDelta is a reduction
        // amount (>=0); a free play (payCost false) never reaches here.
        const cost = Math.max(0, normalizeCost(definition.playCost) - (opts.costDelta ?? 0));
        if (engine.memory.maxCostFor(owner.seat) < cost) continue; // unaffordable: skip (no partial pay)
        if (cost > 0) engine.memory.pay(owner.seat, cost, "playCard");
      }
      const instance = extractCardAt(owner, Zone.Hand, index)!;
      instance.faceUp = true;
      const permanent = placePermanent(engine, owner, instance, definition, opts?.suspended ?? false);
      created.push(permanent);
      engine.emit({
        kind: "cardPlayed",
        seat: owner.seat,
        cardId: instance.cardId,
        permanentId: permanent.permanentId,
      });
      engine.emit({
        kind: "cardsMoved",
        instanceIds: [instance.instanceId],
        from: Zone.Hand,
        to: Zone.BattleArea,
      });
    }
    return created;
  };

  const playFromSecurity = async (instanceId: string, opts?: { payCost?: boolean }): Promise<Permanent | undefined> => {
    const located = locateInSecurity(state, instanceId);
    if (located === undefined) return undefined;
    const { owner, index } = located;
    const definition = requireCardDefinition(owner.security[index]!.cardId);
    if (!isPermanentKind(definition)) return undefined;
    if (opts?.payCost) {
      const cost = normalizeCost(definition.playCost);
      if (engine.memory.maxCostFor(owner.seat) < cost) return undefined;
      if (cost > 0) engine.memory.pay(owner.seat, cost, "playCard");
    }
    const instance = extractCardAt(owner, Zone.Security, index)!;
    instance.faceUp = true;
    const permanent = placePermanent(engine, owner, instance, definition, false);
    engine.emit({
      kind: "cardPlayed",
      seat: owner.seat,
      cardId: instance.cardId,
      permanentId: permanent.permanentId,
    });
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [instance.instanceId],
      from: Zone.Security,
      to: Zone.BattleArea,
    });
    // A [Security] effect that says "play this card" is still an effect-driven play: its own
    // [On Play] window resolves, then watchers such as ST10-06 see a `whenPlayed` event with the
    // trigger-time level snapshot. The snapshot is captured from `definition` before either
    // window can change or remove the permanent (KB Q737/Q738).
    await engine.fireEnteredByEffect?.(EffectTiming.OnPlay, instance.instanceId, owner.seat, {
      playedFromZone: "security",
    });
    await engine.fireSubTrigger?.("whenPlayed", {
      subjectPermanentId: permanent.permanentId,
      playedByEffect: true,
      playedFromZone: "security",
      ...(definition.level !== undefined ? { playedLevel: definition.level } : {}),
      ...(definition.playCost !== undefined ? { playedPlayCost: definition.playCost } : {}),
    });
    return permanent;
  };

  /**
   * Play specific loose card instances as new battle-area permanents (the generalized
   * PlayWithoutCost: "play 1 [X] from your hand/trash/security/deck/under your Tamers
   * without paying the cost"). Each instance is located wherever it currently sits
   * (hand, security, deck, trash, breeding, or as a digivolution/linked card under
   * another permanent — NOT a permanent's top card) and removed from there; only a
   * permanent kind is placed. `payCost` pays the printed play cost if affordable;
   * the default is free. Returns the created permanents.
   */
  const playInstances = async (
    instanceIds: string[],
    opts?: {
      payCost?: boolean;
      suspended?: boolean;
      breeding?: boolean;
      costDelta?: number;
      suppressOnPlayEffects?: boolean;
      effectSourceCardId?: string;
      digiXrosMaterialInstanceIds?: string[];
    },
  ): Promise<Permanent[]> => {
    const created: Permanent[] = [];
    // Snapshot which (if any) of the played instances originate from a digivolution stack
    // BEFORE removal, so the whenPlayed fire can set playedFromZone for the
    // `fromDigivolution` sourceFilter gate (BT20-028 KB Q4321).
    const originByInstance = new Map(instanceIds.map((id) => [id, looseZoneOfInstance(state, id)]));
    for (const instanceId of instanceIds) {
      const owner = ownerSeatOfLoose(state, instanceId);
      if (owner === undefined) continue;
      const ownerPlayer = player(owner);
      const peek = peekLooseInstance(state, instanceId);
      if (peek === undefined) continue;
      const definition = requireCardDefinition(peek.cardId);

      // Breeding play: gate to Digimon/DigiEgg only (§6-4), require empty breeding slot
      if (opts?.breeding) {
        if (!(definition.kinds.includes(CardKind.Digimon) || definition.kinds.includes(CardKind.DigiEgg))) continue;
        if (ownerPlayer.breeding !== undefined) continue; // single-occupancy — no-op
      }

      if (!isPermanentKind(definition)) continue;
      if (opts?.payCost) {
        const printed = normalizeCost(definition.playCost);
        const requirement = digiXrosRequirementFor(definition.cardId)?.[0];
        const materialCount = opts.digiXrosMaterialInstanceIds?.length ?? 0;
        const perMaterialReduction =
          requirement?.count === "∞" ? (requirement.costReduction ?? 1) : (requirement?.count ?? 0);
        const digiXrosReduction = materialCount * perMaterialReduction;
        const cost = Math.max(0, printed - (opts.costDelta ?? 0) - digiXrosReduction);
        if (engine.memory.maxCostFor(ownerPlayer.seat) < cost) continue;
        if (cost > 0) engine.memory.pay(ownerPlayer.seat, cost, "playCard");
      }
      const instance = removeLooseInstance(state, instanceId);
      if (instance === undefined) continue;
      instance.faceUp = true;
      const permanent = placePermanent(engine, ownerPlayer, instance, definition, opts?.suspended ?? false);
      // Breeding: relocate permanent from battle area to breeding slot
      if (opts?.breeding) {
        const idx = ownerPlayer.battleArea.findIndex((p) => p.permanentId === permanent.permanentId);
        if (idx >= 0) extractPermanentAt(ownerPlayer, idx);
        permanent.inBreeding = true;
        ownerPlayer.breeding = permanent;
      }
      created.push(permanent);
      if ((opts?.digiXrosMaterialInstanceIds?.length ?? 0) > 0) {
        await placeUnder(permanent.permanentId, opts!.digiXrosMaterialInstanceIds!);
      }
      engine.emit({
        kind: "cardPlayed",
        seat: ownerPlayer.seat,
        cardId: instance.cardId,
        permanentId: permanent.permanentId,
      });
      engine.emit({
        kind: "cardsMoved",
        instanceIds: [instance.instanceId],
        from: "various",
        to: opts?.breeding ? Zone.Breeding : Zone.BattleArea,
      });
    }
    if (created.length > 0 && !opts?.breeding) {
      // A played permanent is already in the battle area before its [On Play] resolves.
      // Install its continuous effects and reactive subscriptions now so they can observe
      // nested events caused by that [On Play] (BT10-085: Sistermon Ciel must see the
      // Royal Knight digivolution performed by her own effect).
      await engine.recomputeContinuousEffects?.();
      const triggerSubject = created[0]!;
      const triggerSubjectTop = triggerSubject.topCard;
      const playedLevel =
        triggerSubjectTop === undefined ? undefined : requireCardDefinition(triggerSubjectTop.cardId).level;
      const playedPlayCost =
        triggerSubjectTop === undefined ? undefined : requireCardDefinition(triggerSubjectTop.cardId).playCost;
      // Each effect-played Digimon's OWN [On Play] fires (it was PLAYED, not merely placed), with
      // `enteredByEffect` set to its controller (the producer for the BT25-084 by-effect gate). A
      // manual hand play takes the play action's own seam, which leaves the marker unset.
      if (opts?.suppressOnPlayEffects !== true) {
        for (const permanent of created) {
          if (permanent.topCard === undefined) continue;
          await engine.fireEnteredByEffect?.(
            EffectTiming.OnPlay,
            permanent.topCard.instanceId,
            permanent.controllerSeat,
            {
              ...(originByInstance.get(permanent.topCard.instanceId) !== undefined
                ? { playedFromZone: originByInstance.get(permanent.topCard.instanceId)! }
                : {}),
              ...(opts?.digiXrosMaterialInstanceIds !== undefined
                ? { digiXrosMaterialCount: opts.digiXrosMaterialInstanceIds.length }
                : {}),
              ...(opts?.effectSourceCardId !== undefined
                ? { playedByEffectSourceCardId: opts.effectSourceCardId }
                : {}),
            },
          );
        }
      }
      // An EFFECT just played one or more Digimon (Q3665: "when an effect plays one of your Digimon").
      // Fire the whenPlayed bus ONCE for the play event (KB Q3664: a single effect that plays 2+ at
      // once triggers the watcher only once), marked effect-driven so a "when an effect plays" watcher
      // (EX5-062) fires while manual hand plays (which leave `playedByEffect` unset) do not. Breeding
      // placements are not "plays" in this sense and are excluded.
      // `playedFromZone` is set when ANY played instance originated from a digivolution stack so a
      // `fromDigivolution: true` sourceFilter (BT20-028 KB Q4321) can gate on the source zone.
      // The snapshot `fromDigivolutionIds` was captured before removal to survive the splicing.
      const playedFromZone =
        triggerSubjectTop === undefined ? undefined : originByInstance.get(triggerSubjectTop.instanceId);
      await engine.fireSubTrigger?.("whenPlayed", {
        subjectPermanentId: triggerSubject.permanentId,
        subjectPermanentIds: created.map((permanent) => permanent.permanentId),
        playedByEffect: true,
        ...(opts?.effectSourceCardId !== undefined ? { playedByEffectSourceCardId: opts.effectSourceCardId } : {}),
        ...(playedLevel !== undefined ? { playedLevel } : {}),
        ...(playedPlayCost !== undefined ? { playedPlayCost } : {}),
        ...(playedFromZone !== undefined ? { playedFromZone } : {}),
      });
    }
    return created;
  };

  /**
   * Place a loose Option card into its owner's battle area as a battle-area PERMANENT
   * (source CanPlayAsNewPermanent isPlayOption:true / PlaceDelayOptionCards). `playInstances`
   * skips Options (isPermanentKind excludes Option); this is the dedicated option-permanent
   * placement path. Gated to Option kind so it cannot place a non-Option card; a missing or
   * non-Option instance is a no-op. The Option enters as a 0-DP permanent (placePermanent), is
   * face up, and emits cardPlayed + cardsMoved. Does NOT pay a cost (the placement is a free
   * "place ... in your battle area", not a use). Returns the created Permanent or undefined.
   */
  const placeOptionAsPermanent = async (instanceId: string): Promise<Permanent | undefined> => {
    const owner = ownerSeatOfLoose(state, instanceId);
    if (owner === undefined) return undefined;
    const ownerPlayer = player(owner);
    const peek = peekLooseInstance(state, instanceId);
    if (peek === undefined) return undefined;
    const definition = requireCardDefinition(peek.cardId);
    // Strictly an Option-permanent path: do NOT broaden the normal permanent kinds.
    if (!isOption(definition)) return undefined;
    const instance = removeLooseInstance(state, instanceId);
    if (instance === undefined) return undefined;
    instance.faceUp = true;
    const permanent = placePermanent(engine, ownerPlayer, instance, definition, false);
    // CR 17-1-3-2-2 exempts Options placed in the battle area BY AN EFFECT from the
    // rule-check trash sweep; mark the origin so the sweep can tell them apart.
    permanent.placedByEffect = true;
    engine.emit({
      kind: "cardPlayed",
      seat: ownerPlayer.seat,
      cardId: instance.cardId,
      permanentId: permanent.permanentId,
    });
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [instance.instanceId],
      from: "various",
      to: Zone.BattleArea,
    });
    // Option cards placed as permanents are a distinct event from using an Option effect:
    // inherited watchers such as BT13-007's Royal Knight clause react here, after the
    // permanent exists so sourceFilter can inspect its kind/trait/controller.
    await engine.fireSubTrigger?.("whenOptionPlayed", { subjectPermanentId: permanent.permanentId });
    return permanent;
  };

  // --- effect-driven digivolution / de-digivolve / place-under / link --------

  /**
   * Fold a printed digivolve cost through the continuous evo-cost ledger EXACTLY as
   * GameEngine.adjustedDigivolveCost does (ENG-03 / WR-03): apply `evoCostFor(target, into)`
   * (`fixed` REPLACES the printed cost, `delta` sums onto it), then subtract the
   * `wouldDigivolve` replacement reduction. Threads `into` so "when digivolving INTO this
   * card" reductions (BT7-040 / BT11-059) match. NOT floored here — each call site floors
   * with the existing `Math.max(0, ...)` so the fold and floor stay together per branch.
   * The card-printed `costDelta` is folded into `base` by the caller and must NOT also be
   * passed through the ledger (no double-count).
   */
  const adjustedEvoCost = (target: Permanent, base: number, into: CardDefinition): number => {
    let cost = base;
    const adj = ledger.evoCostFor(target, into);
    if (adj !== undefined) {
      cost = "fixed" in adj ? adj.fixed : cost + adj.delta;
    }
    return cost - subTriggers.costReductionFor("wouldDigivolve", target, into);
  };

  /**
   * Effect-driven digivolve: stack a loose card (`sourceInstanceId`) onto
   * `targetPermanentId` as the new top, the prior top sliding under it. Mirrors the
   * placement of the digivolve action (digivolveState.pushDigivolution) but sourced
   * from an effect ("this Digimon may digivolve into [X] ... without paying the
   * cost"). Recomputes DP from the new top and carries the base's suspended state.
   */
  const digivolveFromInstance = async (
    targetPermanentId: string,
    sourceInstanceId: string,
    opts?: {
      payCost?: boolean;
      draw?: boolean;
      costDelta?: number;
      costOverride?: number;
      useAlternateCost?: boolean;
      ignoreRequirements?: boolean;
      beforeWhenDigivolving?: () => Promise<void>;
    },
  ): Promise<Permanent | undefined> => {
    const permanent = access.permanentById(targetPermanentId);
    if (permanent === undefined || permanent.topCard === undefined) return undefined;
    const sourceDef = peekLooseInstance(state, sourceInstanceId);
    if (sourceDef === undefined) return undefined;
    const sourceZone = looseZoneOfInstance(state, sourceInstanceId);
    const definition = requireCardDefinition(sourceDef.cardId);
    const seat = permanent.controllerSeat;
    // BT8-059 / KB Q1741-Q1742: a live "players can't ignore digivolution
    // requirements" rule suppresses every effect-driven ignore path, including
    // Critical Arm's same-level Arm swap. Keep this authoritative check here as
    // defense in depth even though the interpreter also removes illegal candidates.
    if (opts?.ignoreRequirements && continuous.cannotIgnoreDigivolution(seat)) {
      return undefined;
    }
    if (opts?.payCost) {
      // ignoreDigivolutionRequirementFixedCost) replaces the printed digivolution cost.
      // `ignoreRequirements` ("ignoring its digivolution requirements") waives the printed
      // color+level gate; without it the base must still satisfy a printed EvoCost (a costOverride
      // alone keeps the requirement — BT7-051).
      let baseCost: number | undefined;
      if (opts.ignoreRequirements) {
        baseCost = opts.costOverride ?? 0;
      } else {
        // The base qualifies via a printed EvoCost OR via an alternate digivolution requirement
        // ("[Digivolve] [BurningGreymon]: Cost 0", "onto a red Tamer: Cost 2"). Both carry their
        // own cost. Consulting only the printed EvoCosts rejected every alternate-path base —
        // notably a Tamer base, which has no level and so matches no printed EvoCost at all —
        // and the digivolve then no-opped silently after the controller had already chosen it.
        // `runDigivolve`'s candidate filter already offers alternate-path bases; this is the
        // authoritative gate it claims to mirror, so the two must agree.
        const baseDef = requireCardDefinition(permanent.topCard.cardId);
        const printed = matchingDigivolveCost(definition, baseDef);
        const alternate = matchingAlternateDigivolutionRequirement(definition, baseDef);
        const useAlternate = opts.useAlternateCost === true && alternate !== undefined;
        if (useAlternate && alternate.minNameStackNames !== undefined) {
          const required = alternate.minNameStackCount ?? 1;
          const matches = permanent.stack.filter((card) => {
            const stackDef = requireCardDefinition(card.cardId);
            return alternate.minNameStackNames!.some((name) => stackDef.nameEn.includes(name));
          }).length;
          if (matches < required) return undefined;
        }
        if (useAlternate && alternate.minTraitStackCount !== undefined) {
          const wanted = alternate.minTraitStackTraits ?? [];
          const matches = permanent.stack.filter((card) => {
            const stackDef = requireCardDefinition(card.cardId);
            return wanted.some((trait) => cardHasTrait(stackDef, trait));
          }).length;
          if (matches < alternate.minTraitStackCount) return undefined;
        }
        const matched = useAlternate ? alternate!.cost : (printed ?? alternate?.cost);
        if (matched === undefined) return undefined;
        baseCost = opts.costOverride ?? matched;
      }
      // The card-printed folded reduction ("... for its digivolution cost -N") is added ONCE here;
      // the continuous evo-cost ledger (evoCostFor + the wouldDigivolve replacement reduction) is
      // then applied so continuous cost-reductions reach this effect-driven path too (KB BT1-109
      // Q980). Floored at 0 — a digivolution cost can't go below 0.
      const cost = Math.max(0, adjustedEvoCost(permanent, baseCost + (opts.costDelta ?? 0), definition));
      if (engine.memory.maxCostFor(seat) < cost) return undefined;
      if (cost > 0) engine.memory.pay(seat, cost, "digivolve");
    } else if (!opts?.ignoreRequirements) {
      // Cost-free effect-digivolve ("digivolve into X without paying the cost"): the memory cost is
      // waived but the digivolution REQUIREMENT is not. Only an explicit "ignoring its digivolution
      // requirements" (ignoreRequirements) waives the requirement; paying 0 memory does not. The base
      // must still satisfy the into-card's printed EvoCost or an alternate trait/name digivolution
      // requirement. Mirrors the interpreter's candidate filter (runDigivolve enforceRequirements):
      // only gate a base that carries a level — a level-less base (Q4242) satisfies no level-gated
      // requirement, so the check is meaningless and is skipped rather than rejecting the digivolve.
      const baseDef = requireCardDefinition(permanent.topCard.cardId);
      if (baseDef.level !== undefined && !canDigivolveOntoWithAlternates(definition, baseDef)) {
        return undefined;
      }
    }
    const instance = removeLooseInstance(state, sourceInstanceId);
    if (instance === undefined) return undefined;
    instance.faceUp = true;
    const carriedSuspended = permanent.isSuspended;
    permanent.stack.push(permanent.topCard);
    permanent.topCard = instance;
    const dp = definition.kinds.includes(CardKind.Digimon) ? definition.dp : 0;
    permanent.baseDP = dp;
    permanent.currentDP = dp;
    ledger.recomputeDP(state, permanent.permanentId);
    permanent.isSuspended = carriedSuspended;
    engine.emit({ kind: "cardsMoved", instanceIds: [instance.instanceId], from: "various", to: Zone.BattleArea });
    if (opts?.draw) await draw(seat, 1);
    await opts?.beforeWhenDigivolving?.();
    // The digivolved-into card's OWN [When Digivolving] fires (it was digivolved BY AN EFFECT),
    // with `enteredByEffect` set to its controller (the producer for the BT25-084 by-effect gate).
    await engine.fireEnteredByEffect?.(EffectTiming.WhenDigivolving, instance.instanceId, seat, {
      ...(sourceZone !== undefined ? { digivolvedFromZone: sourceZone } : {}),
    });
    return permanent;
  };

  /**
   * DNA-digivolve: consume two-or-more material permanents and play `resultInstanceId`
   * as one new permanent carrying every material's top card and digivolution cards
   * beneath it. The materials are removed from the field (their cards become the new
   * permanent's stack). Placed on the first material's controller's side.
   */
  const dnaDigivolveInto = async (
    materialPermanentIds: string[],
    resultInstanceId: string,
    opts?: { payCost?: boolean; extraMaterialInstanceIds?: string[]; costOverride?: number },
  ): Promise<Permanent | undefined> => {
    const materials = materialPermanentIds
      .map((id) => access.permanentById(id))
      .filter((p): p is Permanent => p !== undefined && p.topCard !== undefined);
    const extraMaterialIds = opts?.extraMaterialInstanceIds ?? [];
    const extraMaterials = extraMaterialIds
      .map((id) => peekLooseInstance(state, id))
      .filter((c): c is CardInstance => c !== undefined);
    if (materials.length < 1 || materials.length + extraMaterials.length < 2) return undefined;
    if (extraMaterials.length !== extraMaterialIds.length) return undefined;
    if (extraMaterials.some((c) => !requireCardDefinition(c.cardId).kinds.includes(CardKind.Digimon))) return undefined;
    const peek = peekLooseInstance(state, resultInstanceId);
    if (peek === undefined) return undefined;
    const definition = requireCardDefinition(peek.cardId);
    if (!definition.kinds.includes(CardKind.Digimon)) return undefined;
    const seat = materials[0]!.controllerSeat;
    const dnaMemoryGain = engine.dnaDigivolveMemoryGain?.(materialPermanentIds, definition) ?? 0;
    if (opts?.payCost) {
      // A printed DNA requirement is authoritative: every material slot must match it. Only cards
      // whose historical compiled data has no structured DNA requirement may use the legacy
      // single-base digivolve-cost fallback. Mixed-zone DNA effects (BT18-073) need the structured
      // requirement because one material may be a loose card in trash rather than on the field.
      const materialDefinitions = [
        ...materials.map((mat) => {
          const printed = requireCardDefinition(mat.topCard!.cardId);
          const effectiveLevel = continuous.dnaLevelFor(mat.permanentId, definition);
          return effectiveLevel === undefined ? printed : { ...printed, level: effectiveLevel };
        }),
        ...extraMaterials.map((card) => requireCardDefinition(card.cardId)),
      ];
      const dnaRequirements = dnaDigivolutionRequirementsFor(definition.cardId);
      let printedCost = matchingDnaDigivolveCost(definition, materialDefinitions);
      let chosenMaterial: Permanent | undefined;
      if (printedCost !== undefined) {
        chosenMaterial = materials[0]!;
      } else if (dnaRequirements.length === 0) {
        // DNA-digivolve cost is the printed digivolve cost matched against any field material.
        for (const mat of materials) {
          const c = matchingDigivolveCost(definition, requireCardDefinition(mat.topCard!.cardId));
          if (c !== undefined && (printedCost === undefined || c < printedCost)) {
            printedCost = c;
            chosenMaterial = mat;
          }
        }
      }
      if (printedCost === undefined || chosenMaterial === undefined) return undefined;
      // Route the chosen material's printed cost through the continuous evo-cost ledger so
      // cost-reductions apply to the DNA path too (KB BT1-109 Q980). The chosen material is the
      // ledger target so a base-keyed or "into this card" reduction is evaluated against the
      // actual base being consumed. Floored at 0.
      const cost = Math.max(0, opts.costOverride ?? adjustedEvoCost(chosenMaterial, printedCost, definition));
      if (engine.memory.maxCostFor(seat) < cost) return undefined;
      if (cost > 0) engine.memory.pay(seat, cost, "digivolve");
    }
    const instance = removeLooseInstance(state, resultInstanceId);
    if (instance === undefined) return undefined;
    instance.faceUp = true;
    // Gather the materials' cards (each material's stack then its top) as the new stack.
    // CR 8-2-2-1-2: each material's own linked cards are trashed immediately before it
    // becomes a digivolution card under the DNA-digivolved result — they do NOT carry
    // over (mirrors GameStateAccess.deletePermanent's stack/top/linked-to-trash pattern).
    const stackCards: CardInstance[] = [];
    const trashedLinked: CardInstance[] = [];
    for (const mat of materials) {
      for (const c of mat.stack) stackCards.push(c);
      if (mat.topCard !== undefined) stackCards.push(mat.topCard);
      for (const c of mat.linked) {
        insertCard(player(c.ownerSeat), Zone.Trash, c);
        trashedLinked.push(c);
      }
      // Remove the material permanent from its controller's battle area.
      const owner = player(mat.controllerSeat);
      const idx = owner.battleArea.findIndex((p) => p.permanentId === mat.permanentId);
      if (idx >= 0) extractPermanentAt(owner, idx);
      dropPermanentLedgers(mat.permanentId);
    }
    for (const id of extraMaterialIds) {
      const extra = removeLooseInstance(state, id);
      if (extra !== undefined) {
        extra.faceUp = true;
        stackCards.push(extra);
      }
    }
    // <Overflow> (CR §4-18): each material's linked cards just left the field for trash — a
    // genuine leave. The materials' own stack/top cards are NOT included here: they become
    // digivolution cards under the new result (moving TO under a card, excluded by §4-18-4).
    applyOverflow(engine.memory, trashedLinked, state.turnSeat);
    if (trashedLinked.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: trashedLinked.map((c) => c.instanceId),
        from: "various",
        to: Zone.Trash,
      });
    }
    const owner = player(seat);
    const permanent = new Permanent();
    permanent.permanentId = engine.nextPermanentId();
    permanent.controllerSeat = seat;
    permanent.topCard = instance;
    permanent.stack = new ArraySchema<CardInstance>(...stackCards);
    permanent.linked = new ArraySchema<CardInstance>();
    const dp = definition.dp;
    permanent.baseDP = dp;
    permanent.currentDP = dp;
    // CR 8-2-2-1-1: the DNA-digivolved Digimon always enters unsuspended — materials'
    // suspended state is NOT carried over (unlike a standard same-permanent digivolve).
    permanent.isSuspended = false;
    permanent.inBreeding = false;
    // CR 8-2-2-1-4: a Digimon created by DNA Digivolution may attack in the same turn.
    // `canAttackerDeclare` models ordinary summoning sickness through enterFieldTurnCount,
    // so keep the DNA result outside the current-turn bucket.
    permanent.enterFieldTurnCount = engine.state.turnCount - 1;
    appendPermanent(owner, permanent);
    // The new stack exists only after both material permanents are consumed. Reinstall continuous
    // effects now so inherited effects from every DNA material are active before entry timings run.
    await engine.recomputeContinuousEffects?.();
    if (dnaMemoryGain > 0) {
      engine.memory.addMemoryForSeat(seat, dnaMemoryGain, "gainMemory", { isTamerEffect: false });
    }
    engine.emit({ kind: "cardPlayed", seat, cardId: instance.cardId, permanentId: permanent.permanentId });
    // CR 8-2-3-3: the DNA digivolution procedure itself draws 1 card — unconditional, part of
    // the placement procedure (mirrors applyDigivolve step 6), not an optional card effect.
    await draw(seat, 1);
    // The DNA-digivolved card's OWN [When Digivolving] fires (it was digivolved BY AN EFFECT), with
    // `enteredByEffect` set to its controller (the producer for the BT25-084 by-effect gate) and
    // `isDnaDigivolve` set so an `isDnaDigivolving` condition resolves its DNA-only branch.
    await engine.fireEnteredByEffect?.(EffectTiming.WhenDigivolving, instance.instanceId, seat, {
      isDnaDigivolve: true,
    });
    return permanent;
  };

  /**
   * App Fusion: play the fusion-target card `resultInstanceId` (a loose card in trash/hand)
   * ON TOP of the battle-area Digimon `sourcePermanentId`, the source's prior top card sliding
   * under it as a digivolution card — the same placement as `digivolveFromInstance`, NOT
   * DnaDigivolve (no permanent is consumed off the field).
   *
   * `appFusionCondition` produced by `AddAppfuseMethodByName`): the fusing permanent's top
   * card plus its linked cards must collectively cover >= 2 distinct required names (with the
   * top card being one of them). The app-fusion cost is paid from memory. Returns the fused
   * permanent, or undefined when the source/result is missing, the fusion is illegal, or the
   * cost is unaffordable.
   */
  const appFuseInto = async (sourcePermanentId: string, resultInstanceId: string): Promise<Permanent | undefined> => {
    const permanent = access.permanentById(sourcePermanentId);
    if (permanent === undefined || permanent.topCard === undefined) return undefined;
    const peek = peekLooseInstance(state, resultInstanceId);
    if (peek === undefined) return undefined;
    const definition = requireCardDefinition(peek.cardId);
    if (!definition.kinds.includes(CardKind.Digimon)) return undefined;
    // Enforce the fusion-target's app-fusion legality + read its cost (server-authoritative).
    const topName = requireCardDefinition(permanent.topCard.cardId).nameEn;
    const linkedNames = Array.from(permanent.linked).map((c) => requireCardDefinition(c.cardId).nameEn);
    const cost = appFusionCostFor(peek.cardId, { topName, linkedNames });
    if (cost === undefined) return undefined;
    const seat = permanent.controllerSeat;
    if (engine.memory.maxCostFor(seat) < cost) return undefined;
    if (cost > 0) engine.memory.pay(seat, cost, "appFusion");
    const instance = removeLooseInstance(state, resultInstanceId);
    if (instance === undefined) return undefined;
    instance.faceUp = true;
    const carriedSuspended = permanent.isSuspended;
    permanent.stack.push(permanent.topCard);
    permanent.topCard = instance;
    const dp = definition.dp;
    permanent.baseDP = dp;
    permanent.currentDP = dp;
    ledger.recomputeDP(state, permanent.permanentId);
    permanent.isSuspended = carriedSuspended;
    engine.emit({ kind: "cardPlayed", seat, cardId: instance.cardId, permanentId: permanent.permanentId });
    engine.emit({ kind: "cardsMoved", instanceIds: [instance.instanceId], from: "various", to: Zone.BattleArea });
    // CR 8-4-3-3: the app fusion procedure itself draws 1 card — unconditional, part of the
    // placement procedure (mirrors applyDigivolve step 6 / dnaDigivolveInto).
    await draw(seat, 1);
    // CR 8-4-1 ("a player can digivolve 1 Digimon card with [App Fusion]..."), 8-4-2-3
    // ("effects that affect digivolution will also affect app fusion"), and 15-16-3's definition
    // of [When Digivolving] ("triggered ... when the action of digivolving into a card with that
    // effect is complete") together say App Fusion IS "digivolving" for the entering card's own
    // [When Digivolving] window, so it fires here.
    await engine.fireEnteredByEffect?.(EffectTiming.WhenDigivolving, instance.instanceId, seat);
    return permanent;
  };

  /**
   * De-Digivolve `n`: up to `n` times, move the permanent's current top card to the
   * trash and promote the digivolution card directly beneath it
   * to the new top (the Digimon reverts a stage). Stops when the stack is empty.
   */
  const deDigivolve = (
    permanentId: string,
    n: number,
    opts?: { byEffectSeat?: Seat; stopAtLevel?: number },
  ): CardInstance[] => {
    const permanent = access.permanentById(permanentId);
    if (permanent === undefined) return [];
    // EX10-029 whenLinked grant (rule implementation): a Digimon with this restriction
    // is immune to De-Digivolve effects for the duration of the grant.
    if (continuous.hasRestriction(permanentId, "cantBeDeDigivolved")) return [];
    // EX11-070 stacked-trash-lock (KB Q5943 explicitly names <De-Digivolve>): an OPPONENT effect
    // may not strip the host's stacked cards. <De-Digivolve> demotes the top by removing a source,
    // so a locked host is immune to an opponent's <De-Digivolve> (the controller's own still works).
    if (opts?.byEffectSeat !== undefined && continuous.stackTrashLocked(permanentId)) {
      if (opts.byEffectSeat !== permanent.controllerSeat) return [];
    }
    const moved: CardInstance[] = [];
    const levelFloor = opts?.stopAtLevel ?? 3;
    for (let i = 0; i < n; i++) {
      if (permanent.stack.length === 0) break; // no source to revert to
      const currentTopDefinition =
        permanent.topCard !== undefined ? requireCardDefinition(permanent.topCard.cardId) : undefined;
      // A repeated De-Digivolve can't continue after the first peel exposes a
      // non-Digimon card such as BT9-109 X Antibody. It is no longer a Digimon
      // that the remaining repetitions can affect; the rule-process sweep then
      // trashes that illegal top and all cards still under it (Q1921).
      if (
        currentTopDefinition !== undefined &&
        !currentTopDefinition.kinds.includes(CardKind.Digimon) &&
        !currentTopDefinition.kinds.includes(CardKind.DigiEgg)
      )
        break;
      // De-Digivolve may promote a level-N card, then must stop once that card is
      // the current top. Checking the prospective new top stopped one step too
      // early (a level-4 top never reached level 3) and, without an explicit
      // stopAtLevel, repeated De-Digivolve could incorrectly promote a Digi-Egg.
      const currentTopLevel = currentTopDefinition?.level;
      if (currentTopLevel !== undefined && currentTopLevel <= levelFloor) break;
      const oldTop = permanent.topCard;
      const newTop = permanent.stack.pop();
      if (newTop === undefined) break;
      permanent.topCard = newTop;
      if (oldTop !== undefined) {
        oldTop.faceUp = false;
        insertCard(player(oldTop.ownerSeat), Zone.Trash, oldTop);
        moved.push(oldTop);
      }
      const def = requireCardDefinition(newTop.cardId);
      const dp = def.kinds.includes(CardKind.Digimon) ? def.dp : 0;
      permanent.baseDP = dp;
      ledger.recomputeDP(state, permanent.permanentId);
    }
    // <Overflow> (CR §4-18): each demoted `oldTop` just left the field for the trash —
    // a genuine leave (it was the top card, not moving to under-a-card; it's being REPLACED
    // by the promoted stack card, not stacked itself).
    applyOverflow(engine.memory, moved, state.turnSeat);
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: Zone.BattleArea,
        to: Zone.Trash,
      });
    }
    return moved;
  };

  /**
   * ＜Armor Purge＞'s cost (Comprehensive Rules §16-19-1): trash this permanent's own CURRENT
   * top card, promoting the digivolution card directly beneath it to the new top — the
   * permanent stays in play, "purged" of its armor layer, instead of being deleted outright.
   * Requires >= 1 digivolution card to promote (with none, there is nothing to reveal and the
   * cost is unpayable — the caller must check `permanent.stack.length` before offering it).
   * Like `deDigivolve`, the old top goes to trash, but this is paid as a deletion-prevention
   * cost rather than applied as an effect to revert the Digimon.
   */
  const armorPurge = async (permanentId: string): Promise<CardInstance | undefined> => {
    const permanent = access.permanentById(permanentId);
    if (permanent === undefined || permanent.topCard === undefined) return undefined;
    const newTop = permanent.stack.pop();
    if (newTop === undefined) return undefined;
    const oldTop = permanent.topCard;
    permanent.topCard = newTop;
    oldTop.faceUp = true;
    insertCard(player(oldTop.ownerSeat), Zone.Trash, oldTop);
    const def = requireCardDefinition(newTop.cardId);
    permanent.baseDP = def.kinds.includes(CardKind.Digimon) ? def.dp : 0;
    ledger.recomputeDP(state, permanentId);
    // <Overflow> (CR §4-18): the old top card just left the battle area for trash — a genuine
    // leave, distinct from the permanent as a whole (which is NOT being deleted).
    applyOverflow(engine.memory, [oldTop], state.turnSeat);
    engine.emit({ kind: "cardsMoved", instanceIds: [oldTop.instanceId], from: Zone.BattleArea, to: Zone.Trash });
    return oldTop;
  };

  /**
   * ＜Ascension＞'s reaction (Comprehensive Rules §16-43-1): after the holder's card has
   * already been trashed by its deletion, the controller may place that SAME card instance at
   * the TOP of their security stack instead of leaving it in trash. Called post-movement (the
   * card must already be loose in trash) — mirrors ＜Fortitude＞'s replay-from-trash pattern.
   */
  const ascendToSecurity = async (instanceId: string): Promise<boolean> => {
    const removed = removeLooseInstance(state, instanceId);
    if (removed === undefined) return false;
    removed.faceUp = false;
    insertCard(player(removed.ownerSeat), Zone.Security, removed, "top");
    engine.emit({ kind: "cardsMoved", instanceIds: [removed.instanceId], from: Zone.Trash, to: Zone.Security });
    if (engine.fireSubTrigger) {
      await engine.fireSubTrigger("whenAddSecurity", {
        addedToSecuritySeat: removed.ownerSeat,
        addedToSecurityInstanceIds: [removed.instanceId],
      });
    }
    return true;
  };

  /**
   * "Place this Digimon's top card as its bottom digivolution card" (BT22-043/044 inherited
   * BOTTOM of its own digivolution stack and the topmost digivolution card is promoted to the
   * new top (the Digimon stays in play, one stage rotated). Requires >= 1 digivolution card to
   * promote; returns false (cost unpayable) otherwise.
   */
  const placeOwnTopAtStackBottom = (permanentId: string): boolean => {
    const permanent = access.permanentById(permanentId);
    if (permanent === undefined || permanent.topCard === undefined) return false;
    if (permanent.stack.length === 0) return false;
    const oldTop = permanent.topCard;
    const newTop = permanent.stack.pop();
    if (newTop === undefined) return false;
    permanent.topCard = newTop;
    permanent.stack.unshift(oldTop); // bottom of the digivolution cards
    const def = requireCardDefinition(newTop.cardId);
    permanent.baseDP = def.kinds.includes(CardKind.Digimon) ? def.dp : 0;
    ledger.recomputeDP(state, permanent.permanentId);
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [oldTop.instanceId],
      from: Zone.BattleArea,
      to: Zone.BattleArea,
    });
    return true;
  };

  /**
   * Place loose cards under `targetPermanentId` as digivolution cards. By default the
   * cards go to the BOTTOM of the stack ("place as the bottom digivolution card");
   * `belowTop` inserts them directly beneath the current top instead.
   */
  const placeUnder = async (
    targetPermanentId: string,
    instanceIds: string[],
    opts?: { belowTop?: boolean; faceUp?: boolean },
  ): Promise<CardInstance[]> => {
    const permanent = access.permanentById(targetPermanentId);
    if (permanent === undefined) return [];
    const placed: CardInstance[] = [];
    for (const instanceId of instanceIds) {
      const instance = removeLooseInstance(state, instanceId);
      if (instance === undefined) continue;
      instance.faceUp = opts?.faceUp ?? true;
      if (opts?.belowTop) permanent.stack.push(instance);
      else permanent.stack.unshift(instance);
      placed.push(instance);
    }
    if (placed.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: placed.map((c) => c.instanceId),
        from: "various",
        to: Zone.BattleArea,
      });
      // SubTrigger bus: "when [Tamer] cards are placed in this Digimon's digivolution cards"
      // watchers. No co-located EffectTiming analogue (a fresh fire point per RESEARCH A1).
      // The permanent that GAINED the cards is the event subject; a watcher's sourceFilter
      // ("under one of YOUR Digimon") gates on it.
      await engine.fireSubTrigger?.("onAddDigivolutionCards", { subjectPermanentId: targetPermanentId });
    }
    return placed;
  };

  /**
   * ＜Material Save N＞'s reaction (Comprehensive Rules §16-21): when `permanentId` (a Digimon
   * with this keyword) is deleted, place up to N of its own specified DigiXros-requirement
   * digivolution cards under 1 of the controller's Tamers INSTEAD of trashing them
   * (§16-21-3: optional activation, but mandatory maximize once accepted). Must be called
   * BEFORE the permanent's cards actually move to trash — it relocates the chosen stack cards
   * out from under the still-live permanent, so the deletion movement never reaches them.
   * Shared between the effect-deletion path (below) and the combat battle-death path (via the
   * `materialSave` CombatPort/hook), since this is a plain "when deleted" reaction with no
   * cause restriction. Returns true when it fired.
   */
  const materialSave = async (permanentId: string): Promise<boolean> => {
    if (!continuous.hasKeyword(permanentId, "MaterialSave")) return false;
    const perm = access.permanentById(permanentId);
    if (perm === undefined || perm.topCard === undefined) return false;
    const n = materialSaveCountOf(perm.topCard.cardId);
    if (n === undefined || n === 0) return false;
    const eligible = perm.stack.filter((c) => digiXrosMatches(perm.topCard!.cardId, c.cardId));
    if (eligible.length === 0) return false;
    const tamers = access
      .battleAreaPermanents(perm.controllerSeat)
      .filter((p) => p.topCard !== undefined && requireCardDefinition(p.topCard.cardId).kinds.includes(CardKind.Tamer));
    if (tamers.length === 0) return false;
    const accept = await engine.ask.selectInstances(
      perm.controllerSeat,
      [eligible[0]!.instanceId],
      0,
      1,
      `＜Material Save ${n}＞: place up to ${n} of this Digimon's specified digivolution cards under 1 of your Tamers?`,
    );
    if (accept.length === 0) return false;
    let tamerId = tamers[0]!.permanentId;
    if (tamers.length > 1) {
      const chosenTamer = await engine.ask.selectInstances(
        perm.controllerSeat,
        tamers.map((t) => t.topCard!.instanceId),
        1,
        1,
        "＜Material Save＞: place the cards under which Tamer?",
      );
      const found = tamers.find((t) => t.topCard?.instanceId === chosenTamer[0]);
      if (found !== undefined) tamerId = found.permanentId;
    }
    const toPlaceIds = eligible.slice(0, n).map((c) => c.instanceId);
    await placeUnder(tamerId, toPlaceIds);
    return true;
  };

  /**
   * Move a whole battle-area permanent under another as digivolution cards.
   * The source permanent is removed from the field; its top, stack, and linked
   * cards are attached to the destination's digivolution stack.
   *
   * `shedOwnCards` switches this to the DigiXros placement of §7-2-2-7: "As soon as a card
   * from the battle area is to be placed under a card for a DigiXros, that card is removed
   * from the battle area, therefore any cards under it are trashed." Only the source's TOP
   * card becomes a material; its own digivolution stack is trashed, and so is its link card
   * (§4-8-6 — the DigiXros result is a new card). Card effects that merely place a permanent
   * under another are NOT this case (§4-16, KB Q4250/Q4251/Q4256/Q4257: those keep the stack),
   * so the flag is opt-in and only `actions/digiXros.ts` sets it.
   */
  const relocatePermanent = (
    destPermanentId: string,
    sourcePermanentId: string,
    opts?: { belowTop?: boolean; shedOwnCards?: boolean },
  ): boolean => {
    if (destPermanentId === sourcePermanentId) return false;
    // The host may sit in the battle area OR the breeding area: BT13-007's [Breeding] effect
    // gathers battle-area [Royal Knight] Digimon UNDER the breeding-area King Drasil itself.
    // access.permanentById scans only the battle area, so fall back to the breeding slot.
    const dest =
      access.permanentById(destPermanentId) ??
      state.players.find((p) => p.breeding?.permanentId === destPermanentId)?.breeding;
    if (dest === undefined || dest.topCard === undefined) return false;

    let source: Permanent | undefined;
    for (const owner of state.players) {
      const idx = owner.battleArea.findIndex((p) => p.permanentId === sourcePermanentId);
      if (idx >= 0) {
        source = extractPermanentAt(owner, idx);
        break;
      }
    }
    if (source === undefined || source.topCard === undefined) return false;

    // A true leave: the source `permanentId` is spliced out and ceases to exist (its
    // cards re-attach under `dest`), so every subscription anchored to it is dead.
    dropPermanentLedgers(sourcePermanentId);

    const shed = opts?.shedOwnCards ?? false;
    const toShed: CardInstance[] = shed ? [...source.stack, ...source.linked] : [];
    for (const card of toShed) {
      card.faceUp = false;
      insertCard(player(card.ownerSeat), Zone.Trash, card);
    }
    if (toShed.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: toShed.map((c) => c.instanceId),
        from: Zone.BattleArea,
        to: Zone.Trash,
      });
    }

    const belowTop = opts?.belowTop ?? true;
    const toAttach: CardInstance[] = shed ? [source.topCard] : [source.topCard, ...source.stack, ...source.linked];
    for (const card of toAttach) {
      card.faceUp = false;
      if (belowTop) dest.stack.push(card);
      else dest.stack.unshift(card);
    }

    engine.emit({
      kind: "cardsMoved",
      instanceIds: toAttach.map((c) => c.instanceId),
      from: Zone.BattleArea,
      to: Zone.BattleArea,
    });
    return true;
  };

  const relocatePermanentByEffect: NonNullable<Primitives["relocatePermanentByEffect"]> = async (
    destPermanentId,
    sourcePermanentId,
    opts,
  ) => {
    const moved = relocatePermanent(destPermanentId, sourcePermanentId, opts);
    if (moved) {
      // A whole permanent placed under another by an effect/cost is still one or more
      // digivolution cards being added. Share the same awaited event seam as `placeUnder`
      // so ST13-05/ST13-14 and every analogous watcher resolve before the parent continues.
      await engine.fireSubTrigger?.("onAddDigivolutionCards", {
        subjectPermanentId: destPermanentId,
      });
    }
    return moved;
  };

  /**
   * Move a whole permanent (top + digivolution stack + linked cards) across the
   * breeding/battle boundary as a card EFFECT — preserving identity, stack, linked
   * cards and suspended state. Digivolution cards are NOT trashed and ＜Overflow＞ is NOT
   * processed (Comprehensive Rules §4-16; KB P-143 Q4250/Q4251/Q4256/Q4257). NOT the
   * breeding-phase player verb (no Phase.Breeding gate, no once-per-turn limit).
   *   - "toBreeding": the battle-area permanent leaves play into the EMPTY breeding slot;
   *     it becomes inert for the continuous/targeting layer (recompute scans battleArea
   *     only), so its continuous entries are dropped like any battle-area exit.
   *   - "toBattle": the breeding permanent enters the battle area; the next continuous
   *     recompute re-derives its statics.
   */
  const movePermanentZone = async (permanentId: string, direction: "toBreeding" | "toBattle"): Promise<boolean> => {
    if (direction === "toBreeding") {
      for (const owner of state.players) {
        const idx = owner.battleArea.findIndex((perm) => perm.permanentId === permanentId);
        if (idx < 0) continue;
        if (owner.breeding !== undefined) return false; // destination occupied (defensive)
        const permanent = extractPermanentAt(owner, idx)!;
        // Comprehensive Rules §3-4-5-2: a Digimon in the breeding area can't be affected
        // by (and its battle-area effects don't run) effects unless they reference breeding.
        // Drop all three ledgers like any battle-area exit so its replacement/watcher
        // subscriptions go inert too. The fire seam already excludes breeding sources
        // (permanentById scans battleArea only), but the costReductionFor/replacementsFor
        // reads filter on id alone — without this drop a breeding source's stale reduceCost
        // would still discount while its watchers can't fire, the silent inconsistency WR-02
        // flagged. A later toBattle re-derives continuous statics; subTrigger re-install on
        // return is a separate pre-existing gap (subTriggers are not recomputed).
        dropPermanentLedgers(permanentId);
        permanent.inBreeding = true;
        owner.breeding = permanent;
        engine.emit({
          kind: "cardsMoved",
          instanceIds: permanent.topCard ? [permanent.topCard.instanceId] : [],
          from: Zone.BattleArea,
          to: Zone.Breeding,
        });
        return true;
      }
      return false;
    }
    for (const owner of state.players) {
      if (owner.breeding === undefined || owner.breeding.permanentId !== permanentId) continue;
      const permanent = owner.breeding;
      owner.breeding = undefined;
      permanent.inBreeding = false;
      appendPermanent(owner, permanent);
      engine.emit({
        kind: "cardsMoved",
        instanceIds: permanent.topCard ? [permanent.topCard.instanceId] : [],
        from: Zone.Breeding,
        to: Zone.BattleArea,
      });
      // A breeding -> battle move fires the OnMove timing (P-130's [Your Turn] reaction).
      await engine.fireTiming?.(EffectTiming.OnMove, { movedPermanentId: permanent.permanentId });
      return true;
    }
    return false;
  };

  /**
   * §10-1-1: "A card from the hand OR BATTLE AREA can be linked to a Digimon in the battle
   * area." When `instanceId` is a battle-area permanent's own top card (not a loose hand/stack/
   * linked card `removeLooseInstance` already covers), detach that whole permanent so its top
   * card can become the link card: the permanent ceases to exist and its slot frees immediately.
   *
   * INFERENCE, not a direct ruling — I searched the KB Q&A and found none settling what happens
   * to the detached permanent's OWN digivolution stack and link card. This follows the §7-2-2-7
   * DigiXros principle by analogy ("as soon as a card from the battle area is removed... any
   * cards under it are trashed") — the same shape `relocatePermanent`'s `shedOwnCards` already
   * applies for DigiXros placement — and trashes both: the stack per that analogy, and the link
   * card per §4-8-6 (a card that "becomes a new card" loses its link card; here the host carrying
   * it is removed from the field entirely, so nothing remains to hold it). Re-check against a
   * ruling if one surfaces. Deletion timings do NOT fire (this is a removal, not a delete: no
   * WhenPermanentWouldBeDeleted/OnDeletion window), but ＜Overflow＞ (§4-18-1/-3/-4) DOES apply to
   * every card that leaves here — the top card becomes a link card, which §4-8-4 says "isn't
   * considered to be a card on the field" (a genuine leave), and the shed stack/linked cards
   * leave for the trash (also a genuine leave, not "under a card").
   */
  const detachTopCardForLink = (instanceId: string): CardInstance | undefined => {
    for (const owner of state.players) {
      const idx = owner.battleArea.findIndex((p) => p.topCard?.instanceId === instanceId);
      if (idx < 0) continue;
      const source = extractPermanentAt(owner, idx);
      if (source === undefined || source.topCard === undefined) return undefined;
      dropPermanentLedgers(source.permanentId);
      const shed = [...source.stack, ...source.linked];
      for (const card of shed) {
        card.faceUp = false;
        insertCard(player(card.ownerSeat), Zone.Trash, card);
      }
      if (shed.length > 0) {
        engine.emit({
          kind: "cardsMoved",
          instanceIds: shed.map((c) => c.instanceId),
          from: Zone.BattleArea,
          to: Zone.Trash,
        });
      }
      applyOverflow(engine.memory, [source.topCard, ...shed], state.turnSeat);
      return source.topCard;
    }
    return undefined;
  };

  /** Link loose cards, or a battle-area permanent's own top card (§10-1-1), to a permanent (the Link mechanic). */
  const link = async (targetPermanentId: string, instanceIds: string[]): Promise<CardInstance[]> => {
    const permanent = access.permanentById(targetPermanentId);
    if (permanent === undefined) return [];
    const linked: CardInstance[] = [];
    for (const instanceId of instanceIds) {
      // Never detach the link's OWN target: no real card links a permanent onto itself, and
      // doing so would rip the recipient's own top card out from under the very `permanent`
      // reference this loop is about to push onto.
      const instance =
        instanceId === permanent.topCard?.instanceId
          ? removeLooseInstance(state, instanceId)
          : (detachTopCardForLink(instanceId) ?? removeLooseInstance(state, instanceId));
      if (instance === undefined) continue;
      instance.faceUp = true;
      // CR 10-1-2-1: a new link card is plugged in at the BOTTOM of the existing ones,
      // mirroring the digivolution stack's own bottom-insert convention.
      permanent.linked.unshift(instance);
      linked.push(instance);
    }
    if (linked.length > 0) {
      // CR 4-2-4: a linked card contributes its printed linkDp, so the DP tier must be
      // re-derived here the way digivolve does after it stacks a card.
      ledger.recomputeDP(state, permanent.permanentId);
      engine.emit({
        kind: "cardsMoved",
        instanceIds: linked.map((c) => c.instanceId),
        from: "various",
        to: Zone.BattleArea,
      });
      // SubTrigger bus: "when this Digimon gets linked" / "when a card is linked to this
      // Digimon" watchers. The recipient permanent (which gained the link) is the subject.
      await engine.fireSubTrigger?.("whenLinked", { subjectPermanentId: targetPermanentId });
    }
    return linked;
  };

  // --- trash / delete --------------------------------------------------------

  /** The permanent (battle area or breeding) whose TOP card is `instanceId`, if any. */
  const permanentByTopInstance = (instanceId: string): string | undefined => {
    for (const owner of state.players) {
      for (const permanent of owner.battleArea) {
        if (permanent.topCard?.instanceId === instanceId) return permanent.permanentId;
      }
      if (owner.breeding?.topCard?.instanceId === instanceId) return owner.breeding.permanentId;
    }
    return undefined;
  };

  /**
   * Move card instances to their owners' trash from wherever they currently sit
   * (hand, security, deck, or as a permanent's top/stack/linked card). Mirrors the
   * source trash flows (Player.Trash*, IDiscardHands, ...). A card sitting as the
   * TOP card of a permanent cannot be trashed in isolation by this verb (that is a
   * delete, which moves the whole permanent) — such ids are skipped. Returns the
   * instances actually moved.
   */
  const trash = async (instanceIds: string[], opts?: { byEffectSeat?: Seat }): Promise<CardInstance[]> => {
    // "Effects can't trash it" (§15-1-3, EX9-005). The restriction is keyed by permanent, so it
    // covers every card that permanent owns — its top card, digivolution stack, and link cards.
    // `stackTrashLock` remains the narrower, seat-aware lock for stack cards alone (EX11-070);
    // this is the blanket form. A loose hand/security/deck card belongs to no permanent and is
    // never gated here.
    instanceIds = instanceIds.filter((id) => {
      const host =
        hostOfStackInstance(state, id)?.hostPermanentId ??
        hostOfLinkedInstance(state, id) ??
        permanentByTopInstance(id);
      return host === undefined || !isRestricted(host, "beTrashed");
    });
    const moved: CardInstance[] = [];
    // SubTrigger bus (System B): "when a link card is trashed" (whenLinkTrashed) fires for each
    // instance that, at trash time, sits in a permanent's `linked` list — a GENUINE trash of a
    // link card. A link-card REPLACE swaps the linked card via a different path and does NOT route
    // through this verb, so it never fires here (KB EX10-062 Q5172 / EX10-073 Q5188). The host
    // permanent (whose link card this is) is carried as `subjectPermanentId` so a watcher can gate
    // on "this Digimon" / "an opponent's Digimon".
    const linkTrashed: { instanceId: string; hostPermanentId: string }[] = [];
    if (engine.fireSubTrigger) {
      for (const instanceId of instanceIds) {
        const host = hostOfLinkedInstance(state, instanceId);
        if (host !== undefined) linkTrashed.push({ instanceId, hostPermanentId: host });
      }
    }
    // <Overflow> (CR §4-18) eligibility, recorded BEFORE removal: this verb also trashes loose
    // hand/security/deck cards, which are NOT "under a card" and must NOT trigger Overflow — only
    // an instance currently sitting in a permanent's digivolution stack or linked list qualifies
    // as "moving from under a card to another area".
    const underCard = new Set(
      instanceIds.filter(
        (id) => hostOfStackInstance(state, id) !== undefined || hostOfLinkedInstance(state, id) !== undefined,
      ),
    );
    // Cards sitting in a security stack at trash time: an effect is trashing them FROM security
    // (ST22-10's leave-prevention pays by trashing itself from security — KB Q5438). Recorded before
    // removal so OnDiscardSecurity can fire once the card has landed in trash.
    const fromSecurity = instanceIds.filter((id) =>
      state.players.some((p) => p?.security.some((c) => c.instanceId === id)),
    );
    // Seats whose HAND holds a card about to be trashed (recorded before removal). After the move,
    // `whenHandTrashed` fires ONCE per affected seat for this trash ACTION, regardless of card count
    // (KB Q6400/Q6401), carrying the seat so a "when YOUR hand is trashed from" watcher (BT25-084)
    // can gate on its own hand.
    const handTrashedSeats = new Set<Seat>();
    const fromHand: { instanceId: string; cardId: string; seat: Seat }[] = [];
    if (engine.fireSubTrigger) {
      for (const p of state.players) {
        if (p === undefined) continue;
        for (const card of p.hand) {
          if (!instanceIds.includes(card.instanceId)) continue;
          handTrashedSeats.add(p.seat);
          fromHand.push({ instanceId: card.instanceId, cardId: card.cardId, seat: p.seat });
        }
      }
    }
    for (const instanceId of instanceIds) {
      // Pass includeTrash=false: a card already in trash must not be removed-then-
      // re-pushed (this verb moves cards INTO trash, never out of it).
      const removed = removeLooseInstance(state, instanceId, false);
      if (removed === undefined) continue;
      insertCard(player(removed.ownerSeat), Zone.Trash, removed);
      moved.push(removed);
    }
    applyOverflow(
      engine.memory,
      moved.filter((c) => underCard.has(c.instanceId)),
      state.turnSeat,
    );
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: "various",
        to: Zone.Trash,
      });
    }
    // Fire AFTER the move, gated to instances that actually left the linked list.
    const movedIds = new Set(moved.map((c) => c.instanceId));
    for (const entry of linkTrashed) {
      if (!movedIds.has(entry.instanceId)) continue;
      await engine.fireSubTrigger!("whenLinkTrashed", { subjectPermanentId: entry.hostPermanentId });
    }
    const discardedFromSecurity = fromSecurity.filter((id) => movedIds.has(id));
    if (discardedFromSecurity.length > 0) {
      await engine.fireDiscardedFromSecurity?.(discardedFromSecurity);
    }
    // Fire once per seat whose hand actually lost a card (the move may have skipped some ids).
    for (const seat of handTrashedSeats) {
      const trashedThisSeat = moved.some((c) => c.ownerSeat === seat);
      if (trashedThisSeat)
        await engine.fireSubTrigger!("whenHandTrashed", {
          handTrashedSeat: seat,
          ...(opts?.byEffectSeat !== undefined ? { byEffectSeat: opts.byEffectSeat } : {}),
        });
    }
    for (const entry of fromHand) {
      if (!movedIds.has(entry.instanceId)) continue;
      await engine.fireSubTrigger!("whenTrashedFromHand", {
        handTrashedSeat: entry.seat,
        trashedFromHandCardId: entry.cardId,
        trashedFromHandInstanceId: entry.instanceId,
        ...(opts?.byEffectSeat !== undefined ? { byEffectSeat: opts.byEffectSeat } : {}),
      });
    }
    return moved;
  };

  /**
   * Trash digivolution-stack cards of `hostPermanentId` BY AN EFFECT (the producing site for
   * the whenDigivolutionTrashed SubTrigger; KB P-004 Q4113). Moves the cards via `trash`, then
   * fires whenDigivolutionTrashed once per card actually trashed, carrying the host as subject.
   * A return-to-hand bounce that clears digivolution cards routes through returnToHand, never
   * here, so the bounce-clear never fires this event.
   */
  const trashDigivolutionCards = async (
    hostPermanentId: string,
    instanceIds: string[],
    opts?: { byEffectSeat?: Seat; byEffectCardId?: string; isDigiBurst?: boolean },
  ): Promise<CardInstance[]> => {
    // EX11-070 stacked-trash-lock (KB Q5943): an OPPONENT effect may not trash the host's stacked
    // cards. The lock is scoped to the host's opponent — the controller's OWN effects still trash
    //. With no `byEffectSeat` (a rules/non-attributed
    // trash) the lock is conservatively NOT applied, mirroring the engine's other byEffectSeat-gated
    // checks. A locked, opponent-attributed trash removes nothing (returns []).
    if (opts?.byEffectSeat !== undefined && continuous.stackTrashLocked(hostPermanentId)) {
      const hostSeat = access.permanentById(hostPermanentId)?.controllerSeat;
      if (hostSeat !== undefined && opts.byEffectSeat !== hostSeat) return [];
    }
    // BT9-109 X Antibody protects only its own instance, from every effect (including its
    // controller's). Keep other requested cards eligible so "trash the bottom 2" can trash the
    // unprotected one (KB Q1922). Rule-driven identity cleanup uses other seams and is unaffected.
    const trashableInstanceIds = instanceIds.filter((instanceId) => !continuous.stackCardTrashLocked(instanceId));
    const moved = await trash(trashableInstanceIds);
    ledger.dropSourceInstances(
      state,
      moved.map((card) => card.instanceId),
    );
    if (moved.length > 0 && engine.fireSubTrigger) {
      // Digi-Burst trashes all chosen sources simultaneously. Notify its self-card watchers in
      // one batch before any per-card fire can trigger a continuous recompute and tear down the
      // other just-trashed sources' watchers.
      if (opts?.isDigiBurst === true) {
        await engine.fireSubTrigger("onDigiBurstCardDiscarded", {
          subjectPermanentId: hostPermanentId,
          trashedDigivolutionInstanceIds: moved.map((card) => card.instanceId),
          ...(opts.byEffectSeat !== undefined ? { byEffectSeat: opts.byEffectSeat } : {}),
          ...(opts.byEffectCardId !== undefined ? { byEffectCardId: opts.byEffectCardId } : {}),
          isDigiBurstTrash: true,
        });
      }
      // Exact inherited-source reactions are simultaneous. Fire their watchers against one
      // batch payload before any per-card event triggers a continuous recompute and removes
      // the other just-trashed sources' subscriptions.
      await engine.fireSubTrigger("onDigivolutionCardsDiscardedBatch", {
        subjectPermanentId: hostPermanentId,
        trashedDigivolutionInstanceIds: moved.map((card) => card.instanceId),
        ...(opts?.byEffectSeat !== undefined ? { byEffectSeat: opts.byEffectSeat } : {}),
        ...(opts?.byEffectCardId !== undefined ? { byEffectCardId: opts.byEffectCardId } : {}),
        ...(opts?.isDigiBurst === true ? { isDigiBurstTrash: true } : {}),
      });
      for (let i = 0; i < moved.length; i++) {
        // onDigivolutionCardDiscarded ("when THIS digivolution card is trashed") FIRST: its
        // watcher is a CONTINUOUS install whose source IS the just-trashed card (isSelfRef,
        // BT10-006). fireSubTrigger runs a trailing recomputeContinuousEffects, which drops
        // that watcher because its source has left the field. Firing the broader
        // whenDigivolutionTrashed first would tear the self-referential watcher down before it
        // ever sees its own event. whenDigivolutionTrashed watchers anchor on a SURVIVING
        // permanent (the host / another card), so they are order-insensitive.
        await engine.fireSubTrigger("onDigivolutionCardDiscarded", {
          subjectPermanentId: hostPermanentId,
          trashedDigivolutionInstanceId: moved[i]!.instanceId,
          ...(opts?.byEffectSeat !== undefined ? { byEffectSeat: opts.byEffectSeat } : {}),
          ...(opts?.byEffectCardId !== undefined ? { byEffectCardId: opts.byEffectCardId } : {}),
          ...(opts?.isDigiBurst === true ? { isDigiBurstTrash: true } : {}),
        });
        await engine.fireSubTrigger("whenDigivolutionTrashed", {
          subjectPermanentId: hostPermanentId,
          ...(opts?.byEffectSeat !== undefined ? { byEffectSeat: opts.byEffectSeat } : {}),
        });
      }
    }
    return moved;
  };

  const canTrashDigivolutionCard = (instanceId: string): boolean => !continuous.stackCardTrashLocked(instanceId);

  /**
   * Consult active digivolution-card-trash "redirect" replacements (BT10-084 Tactimon; KB
   * Q2002-Q2008) for a trash operation about to target `hostPermanentIds`. Called by every
   * effect-driven digivolution-card-trash site BEFORE it selects which cards to take, so the
   * SAME top/bottom/choose/amount logic that would have run against the original host(s)
   * re-runs, unchanged, against the redirected host — see `Primitives.redirectDigivolutionTrashHosts`'s
   * doc comment. Default-safe (returns the input unchanged) when the engine port doesn't wire
   * `consultDigivolutionTrashRedirect` (test fakes).
   */
  const redirectDigivolutionTrashHosts = async (hostPermanentIds: string[]): Promise<string[]> => {
    if (!engine.consultDigivolutionTrashRedirect) return hostPermanentIds;
    const redirected = await engine.consultDigivolutionTrashRedirect(hostPermanentIds);
    return redirected === undefined ? hostPermanentIds : [redirected];
  };

  /**
   * Fire whenOptionUsed (BT19-040 token watcher). The 08-06 use-option-without-cost verb calls
   * this at its produce site; defined in 08-01 so the watcher substrate exists. Carries the used
   * Option instance as the subject permanent ref for a watcher's gate.
   */
  const fireOptionUsed = async (usedInstanceId: string, usedOptionCost?: number): Promise<void> => {
    if (engine.fireSubTrigger) {
      await engine.fireSubTrigger("whenOptionUsed", { subjectPermanentId: usedInstanceId, usedOptionCost });
    }
  };

  /**
   * Fire onDiscardLibrary SubTrigger when cards are milled from a player's deck top.
   * BT14-077 Yuki Tamer watcher: fires once per mill operation (not per card), carrying
   * the milled deck's owner seat and the trashed instance IDs.
   */
  const fireOnDiscardLibrary = async (deckSeat: Seat, trashedInstanceIds: string[]): Promise<void> => {
    if (engine.fireSubTrigger && trashedInstanceIds.length > 0) {
      await engine.fireSubTrigger("onDiscardLibrary", {
        addedToHand: { instanceIds: trashedInstanceIds, byEffect: { ownerSeat: deckSeat, isDigimonEffect: false } },
      });
    }
  };

  /**
   * Fire whenTrashedFromDeck once per milled card (CAP-H-01, BT19-097). Carries the card ID
   * of the just-trashed deck card so a `sourceFilter.isSelfRef` watcher can match only when its
   * own card ID was the one trashed. Mirrors the fireOnDiscardLibrary pattern but fires per card.
   */
  const fireWhenTrashedFromDeck = async (
    cardId: string,
    instanceId?: string,
    byEffectCardId?: string,
  ): Promise<void> => {
    const alreadyArmed =
      instanceId !== undefined &&
      engine.subTriggers
        ?.subscriptionsFor("whenTrashedFromDeck")
        .some((subscription) => subscription.sourceInstanceId === instanceId);
    if (instanceId !== undefined && !alreadyArmed) {
      await engine.resolveSelfWhenTrashedFromDeck?.(instanceId);
    }
    if (engine.fireSubTrigger) {
      await engine.fireSubTrigger("whenTrashedFromDeck", {
        trashedFromDeckCardId: cardId,
        ...(byEffectCardId !== undefined ? { trashedFromDeckByEffectCardId: byEffectCardId } : {}),
      });
    }
  };

  /**
   * Run `cardId`'s registered EffectModule effect(s) for `timing` under `ctx.source`'s control
   * (mirrors the interpreter's own `runUseOptionWithoutCost`, generalized past IR-compiled
   * cards). Looked up through the shared `registerCard` registry rather than the interpreter's
   * `getCompiledCard`, so a hand-written module resolves too — `getCompiledCard` only sees
   * IR-compiled records and would silently no-op for every hand-implemented card. `effectsForTiming`
   * is called with `ctx.source` (not a `CardSource` built for `cardId`), so any closures inside
   * the target module read the CALLER's identity — "runs under the using card's control", not
   * the used card's own. Bypasses each effect's `canActivate`/cost gate: the caller has already
   * committed to using the card. Returns false when nothing was found to run.
   */
  const resolveCardEffect = async (ctx: EffectContext, cardId: string, timing: EffectTiming): Promise<boolean> => {
    const targetModule = getEffectModule(cardId);
    if (targetModule === undefined) return false;
    const effects = targetModule.effectsForTiming(timing, ctx.source);
    for (const effect of effects) await effect.resolve(ctx);
    return effects.length > 0;
  };

  /**
   * "Use 1 Option card from your hand" (BT19-040 and 11 other callers). Resolves the used card's
   * [Main]/`OnUseOption` effect via `resolveCardEffect` under the CALLING card's control, then
   * trashes the Option (Options resolve then go to trash — they are not permanents) and fires
   * whenOptionUsed (BT19-040 token watcher). Returns the trashed instances. The fire lives here,
   * beside the trash, because only this layer reaches engine.fireSubTrigger (mirrors
   * trashDigivolutionCards). The cardId is read from the hand BEFORE trashing removes it.
   */
  const useOptionFromHand = async (
    ctx: EffectContext,
    usedInstanceId: string,
    usedOptionCost?: number,
  ): Promise<CardInstance[]> => {
    // `peekLooseInstance` (not `locateInHand`): the name says "FromHand", but callers such as
    // the interpreter's own use-without-cost path may pick from a non-hand zone (e.g. trash),
    // so the cardId lookup has to be zone-agnostic like the trash below already is.
    const usedCard = peekLooseInstance(state, usedInstanceId);
    if (usedCard !== undefined) {
      let usedDefinition: CardDefinition | undefined;
      try {
        usedDefinition = requireCardDefinition(usedCard.cardId);
      } catch {
        // Unit-test and extension modules may register an effect-only card without card data.
      }
      if (usedDefinition === undefined) {
        await resolveCardEffect(ctx, usedCard.cardId, EffectTiming.OnUseOption);
      } else {
        const permanent = (): Permanent | undefined => {
          for (const owner of state.players) {
            const found = owner.battleArea.find(
              (candidate) =>
                candidate.topCard.instanceId === usedInstanceId ||
                candidate.stack.some(({ instanceId }) => instanceId === usedInstanceId),
            );
            if (found !== undefined) return found;
            if (
              owner.breeding?.topCard.instanceId === usedInstanceId ||
              owner.breeding?.stack.some(({ instanceId }) => instanceId === usedInstanceId) === true
            ) {
              return owner.breeding;
            }
          }
          return undefined;
        };
        const optionCtx: EffectContext = {
          ...ctx,
          source: {
            instanceId: usedInstanceId,
            cardId: usedCard.cardId,
            ownerSeat: usedCard.ownerSeat,
            definition: usedDefinition,
            permanent,
            isOnBattleArea: () =>
              state.players.some((owner) =>
                owner.battleArea.some(
                  (candidate) =>
                    candidate.topCard.instanceId === usedInstanceId ||
                    candidate.stack.some(({ instanceId }) => instanceId === usedInstanceId),
                ),
              ),
            isOnBreedingArea: () =>
              state.players.some(
                (owner) =>
                  owner.breeding?.topCard.instanceId === usedInstanceId ||
                  owner.breeding?.stack.some(({ instanceId }) => instanceId === usedInstanceId) === true,
              ),
            isInTrash: () =>
              state.players.some((owner) => owner.trash.some(({ instanceId }) => instanceId === usedInstanceId)),
            isInHand: () =>
              state.players.some((owner) => owner.hand.some(({ instanceId }) => instanceId === usedInstanceId)),
            isOwnersTurn: () => state.turnSeat === usedCard.ownerSeat,
            hasColor: (color) => usedDefinition.colors.includes(color),
          },
        };
        await resolveCardEffect(optionCtx, usedCard.cardId, EffectTiming.OnUseOption);
      }
    }
    // Some Options relocate themselves while resolving (for example EX3-069: Draw 1, then
    // place this card in the battle area). Only apply the normal post-resolution trash rule
    // while the exact instance is still loose; otherwise trashing by instance id would undo
    // the Option's own observable destination.
    const isPermanentTop = state.players.some(
      (owner) =>
        owner.battleArea.some(({ topCard }) => topCard.instanceId === usedInstanceId) ||
        owner.breeding?.topCard.instanceId === usedInstanceId,
    );
    const moved = isPermanentTop ? [] : await trash([usedInstanceId]);
    await fireOptionUsed(usedInstanceId, usedOptionCost);
    return moved;
  };

  /**
   * Trash `n` security cards of `seat` (source TrashSecurityAndProcessAccordingToResult,
   * with `fromTop`). Default takes from the bottom (the source default trashes from
   * the bottom of the stack); `fromTop` takes from index 0. Returns the trashed
   * instances (the caller branches on the result, e.g. trigger an effect per trashed
   * card). Emits securityChecked-free cardsMoved (trashing security via an effect is
   * not a security CHECK).
   */
  const trashFromSecurity = async (
    seat: Seat,
    n: number,
    opts?: { fromTop?: boolean; instanceIds?: string[] },
  ): Promise<CardInstance[]> => {
    const p = player(seat);
    const fromTop = opts?.fromTop ?? false;
    const moved: CardInstance[] = [];
    for (let i = 0; i < n; i++) {
      const requestedId = opts?.instanceIds?.[i];
      const card =
        requestedId !== undefined
          ? spliceById(p.security, requestedId)
          : fromTop
            ? takeTop(p, Zone.Security)
            : takeBottom(p, Zone.Security);
      if (card === undefined) break;
      card.faceUp = true;
      insertCard(p, Zone.Trash, card);
      moved.push(card);
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: Zone.Security,
        to: Zone.Trash,
      });
      // SubTrigger bus: a resolving EFFECT removed cards from `seat`'s security stack
      // attack-driven security check, which routes through its own seam. The payload names
      // the affected seat so a "when an effect removes from YOUR security" watcher (BT15-084)
      // gates on its own stack.
      await engine.fireSubTrigger?.("whenEffectRemovesFromSecurity", { removedFromSecuritySeat: seat });
      // Generic removal watchers (BT4-088) care that a card left security regardless of
      // whether it was checked or removed by an effect. Security checks already fire this
      // event at their own movement seam; effect-driven trash must reach the same bus too.
      await engine.fireSubTrigger?.("whenSecurityRemoved", { removedFromSecuritySeat: seat });
      // Each trashed security card's own OnDiscardSecurity clause (ST22-10) fires now that it is in trash.
      await engine.fireDiscardedFromSecurity?.(moved.map((c) => c.instanceId));
    }
    return moved;
  };

  /**
   * "By trashing the top security card of 1 player with the most security cards, ..."
   * (ST23-05, BT26-031). A player is eligible when they have >=1 security card AND >=
   * the other player's count (a tie leaves BOTH eligible — the controller chooses, KB
   * Q6167). The whole thing is OPTIONAL: `controllerSeat` may decline. Uses sentinel
   * candidate ids ("mine"/"opponent", mirroring `forceAttack`'s "player" sentinel) rather
   * than the actual (face-down, hidden) security card instance ids, so the decision
   * itself leaks no card identity. Returns which seat (if any) was trashed from and the
   * trashed card, the source `...AndProcessAccordingToResult` shape — the caller
   * branches on whether anything was actually trashed.
   */
  const trashTopSecurityOfPlayerWithMostSecurity = async (
    controllerSeat: Seat,
  ): Promise<{ seat: Seat; trashed: CardInstance[] }> => {
    const opponentSeat = access.opponentOf(controllerSeat);
    const myCount = player(controllerSeat).security.length;
    const oppCount = player(opponentSeat).security.length;
    const MINE = "mine";
    const OPPONENT = "opponent";
    const candidates: string[] = [];
    if (myCount > 0 && myCount >= oppCount) candidates.push(MINE);
    if (oppCount > 0 && oppCount >= myCount) candidates.push(OPPONENT);
    if (candidates.length === 0) return { seat: controllerSeat, trashed: [] };
    const chosen = await engine.ask.selectInstances(
      controllerSeat,
      candidates,
      0,
      1,
      "Trash the top security card of 1 player with the most security cards?",
    );
    if (chosen.length === 0) return { seat: controllerSeat, trashed: [] };
    const seat = chosen[0] === OPPONENT ? opponentSeat : controllerSeat;
    const trashed = await trashFromSecurity(seat, 1, { fromTop: true });
    return { seat, trashed };
  };

  /**
   * Delete permanents from the field, sending each one's top card, whole digivolution
   * stack, and linked cards to their owners' trash (source
   * DeletePeremanentAndProcessAccordingToResult -> rule implementation.Destroy).
   * Reuses GameStateAccess.deletePermanent for the movement, then drops the permanent's
   * duration modifiers and emits a combatResolved-style narration. Async because it
   * fires WhenPermanentWouldBeDeleted here via engine.fireTiming before the movement,
   * and OnDestroyedAnyone (with deletedPermanentId/deletedInstanceIds) fires from
   * GameEngine after the movement completes.
   *
   * `cause` (default `byEffect`) is forwarded to `consultLeavePrevention` so a
   * leave-prevention reaction can discriminate WHY the permanent is leaving. The
   * ruleProcess fixpoint (state-based-action deletion) passes `byRule` so a
   * "can't be deleted by your opponent's effects" reaction does NOT wrongly fire on
   * a rule-based DP-0 deletion (RESEARCH Pitfall 5).
   */
  const deletePermanent = async (
    permanentIds: string[],
    cause: import("./EffectContext.js").RemovalCause = "byEffect",
  ): Promise<number> => {
    // "Can't be deleted" (Comprehensive Rules §15-1-3: a prohibiting effect takes precedence).
    // Filtered FIRST: an outright prohibition means the deletion never approaches, so neither
    // the would-be-deleted timing nor the ＜Evade＞/＜Barrier＞ cost prompts should fire for it.
    // Battle deaths never reach this primitive (they go through GameStateAccess.deletePermanent),
    // so `beDeletedInBattle` stays the battle-scoped kind and this covers byEffect + byRule.
    // A rule deletion has no controlling effect, so an opponent-scoped entry cannot apply to it.
    permanentIds = permanentIds.filter(
      (permanentId) =>
        !continuous.hasRestriction(permanentId, "beDeleted", undefined, {
          byOpponentEffect: cause === "byRule" ? false : isOpponentEffectAgainst(permanentId),
        }),
    );
    if (permanentIds.length === 0) return 0;
    for (const permanentId of permanentIds) {
      if (engine.fireTiming) {
        await engine.fireTiming(EffectTiming.WhenPermanentWouldBeDeleted, { deletedPermanentId: permanentId });
      }
    }
    // Leave-the-battle-area PREVENT reactions: a card may prevent some of these effect-deletions
    // by paying a cost. Consult them and drop the prevented permanents from the deletion set.
    // Default-safe: the consult returns empty unless a matching prevent-replacement is active.
    let toDelete = permanentIds;
    if (engine.consultLeavePrevention) {
      const prevented = await engine.consultLeavePrevention(permanentIds, cause, engine.controllerSeat());
      if (prevented.size > 0) toDelete = permanentIds.filter((id) => !prevented.has(id));
    }
    // ＜Evade＞ keyword: when this Digimon would be deleted by an effect, you MAY suspend
    // it to prevent that deletion (Comprehensive Rules §16-22-3: an optional processing
    // condition, not a mandatory replacement — §15-8-5-1 "the effect CAN be activated").
    // Only usable when unsuspended (the suspension IS the cost). Each eligible permanent is
    // prompted one at a time (§15-8-5-4), through the same evadePrompt/respondEvade window
    // the combat (battle-loss) path uses, so the controller's decline is honored instead of
    // the deletion being silently prevented.
    {
      const evaded = new Set<string>();
      for (const permanentId of toDelete) {
        if (!continuous.hasKeyword(permanentId, "Evade")) continue;
        const perm = access.permanentById(permanentId);
        if (perm === undefined || perm.isSuspended) continue;
        if (!engine.combat) continue; // no prompt facility available; deletion proceeds
        const accepted = await engine.combat.runEvadeDecision(perm.controllerSeat, permanentId);
        if (!accepted) continue;
        const suspended = await suspend([permanentId], { byEffectSeat: perm.controllerSeat });
        if (suspended.length === 0) continue;
        evaded.add(permanentId);
      }
      if (evaded.size > 0) toDelete = toDelete.filter((id) => !evaded.has(id));
    }
    // ＜Barrier＞ keyword: when this Digimon would be deleted, you MAY trash the top card of
    // your security stack to prevent that deletion (Comprehensive Rules §16-25-3: also an
    // optional processing condition), once per turn per permanent (shared `barrierFired` /
    // `markBarrierFired` ledger with the combat path). Prompted through the same
    // barrierPrompt/respondBarrier window as the combat (battle-loss) path.
    {
      const barriered = new Set<string>();
      for (const permanentId of toDelete) {
        if (!continuous.hasKeyword(permanentId, "Barrier")) continue;
        const perm = access.permanentById(permanentId);
        if (perm === undefined) continue;
        if (access.securityCount(perm.controllerSeat) === 0) continue;
        const barrierKey = `${permanentId}/barrier`;
        if (engine.barrierFired?.(barrierKey) === true) continue;
        if (!engine.combat) continue; // no prompt facility available; deletion proceeds
        const accepted = await engine.combat.runBarrierDecision(perm.controllerSeat, permanentId);
        if (!accepted) continue;
        access.flipTopSecurityToTrash(perm.controllerSeat);
        engine.markBarrierFired?.(barrierKey);
        barriered.add(permanentId);
      }
      if (barriered.size > 0) toDelete = toDelete.filter((id) => !barriered.has(id));
    }
    // ＜Decoy＞ keyword (Comprehensive Rules §16-18): when another of the controller's
    // SPECIFIED Digimon would be deleted by an OPPONENT's effect, by deleting the Digimon
    // with this effect, prevent that OTHER Digimon's deletion. Unlike ＜Evade＞/＜Barrier＞
    // (self-protection), this protects a DIFFERENT permanent, so it is keyed off the
    // endangered permanent's controller/card, not its own keyword. Scoped to `cause ===
    // "byEffect"` and an opposing resolving seat (§16-18-1's "by an opponent's effect") — a
    // battle death or the permanent's own controller's effect never activates it.
    {
      const decoySaved = new Set<string>();
      if (cause === "byEffect") {
        for (const permanentId of toDelete) {
          if (decoyCostPermanentIds.has(permanentId)) continue;
          const perm = access.permanentById(permanentId);
          if (perm === undefined || perm.topCard === undefined) continue;
          const resolvingSeat = engine.controllerSeat();
          if (resolvingSeat === perm.controllerSeat) continue; // must be an OPPONENT's effect
          const targetDef = requireCardDefinition(perm.topCard.cardId);
          const holders = access
            .battleAreaPermanents(perm.controllerSeat)
            .filter(
              (h) =>
                h.permanentId !== permanentId &&
                h.topCard !== undefined &&
                access.isBattleAreaDigimon(h) &&
                continuous.hasKeyword(h.permanentId, "Decoy"),
            );
          if (holders.length === 0) continue;
          const groups = new Map<string, { sourceCardId: string; effectText: string; holders: typeof holders }>();
          for (const holder of holders) {
            const sources = continuous.keywordGrantSources(holder.permanentId, "Decoy");
            const provenances =
              sources.length > 0
                ? sources
                : [
                    {
                      sourceCardId: holder.topCard.cardId,
                      effectText: requireCardDefinition(holder.topCard.cardId).effectText,
                      specifiers: continuous.keywordSpecifiers(holder.permanentId, "Decoy"),
                    },
                  ];
            for (const source of provenances) {
              const sourceCardId = source.sourceCardId ?? holder.topCard.cardId;
              const effectText = source.effectText ?? requireCardDefinition(sourceCardId).effectText ?? "";
              const specifiers = source.specifiers ?? decoySpecFromText(effectText);
              const matches =
                specifiers !== undefined && specifiers.length > 0
                  ? decoySpecMatches(specifiers, targetDef)
                  : decoyMatches(sourceCardId, targetDef);
              if (!matches) continue;
              const key = `${sourceCardId}\u0000${effectText}`;
              const group = groups.get(key) ?? { sourceCardId, effectText, holders: [] as typeof holders };
              if (!group.holders.some(({ permanentId: id }) => id === holder.permanentId)) group.holders.push(holder);
              groups.set(key, group);
            }
          }
          for (const { sourceCardId, effectText, holders: matchingHolders } of groups.values()) {
            const chosen = await engine.ask.selectInstances(
              perm.controllerSeat,
              matchingHolders.map((holder) => holder.topCard.instanceId),
              0,
              1,
              "＜Decoy＞: excluir este Digimon para impedir que o outro Digimon seja excluído?",
              {
                sourceCardId,
                timing: "Static",
                effectText,
              },
            );
            if (chosen.length === 0) continue;
            const holder = matchingHolders.find(({ topCard }) => topCard.instanceId === chosen[0]);
            if (holder === undefined) continue;
            // Delete the Decoy holder as the cost — routed back through this same primitive so
            // its own leave-prevention/Evade/Barrier/On-Deletion/Overflow all apply normally.
            decoyCostPermanentIds.add(holder.permanentId);
            let costDeleted = 0;
            try {
              costDeleted = await deletePermanent([holder.permanentId], "byEffect");
            } finally {
              decoyCostPermanentIds.delete(holder.permanentId);
            }
            if (costDeleted > 0) decoySaved.add(permanentId);
            break;
          }
        }
      }
      if (decoySaved.size > 0) toDelete = toDelete.filter((id) => !decoySaved.has(id));
    }
    // ＜Armor Purge＞ keyword (Comprehensive Rules §16-19): when this Digimon would be deleted,
    // you MAY trash its own current top card to prevent the deletion (§16-19-3: activation is
    // an optional processing condition; once activated the prevention is mandatory). Requires
    // >= 1 digivolution card to promote — with none, there is nothing to reveal underneath and
    // the deletion proceeds.
    {
      const armorPurged = new Set<string>();
      for (const permanentId of toDelete) {
        if (!continuous.hasKeyword(permanentId, "Armor Purge")) continue;
        const perm = access.permanentById(permanentId);
        if (perm === undefined || perm.topCard === undefined || perm.stack.length === 0) continue;
        const chosen = await engine.ask.selectInstances(
          perm.controllerSeat,
          [perm.topCard.instanceId],
          0,
          1,
          "＜Armor Purge＞: trash this Digimon's top card to prevent its deletion?",
        );
        if (chosen.length === 0) continue;
        await armorPurge(permanentId);
        armorPurged.add(permanentId);
      }
      if (armorPurged.size > 0) toDelete = toDelete.filter((id) => !armorPurged.has(id));
    }
    // ＜Fragment (N)＞ keyword (Comprehensive Rules §16-37): when this Digimon would be
    // deleted, you MAY choose and trash N of ITS OWN digivolution cards to prevent the
    // deletion (§16-37-3: optional activation, all-or-nothing once accepted). Requires >= N
    // digivolution cards to pay the cost.
    {
      const fragmentSaved = new Set<string>();
      for (const permanentId of toDelete) {
        if (!continuous.hasKeyword(permanentId, "Fragment")) continue;
        const perm = access.permanentById(permanentId);
        if (perm === undefined || perm.topCard === undefined) continue;
        const n = fragmentCountOf(perm.topCard.cardId);
        if (n === undefined || n === 0 || perm.stack.length < n) continue;
        const candidateIds = perm.stack.map((c) => c.instanceId);
        const chosen = await engine.ask.selectInstances(
          perm.controllerSeat,
          candidateIds,
          0,
          n,
          `＜Fragment (${n})＞: trash ${n} of this Digimon's digivolution cards to prevent its deletion?`,
        );
        if (chosen.length < n) continue; // all-or-nothing: a partial pick is a decline
        await trashDigivolutionCards(permanentId, chosen);
        fragmentSaved.add(permanentId);
      }
      if (fragmentSaved.size > 0) toDelete = toDelete.filter((id) => !fragmentSaved.has(id));
    }
    // ＜Material Save N＞ keyword (Comprehensive Rules §16-21): when this Digimon IS deleted
    // (no longer preventable — every prevention layer above has already run), you MAY place up
    // to N of its own specified DigiXros-requirement digivolution cards under 1 of your Tamers
    // INSTEAD of trashing them (§16-21-3: optional activation, but mandatory maximize once
    // accepted). Run BEFORE the movement below so the redirected cards are already off this
    // permanent's stack and never reach trash. Shared with the combat (battle-death) path via
    // `engine.combat.materialSave`, since this is a plain "when deleted" reaction, not
    // scoped to effect-deletions.
    for (const permanentId of toDelete) {
      await materialSave(permanentId);
    }
    // ＜Scapegoat＞ keyword (Comprehensive Rules §16-32): when this Digimon would be deleted
    // OTHER THAN by one of its own controller's effects, by deleting 1 of the controller's
    // OTHER Digimon, prevent the deletion. "Other than by one of your effects" excludes only
    // an effect resolving under the deleted permanent's OWN controller — a rule-based
    // (`byRule`) or an opponent's-effect deletion both qualify.
    {
      const scapegoatSaved = new Set<string>();
      for (const permanentId of toDelete) {
        if (!continuous.hasKeyword(permanentId, "Scapegoat")) continue;
        const perm = access.permanentById(permanentId);
        if (perm === undefined) continue;
        if (cause === "byEffect" && engine.controllerSeat() === perm.controllerSeat) continue;
        const candidates = access
          .battleAreaPermanents(perm.controllerSeat)
          .filter((p) => p.permanentId !== permanentId && p.topCard !== undefined && access.isBattleAreaDigimon(p));
        if (candidates.length === 0) continue;
        const chosen = await engine.ask.selectInstances(
          perm.controllerSeat,
          candidates.map((p) => p.topCard!.instanceId),
          0,
          1,
          "＜Scapegoat＞: delete 1 of your other Digimon to prevent this deletion?",
        );
        if (chosen.length === 0) continue;
        const sacrifice = candidates.find((p) => p.topCard?.instanceId === chosen[0]);
        if (sacrifice === undefined) continue;
        await deletePermanent([sacrifice.permanentId], "byEffect");
        scapegoatSaved.add(permanentId);
      }
      if (scapegoatSaved.size > 0) toDelete = toDelete.filter((id) => !scapegoatSaved.has(id));
    }
    // SubTrigger bus (System B): "when [a matching Digimon] is deleted" watchers fire over
    // the to-be-deleted set, co-located with the deletion. Fired here — while each subject is
    // STILL a live permanent — so a watcher's captured sourceFilter ("a [Puppet] Digimon")
    // can resolve and gate on the deleted card's live traits/controller before it leaves the
    // field. The body (e.g. draw) runs immediately; OnDestroyedAnyone (System A) follows below.
    if (engine.fireSubTrigger) {
      const deletedByDpZero =
        cause === "byRule" &&
        toDelete.length > 0 &&
        toDelete.every((permanentId) => access.permanentById(permanentId)?.currentDP === 0);
      for (const permanentId of toDelete) {
        if (access.permanentById(permanentId)?.topCard === undefined) continue;
        await engine.fireSubTrigger("onDeletionOf", {
          deletedPermanentId: permanentId,
          deletedPermanentIds: toDelete,
          removalCause: cause,
          deletedByDpZero,
        });
        // whenLeavesPlay is the superset event (delete + bounce); deletion is one path.
        await engine.fireSubTrigger("whenLeavesPlay", { deletedPermanentId: permanentId });
        // whenTrashedByEffect (CAP-E8): fires only when this deletion was effect-driven.
        // The permanent is still live here so the watcher's sourceFilter.isSelfRef can match.
        if (cause === "byEffect") {
          await engine.fireSubTrigger("whenTrashedByEffect", { trashedByEffectPermanentId: permanentId });
        }
      }
    }
    const allMoved: string[] = [];
    const allStackInstanceIds: string[] = [];
    // The deleted COUNT = permanents that ACTUALLY left the field. A prevented (leave-prevention)
    // or immune permanent never enters `toDelete` / moves nothing, contributing 0 — the result a
    // gating "if this effect didn't delete" Condition reads (KB BT23-069 Q5338).
    let deletedCount = 0;
    // Record stack card instance IDs BEFORE deletion (per permanent) so the placement guard
    // can distinguish inherited effects (which require a stack position) from top-card
    // effects after the permanent is gone.
    const stackIdsByPermanent = toDelete.map(
      (permanentId) => access.permanentById(permanentId)?.stack.map((c) => c.instanceId) ?? [],
    );
    const topCardIdsByPermanent = toDelete.map((permanentId) => access.permanentById(permanentId)?.topCard?.cardId);
    const effectiveColorsByPermanent = toDelete.map((permanentId) => {
      const permanent = access.permanentById(permanentId);
      if (permanent?.topCard === undefined) return [] as CardColor[];
      return [
        ...new Set([
          ...requireCardDefinition(permanent.topCard.cardId).colors,
          ...continuous.grantedColors(permanentId),
        ]),
      ] as CardColor[];
    });
    // ＜Fortitude＞ keyword (Comprehensive Rules §16-27): "When a Digimon WITH DIGIVOLUTION
    // CARDS and this effect is deleted, you play this Digimon without paying the cost" —
    // mandatory (§16-27-3), no decision. Captured here (pre-deletion) so "had digivolution
    // cards" reads the live stack; the actual replay happens after the movement below, once
    // the top card is a loose instance sitting in trash.
    const fortitudeReplays = toDelete
      .map((permanentId) => {
        const perm = access.permanentById(permanentId);
        if (perm === undefined || perm.topCard === undefined) return undefined;
        if (perm.stack.length === 0) return undefined;
        if (!continuous.hasKeyword(permanentId, "Fortitude")) return undefined;
        return perm.topCard.instanceId;
      })
      .filter((id): id is string => id !== undefined);
    // ＜Ascension＞ keyword (Comprehensive Rules §16-43): "when the card with this effect is
    // deleted, the player MAY place this card at the top of the security stack" — an optional
    // trigger-type reaction (§16-43-3), captured pre-deletion (same reason as Fortitude) so
    // the prompt fires for every candidate that actually leaves the field.
    const ascensionCandidates = toDelete
      .map((permanentId) => {
        const perm = access.permanentById(permanentId);
        if (perm === undefined || perm.topCard === undefined) return undefined;
        if (!continuous.hasKeyword(permanentId, "Ascension")) return undefined;
        return { instanceId: perm.topCard.instanceId, seat: perm.controllerSeat };
      })
      .filter((c): c is { instanceId: string; seat: Seat } => c !== undefined);
    // ＜Partition (...)＞ keyword (Comprehensive Rules §16-29): "when a Digimon with this
    // effect and 1 of each of the specified cards in its digivolution cards would be removed
    // from the battle area OTHER THAN by one of your effects or a battle, you may play 1 of
    // each of the specified cards from the digivolution cards without paying their costs" — an
    // optional (§16-29-3), all-or-nothing (§16-29-4) immediate-type reaction. Battle deaths
    // never reach this primitive at all (they go through GameStateAccess.deletePermanent
    // directly), so the cause gate here only needs to exclude the holder's OWN controller's
    // effect deletions (mirrors the ＜Scapegoat＞ gate above). Captured pre-deletion (same
    // reason as Fortitude/Ascension) so the live stack can be matched against the specifier;
    // the actual replay happens after the movement below, once the cards are loose in trash.
    const partitionCandidates = toDelete
      .map((permanentId) => {
        const perm = access.permanentById(permanentId);
        if (perm === undefined || perm.topCard === undefined) return undefined;
        if (!continuous.hasKeyword(permanentId, "Partition")) return undefined;
        if (cause === "byEffect" && engine.controllerSeat() === perm.controllerSeat) return undefined;
        const spec = partitionSpecOf(perm.topCard.cardId);
        if (spec === undefined) return undefined;
        const remaining = [...perm.stack];
        const matchedInstanceIds: string[] = [];
        for (const clause of spec) {
          const idx = remaining.findIndex((c) => partitionClauseMatches(clause, c.cardId));
          if (idx < 0) return undefined; // must find 1 of EACH specified card — no partial pick
          matchedInstanceIds.push(remaining[idx]!.instanceId);
          remaining.splice(idx, 1);
        }
        return { seat: perm.controllerSeat, matchedInstanceIds };
      })
      .filter((c): c is { seat: Seat; matchedInstanceIds: string[] } => c !== undefined);
    // `toDelete` is ONE simultaneous action (CR §4-18-5: "when multiple instances of
    // <Overflow> are processed simultaneously..."), so every permanent's cards must be moved
    // to trash and Overflow charged ONCE across the whole batch (turn-player-first), not once
    // per permanent in whatever order this array happens to be in — see
    // `deletePermanentsBatched`'s own doc for why per-permanent application can cross the
    // turn-player/non-turn-player boundary the wrong way and change the clamped result.
    const movedByPermanent = access.deletePermanentsBatched(toDelete);
    const deletedEffectiveColorsByInstanceId: Record<string, CardColor[]> = {};
    for (let i = 0; i < toDelete.length; i++) {
      const permanentId = toDelete[i]!;
      const moved = movedByPermanent[i]!;
      if (moved.length === 0) continue;
      deletedCount += 1;
      allStackInstanceIds.push(...stackIdsByPermanent[i]!);
      // Drop ALL three per-permanent ledgers on the way off the field, mirroring the
      // DNA-digivolve material teardown above. The SubTrigger bus is now live, so a stale
      // reduceCost/prevent replacement or onDeletionOf/whenAttacking watcher anchored to a
      // deleted source must not survive to fire or discount after the source is gone.
      dropPermanentLedgers(permanentId);
      allMoved.push(...moved);
      for (const instanceId of moved) {
        deletedEffectiveColorsByInstanceId[instanceId] = effectiveColorsByPermanent[i]!;
      }
    }
    if (allMoved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: allMoved,
        from: Zone.BattleArea,
        to: Zone.Trash,
      });
    }
    // WhenPermanentWouldBeDeleted fired BEFORE movement (would-be-deleted); now that the
    // survivors of that window have actually left the field, fire OnDestroyedAnyone over
    // the deleted set (is-deleted). source stacks ONE OnDestroyedAnyone window over the
    // fixed deleted set (documented behavior); resolveTiming re-collects every
    // OnDeletion candidate from trash and orders turn-player-first, so a single fire batches
    // simultaneous deletions correctly. Pulled-from-field cards are now loose in trash, so
    // their [On Deletion] effects (e.g. ＜Save＞) become candidates and trigger.
    // Gate on allMoved (what actually left the field), not toDelete (what was requested): a
    // request to delete an already-off-field permanent moves nothing and must NOT open a
    // window. The combat and security deletion sites gate on their own actual-deleted sets
    // the same way, and never route through this primitive (each owns exactly one window).
    if (allMoved.length > 0 && engine.fireTiming) {
      await engine.fireTiming(EffectTiming.OnDestroyedAnyone, {
        deletedPermanentId: allMoved[0],
        deletedTopCardId: topCardIdsByPermanent.find((cardId) => cardId !== undefined),
        deletedEffectiveColorsByInstanceId,
        // The actually-deleted card set: the [On Deletion] trigger gate (builders.onDeletion)
        // admits only these instances as candidates at this window.
        deletedInstanceIds: allMoved,
        // Stack-card subset so the placement guard can gate inherited effects (which require
        // a stack position) vs top-card effects after the permanent is gone.
        deletedWasStackInstanceIds: allStackInstanceIds,
        removalCause: cause,
      });
      // WhenTrashedFromBattleArea (CAP-F5, BT19-095): fires only when the deletion was
      // effect-driven (not combat or rule). The trashed cards are now in trash, matching
      // the same "post-removal" timing as OnDestroyedAnyone.
      if (cause === "byEffect") {
        await engine.fireTiming(EffectTiming.WhenTrashedFromBattleArea, {
          deletedPermanentId: allMoved[0],
          deletedInstanceIds: allMoved,
        });
      }
    }
    // ＜Fortitude＞ replay: only for cards that actually left the field (in allMoved), each as
    // its own fresh permanent (top card only — the digivolution stack that qualified it stays
    // trashed as loose cards, matching every other "play this card from trash" reaction).
    for (const instanceId of fortitudeReplays) {
      if (!allMoved.includes(instanceId)) continue;
      await playInstances([instanceId]);
    }
    // ＜Ascension＞ reaction: only for cards that actually left the field (in allMoved). The
    // card is now loose in trash; `ascendToSecurity` relocates that same instance.
    for (const { instanceId, seat } of ascensionCandidates) {
      if (!allMoved.includes(instanceId)) continue;
      const chosen = await engine.ask.selectInstances(
        seat,
        [instanceId],
        0,
        1,
        "＜Ascension＞: place this card at the top of your security stack?",
      );
      if (chosen.length === 0) continue;
      await ascendToSecurity(instanceId);
    }
    // ＜Partition＞ reaction: only for candidates whose ENTIRE matched set actually left the
    // field (in allMoved) — a partial leave (leave-prevention saved the permanent but not this
    // batch entry, or vice versa) means the specified cards never reach trash. Playing them
    // is a "you may" choice (§16-29-3); accepting plays all of them at once (§16-29-4).
    for (const { seat, matchedInstanceIds } of partitionCandidates) {
      if (!matchedInstanceIds.every((id) => allMoved.includes(id))) continue;
      const chosen = await engine.ask.selectInstances(
        seat,
        [matchedInstanceIds[0]!],
        0,
        1,
        "＜Partition＞: play the specified digivolution cards without paying their costs?",
      );
      if (chosen.length === 0) continue;
      await playInstances(matchedInstanceIds, { payCost: false });
    }
    return deletedCount;
  };

  // --- suspend / unsuspend ---------------------------------------------------

  async function fireSuspensionTriggers(permanentIds: string[], opts?: { byEffectSeat?: Seat }): Promise<void> {
    const firstPermanentId = permanentIds[0];
    if (firstPermanentId === undefined) return;
    const simultaneousTrigger = {
      subjectPermanentId: firstPermanentId,
      ...(permanentIds.length > 1 ? { subjectPermanentIds: permanentIds } : {}),
      suspendedPermanentId: firstPermanentId,
    };
    // One action that suspends multiple permanents creates one simultaneous timing, not one
    // timing per card (BT2-041 Q1015 / BT4-084 Q1230). Carry every subject so filtered watchers
    // can match any relevant member while activating only once for the shared timing.
    await engine.fireTiming?.(EffectTiming.OnTappedAnyone, {
      suspendedPermanentId: firstPermanentId,
      ...(permanentIds.length > 1 ? { subjectPermanentId: firstPermanentId, subjectPermanentIds: permanentIds } : {}),
    });
    await engine.fireSubTrigger?.(
      "whenSuspended",
      permanentIds.length > 1 ? simultaneousTrigger : { suspendedPermanentId: firstPermanentId },
    );
    await engine.fireSubTrigger?.("whenEffectSuspends", {
      ...simultaneousTrigger,
      ...(opts?.byEffectSeat !== undefined ? { effectSuspendSeat: opts.byEffectSeat } : {}),
    });
  }

  async function suspend(
    permanentIds: string[],
    opts?: { byEffectSeat?: Seat; deferTriggers?: boolean },
  ): Promise<string[]> {
    const suspendedPermanentIds: string[] = [];
    for (const permanentId of permanentIds) {
      const permanent = access.permanentById(permanentId);
      if (permanent !== undefined) {
        // Only an actual unsuspended -> suspended TRANSITION counts as "becoming suspended":
        // suspending an already-suspended permanent "isn't considered to be suspended by the
        // effect" (KB ST18-10), so it opens no OnTappedAnyone / whenSuspended window. Gating
        // here is also what terminates a "when an opponent becomes suspended, suspend 1 of
        // their Digimon" loop (BT13-057 Rosemon) once every opponent is already suspended.
        if (permanent.isSuspended) continue;
        // A continuous "can't BE suspended" restriction (BT19-101, LM-041) blocks
        // effect-driven suspension only. This primitive IS the effect-suspend seam
        // (combat self-suspend to attack calls access.suspend directly and never routes
        // here — KB BT19-101 Q3185: a "can't be suspended" Digimon may still attack via
        // <Overclock>). Skip the restricted permanent; it stays unsuspended and opens no
        // whenSuspended/OnTappedAnyone window.
        if (continuous.hasRestriction(permanentId, "beSuspended")) continue;
        access.suspend(permanent);
        suspendedPermanentIds.push(permanentId);
      }
    }
    if (opts?.deferTriggers !== true) await fireSuspensionTriggers(suspendedPermanentIds, opts);
    return suspendedPermanentIds;
  }

  /**
   * Pay an activation cost by suspending a permanent (BeforePayCost / activateClass1
   * pattern, HARD-05). Explicit parameters — NEVER reads ctx.source.permanent().
   * Validates the permanent is unsuspended, on the battle area, and affectable.
   */
  const payActivationCost: NonNullable<Primitives["payActivationCost"]> = (
    permanentId: string,
    costKind: "suspend",
  ): boolean => {
    if (costKind !== "suspend") return false;
    const permanent = access.permanentById(permanentId);
    if (permanent === undefined) return false; // not on field
    if (permanent.isSuspended) return false; // already suspended
    if (permanent.inBreeding) return false; // breeding-area permanents can't suspend this way
    if (continuous.hasRestriction(permanentId, "beSuspended")) return false;
    // Check affectability (CanNotBeAffected): gate on beAffected restriction.
    // Unqualified call (no sourceKind): this low-level primitive receives no context
    // about what card is applying the cost, so source-kind-qualified entries (fromSourceKind)
    // do not block here. That is intentional: suspend-as-cost is a controller-side cost
    // verb, not the core opponent-Digimon-effect targeting path.
    if (continuous.hasRestriction(permanentId, "beAffected")) return false;
    access.suspend(permanent);
    return true;
  };

  const unsuspend: Primitives["unsuspend"] = async (permanentIds: string[]): Promise<void> => {
    for (const permanentId of permanentIds) {
      const permanent = access.permanentById(permanentId);
      if (permanent === undefined) continue;
      // Only an actual suspended -> unsuspended TRANSITION counts as "becoming unsuspended"
      // (mirrors `suspend`'s own-transition gate above): unsuspending an already-unsuspended
      // permanent opens no whenUnsuspended window.
      if (!permanent.isSuspended) continue;
      // "Can't unsuspend" is not limited to the Active phase. Effect-driven unsuspension
      // routes through this primitive, so enforce the same continuous restriction here too
      // (Samādhi Śānti and the wider freeze family). Active-phase code keeps its earlier
      // filter to report an accurate list of permanents that changed orientation.
      if (isRestricted(permanentId, "unsuspend")) continue;
      const handTrashCost = continuous.restrictionCount(permanentId, "unsuspendHandTrashCost");
      if (handTrashCost > 0) {
        const hand = player(permanent.controllerSeat).hand;
        if (hand.length < handTrashCost) continue;
        const chosen = await engine.ask.selectInstances(
          permanent.controllerSeat,
          Array.from(hand, (card) => card.instanceId),
          0,
          handTrashCost,
          `Trash ${handTrashCost} card${handTrashCost === 1 ? "" : "s"} from your hand to unsuspend this Digimon?`,
        );
        if (chosen.length !== handTrashCost) continue;
        await trash(chosen);
      }
      access.unsuspend(permanent);
      engine.combat?.resetAttackEligibility?.(permanentId);
      await engine.fireTiming?.(EffectTiming.OnUnTappedAnyone, {
        unsuspendedPermanentId: permanentId,
      });
      // SubTrigger bus: "when [this/a matching] Digimon/Tamer becomes unsuspended" watchers
      // (23-card cluster: BT2-002 etc., EX3-001's "+1000 DP when THIS Digimon unsuspends").
      await engine.fireSubTrigger?.("whenUnsuspended", { unsuspendedPermanentId: permanentId });
    }
  };

  // --- return to hand / deck -------------------------------------------------

  /**
   * Return cards to their owners' hands (source BouncePeremanentAndProcessAccordingToResult
   * for permanents, plus loose-card bounces). A permanent id is not accepted here; pass
   * the permanent's instance ids — if the instance is a permanent's TOP card the whole
   * permanent is bounced (top + stack + linked all return to the owner's hand, the
   * source HandBounce). Returns the instances moved to hand.
   */
  /**
   * Drop the instanceIds whose battle-area permanent a "would leave the battle area"
   * PREVENT reaction saves from a bounce (consulting the same seam as deletion). Loose
   * (non-permanent) instances are never prevented. Default-safe: returns the input set
   * unchanged when no prevent-replacement matches.
   */
  const filterBouncePrevented = async (instanceIds: string[]): Promise<string[]> => {
    const permByInstance = new Map<string, string>();
    for (const owner of state.players) {
      for (const p of owner.battleArea) {
        if (p.topCard !== undefined && instanceIds.includes(p.topCard.instanceId)) {
          permByInstance.set(p.topCard.instanceId, p.permanentId);
        }
      }
    }
    // "Can't be returned to hands or decks" (§15-1-3). Both return verbs funnel through here,
    // so gating once covers hand and deck alike — which is what every printed instance of this
    // protection says ("…to hands or decks"). Applied before the prevent-reaction consult so a
    // prohibited bounce never asks anyone to pay a prevention cost.
    instanceIds = instanceIds.filter((id) => {
      const permId = permByInstance.get(id);
      return permId === undefined || !isRestricted(permId, "beReturned");
    });
    if (!engine.consultLeavePrevention) return instanceIds;
    for (const [instanceId] of [...permByInstance]) {
      if (!instanceIds.includes(instanceId)) permByInstance.delete(instanceId);
    }
    if (permByInstance.size === 0) return instanceIds;
    const prevented = await engine.consultLeavePrevention(
      [...permByInstance.values()],
      "byEffect",
      engine.controllerSeat(),
      { isBounce: true },
    );
    if (prevented.size === 0) return instanceIds;
    return instanceIds.filter((id) => {
      const permId = permByInstance.get(id);
      return permId === undefined || !prevented.has(permId);
    });
  };

  const returnToHand = async (instanceIds: string[], opts?: { silent?: boolean }): Promise<CardInstance[]> => {
    instanceIds = await filterBouncePrevented(instanceIds);
    // Fire `wouldBeReturned` for each battle-area permanent whose top-card is about to land in
    // hand (CAP-C-11). Fires BEFORE the move so a watcher (BT20-074 DNA digivolve) can respond.
    if (engine.fireSubTrigger) {
      for (const instanceId of instanceIds) {
        let foundPermId: string | undefined;
        outer: for (const owner of state.players) {
          for (const perm of owner.battleArea) {
            if (perm.topCard?.instanceId === instanceId) {
              foundPermId = perm.permanentId;
              break outer;
            }
          }
        }
        if (foundPermId !== undefined) {
          await engine.fireSubTrigger("wouldBeReturned", {
            subjectPermanentId: foundPermId,
            returnDestination: "hand",
          });
        }
      }
    }
    // Record which of the requested instances start in TRASH before the move, for
    // whenCardReturnsFromTrashToHand (BT15-082/BT16-011: "a card returns from your trash to
    // your hand") — the move itself is zone-agnostic, so the origin must be captured now.
    const trashOriginIds = new Set<string>();
    for (const owner of state.players) {
      for (const card of owner.trash) {
        if (instanceIds.includes(card.instanceId)) trashOriginIds.add(card.instanceId);
      }
    }
    const moved: CardInstance[] = [];
    const trashedAttachments: CardInstance[] = [];
    for (const instanceId of instanceIds) {
      const collected = collectForReturn(state, instanceId, dropPermanentLedgers);
      if (collected === undefined) continue;
      for (const card of collected) {
        card.faceUp = true;
        if (card.instanceId === instanceId || collected.length === 1) {
          insertCard(player(card.ownerSeat), Zone.Hand, card);
          moved.push(card);
        } else {
          insertCard(player(card.ownerSeat), Zone.Trash, card);
          trashedAttachments.push(card);
        }
      }
    }
    // <Overflow> (CR §4-18): a bounced permanent's top/stack/linked cards just left the
    // field (or left from under it) for hand — a genuine leave, same as deletion.
    applyOverflow(engine.memory, [...moved, ...trashedAttachments], state.turnSeat);
    if (trashedAttachments.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: trashedAttachments.map((card) => card.instanceId),
        from: "battleArea",
        to: Zone.Trash,
      });
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: "various",
        to: Zone.Hand,
      });
      // A card can carry a hand-resident static effect whose eligibility changes at the
      // instant it reaches hand (for example, BT6-105 waives its own color requirement
      // while its controller has a Three Musketeers Digimon). Re-derive the continuous
      // tier before any return-to-hand reactions or the caller's next action inspect the
      // card. Without this boundary recompute, a nested effect such as BT6-112's
      // "return, then use" sees the card in hand but still reads the stale pre-move
      // continuous ledger.
      await engine.recomputeContinuousEffects?.();
      // Returning a card to its owner's hand is an effect-driven hand addition
      // ("when an effect adds cards to your [opponent's] hand"). Fire once per distinct
      // recipient seat; each watcher gates on the seat being its own controller/opponent.
      // `silent` suppresses this for a transient stage-to-hand that is immediately followed
      // by a play/digivolve (RevealAdd `to:play`/`to:digivolve`): the card never settles in
      // the owner's usable hand, so it is not a hand addition the watcher should observe.
      if (opts?.silent !== true) {
        const recipientSeats = new Set(moved.map((c) => c.ownerSeat));
        for (const seat of recipientSeats) {
          await engine.fireSubTrigger?.("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: seat });
          await engine.fireSubTrigger?.("whenEffectAddsToHand", { effectAddedToHandSeat: seat });
        }
        const trashReturned = moved.filter((c) => trashOriginIds.has(c.instanceId));
        if (trashReturned.length > 0) {
          const trashReturnSeats = new Set(trashReturned.map((c) => c.ownerSeat));
          for (const seat of trashReturnSeats) {
            await engine.fireSubTrigger?.("whenCardReturnsFromTrashToHand", {
              returnedFromTrashSeat: seat,
              returnedFromTrashCardIds: trashReturned.filter((c) => c.ownerSeat === seat).map((c) => c.cardId),
            });
          }
        }
      }
    }
    return moved;
  };

  /**
   * Return cards to the top or bottom of their owners' decks (source
   * WhenReturntoLibrary / DeckBottomBounce). `toTop` puts them on top (index 0),
   * otherwise the bottom. As with returnToHand, a permanent's top-card instance
   * bounces the whole permanent. Cards go face-down (deck is hidden). Returns the
   * instances moved.
   */
  const returnToDeck = async (instanceIds: string[], opts?: { toTop?: boolean }): Promise<CardInstance[]> => {
    instanceIds = await filterBouncePrevented(instanceIds);
    const toTop = opts?.toTop ?? false;
    const returnedFromTrashById = new Map<string, Seat>();
    for (const instanceId of instanceIds) {
      if (looseZoneOfInstance(state, instanceId) !== "trash") continue;
      const ownerSeat = ownerSeatOfLoose(state, instanceId);
      if (ownerSeat !== undefined) returnedFromTrashById.set(instanceId, ownerSeat);
    }
    // Fire `wouldBeReturned` for each battle-area permanent whose top-card is about to land in
    // the deck (CAP-C-11). Fires BEFORE the move, consistent with returnToHand.
    if (engine.fireSubTrigger) {
      for (const instanceId of instanceIds) {
        let foundPermId: string | undefined;
        outer: for (const owner of state.players) {
          for (const perm of owner.battleArea) {
            if (perm.topCard?.instanceId === instanceId) {
              foundPermId = perm.permanentId;
              break outer;
            }
          }
        }
        if (foundPermId !== undefined) {
          await engine.fireSubTrigger("wouldBeReturned", {
            subjectPermanentId: foundPermId,
            returnDestination: "deck",
          });
        }
      }
    }
    // Digivolution-stack cards being returned to the deck BOTTOM (toTop === false): record each
    // one's host permanent + cardId BEFORE removal so onDigivolutionCardReturnToDeckBottom can fire
    // for the host's own watcher once the card has landed (BT11-065 "[Vemmon] placed from this
    // Digimon's digivolution cards at the bottom of its owner's deck"). A whole-permanent return
    const stackReturns: { hostPermanentId: string; cardId: string; instanceId: string }[] = [];
    if (!toTop && engine.fireSubTrigger) {
      for (const instanceId of instanceIds) {
        const host = hostOfStackInstance(state, instanceId);
        if (host !== undefined) stackReturns.push({ ...host, instanceId });
      }
    }
    // Collect the entire batch before reinserting any card. Some callers order cards that are
    // already in the destination deck (RevealAdd keeps revealed cards face-up in place); a
    // collect-and-insert loop mutates that deck between removals and can invert the requested
    // order. Batch collection makes the move atomic and exposes no transient zone.
    const collectedBatches: { instanceId: string; cards: CardInstance[] }[] = [];
    for (const instanceId of instanceIds) {
      const collected = collectForReturn(state, instanceId, dropPermanentLedgers);
      if (collected === undefined) continue;
      collectedBatches.push({ instanceId, cards: collected });
    }
    const moved: CardInstance[] = [];
    const trashedAttachments: CardInstance[] = [];
    for (const { instanceId, cards } of collectedBatches) {
      for (const card of cards) {
        if (card.instanceId === instanceId || cards.length === 1) {
          card.faceUp = false;
          const definition = requireCardDefinition(card.cardId);
          const deck = definition.kinds.includes(CardKind.DigiEgg)
            ? player(card.ownerSeat).eggDeck
            : player(card.ownerSeat).deck;
          if (toTop) deck.unshift(card);
          else deck.push(card);
          moved.push(card);
        } else {
          card.faceUp = true;
          insertCard(player(card.ownerSeat), Zone.Trash, card);
          trashedAttachments.push(card);
        }
      }
    }
    // <Overflow> (CR §4-18): same genuine leave as returnToHand, landing in the deck instead.
    applyOverflow(engine.memory, [...moved, ...trashedAttachments], state.turnSeat);
    if (trashedAttachments.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: trashedAttachments.map((card) => card.instanceId),
        from: "battleArea",
        to: Zone.Trash,
      });
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: "various",
        to: Zone.Deck,
      });
      // The whenEffectAddsToHand sibling for deck-bound returns (BT26-015). Fire once per
      // distinct recipient seat, mirroring returnToHand's own-hand fire above.
      const recipientSeats = new Set(moved.map((c) => c.ownerSeat));
      for (const seat of recipientSeats) {
        await engine.fireSubTrigger?.("whenEffectAddsToDeck", { effectAddedToDeckSeat: seat });
      }
    }
    const movedIds = new Set(moved.map((c) => c.instanceId));
    const trashReturnSeats = new Set<Seat>();
    for (const [instanceId, seat] of returnedFromTrashById) {
      if (movedIds.has(instanceId)) trashReturnSeats.add(seat);
    }
    for (const seat of trashReturnSeats) {
      await engine.fireSubTrigger?.("whenCardReturnsFromTrashToDeck", {
        returnedFromTrashToDeckSeat: seat,
      });
    }
    for (const ret of stackReturns) {
      if (!movedIds.has(ret.instanceId)) continue;
      await engine.fireSubTrigger!("onDigivolutionCardReturnToDeckBottom", {
        subjectPermanentId: ret.hostPermanentId,
        returnedToDeckCardId: ret.cardId,
      });
    }
    return moved;
  };

  /** Return loose cards to the bottom of their owners' Digi-Egg decks. */
  const returnToEggDeck = async (instanceIds: string[]): Promise<CardInstance[]> => {
    const moved: CardInstance[] = [];
    for (const instanceId of instanceIds) {
      const collected = collectForReturn(state, instanceId, dropPermanentLedgers);
      if (collected === undefined) continue;
      for (const card of collected) {
        card.faceUp = false;
        insertCard(player(card.ownerSeat), Zone.EggDeck, card, "bottom");
        moved.push(card);
      }
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((card) => card.instanceId),
        from: "various",
        to: Zone.EggDeck,
      });
    }
    return moved;
  };

  // --- reveal / search / add security ---------------------------------------

  /**
   * Reveal the top `n` cards of `seat`'s deck (source reveal flow). Revealing flips
   * the cards face-up in place — they stay on top of the deck, now visible — so a
   * subsequent selectCards/returnToDeck can act on them. Returns the revealed
   * instances (top-first). No player decision: the count is fixed.
   */
  const reveal = async (seat: Seat, n: number): Promise<CardInstance[]> => {
    const p = player(seat);
    const revealed: CardInstance[] = [];
    for (let i = 0; i < n && i < p.deck.length; i++) {
      const card = p.deck[i];
      if (card === undefined) break;
      card.faceUp = true;
      revealed.push(card);
    }
    return revealed;
  };

  /**
   * Search `seat`'s deck for cards matching `filter`, let the controller pick between
   * `min` and `max` of them, add the picked cards to hand, then re-hide the deck and
   * (caller) shuffle (source search-and-add-to-hand selection UI). The picked cards
   * leave the deck for the hand; the rest are turned face-down again. Returns the
   * instances added to hand. Awaits a player decision unless the candidate set is
   * empty or `min === max === candidates.length` (forced).
   */
  const searchDeck = async (
    seat: Seat,
    filter: (def: CardDefinition) => boolean,
    opts?: { min?: number; max?: number },
  ): Promise<CardInstance[]> => {
    const p = player(seat);
    const min = opts?.min ?? 0;
    const max = opts?.max ?? 1;
    const candidates = Array.from(p.deck).filter((c) => filter(requireCardDefinition(c.cardId)));
    if (candidates.length === 0) return [];

    let chosenIds: string[];
    if (min >= candidates.length && max >= candidates.length) {
      chosenIds = candidates.map((c) => c.instanceId); // forced: take all matches
    } else {
      chosenIds = await engine.ask.selectInstances(
        seat,
        candidates.map((c) => c.instanceId),
        min,
        Math.min(max, candidates.length),
        "Search your deck.",
      );
    }

    const added: CardInstance[] = [];
    for (const id of chosenIds) {
      const idx = p.deck.findIndex((c) => c.instanceId === id);
      if (idx < 0) continue;
      const card = extractCardAt(p, Zone.Deck, idx)!;
      card.faceUp = true;
      insertCard(p, Zone.Hand, card);
      added.push(card);
    }
    // Re-hide any cards revealed by the search that remain in the deck.
    for (const card of p.deck) card.faceUp = false;
    if (added.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: added.map((c) => c.instanceId),
        from: Zone.Deck,
        to: Zone.Hand,
      });
    }
    return added;
  };

  /**
   * Add card instances to `seat`'s security stack (source PlaceToSecurityEffect).
   * `toTop` puts them on top (index 0, the "top of security"); otherwise the bottom.
   * Cards go face-down by default (security is hidden); `faceUp` places them FACE UP
   * (BT25-102's "place this card face up as the bottom security card" — revealed to
   * both players but otherwise normal security, re-hidden by a shuffle). The instances
   * must currently be loose (hand/deck/trash) or a bounced permanent's cards; ids not
   * found are skipped. `detachPermanentTop` instead sheds only the named permanent's top
   * card and promotes its top digivolution card, leaving that permanent in play (BT9-044).
   */
  const addSecurity = async (
    seat: Seat,
    instanceIds: string[],
    opts?: { toTop?: boolean; faceUp?: boolean; detachPermanentTop?: boolean },
  ): Promise<void> => {
    if (continuous.cannotAddSecurityFromEffect(effectSeatStack.at(-1))) return;
    // A permanent's top-card id here means the whole permanent is LEAVING the battle
    // area for security — mirrors returnToHand/returnToDeck's leave-prevention consult.
    // filterBouncePrevented only matches battle-area permanent top-cards, so ids sourced
    // from hand/deck/trash (not leaving the battle area) pass through untouched.
    if (opts?.detachPermanentTop !== true) {
      instanceIds = await filterBouncePrevented(instanceIds);
    }
    const p = player(seat);
    const toTop = opts?.toTop ?? false;
    const faceUp = opts?.faceUp ?? false;
    const added: CardInstance[] = [];
    const trashedAttachments: CardInstance[] = [];
    for (const instanceId of instanceIds) {
      if (opts?.detachPermanentTop === true) {
        let permanent: Permanent | undefined;
        for (const owner of state.players) {
          permanent = owner.battleArea.find((candidate) => candidate.topCard?.instanceId === instanceId);
          if (permanent !== undefined) break;
        }
        if (permanent === undefined || permanent.topCard === undefined) continue;
        const promoted = permanent.stack.pop();
        if (promoted === undefined) continue;
        const detached = permanent.topCard;
        permanent.topCard = promoted;
        const promotedDefinition = requireCardDefinition(promoted.cardId);
        permanent.baseDP = promotedDefinition.kinds.includes(CardKind.Digimon) ? promotedDefinition.dp : 0;
        ledger.recomputeDP(state, permanent.permanentId);
        detached.faceUp = faceUp;
        if (toTop) insertCard(p, Zone.Security, detached, "top");
        else insertCard(p, Zone.Security, detached);
        added.push(detached);
        continue;
      }
      const collected = collectForReturn(state, instanceId, dropPermanentLedgers);
      if (collected === undefined) continue;
      for (const card of collected) {
        if (card.instanceId === instanceId || collected.length === 1) {
          card.faceUp = faceUp;
          if (toTop) insertCard(p, Zone.Security, card, "top");
          else insertCard(p, Zone.Security, card);
          added.push(card);
        } else {
          card.faceUp = true;
          insertCard(player(card.ownerSeat), Zone.Trash, card);
          trashedAttachments.push(card);
        }
      }
    }
    // <Overflow> (CR §4-18): a permanent moved to security is the same genuine leave as a
    // hand/deck bounce — security is neither the field nor under a card.
    applyOverflow(engine.memory, [...added, ...trashedAttachments], state.turnSeat);
    if (trashedAttachments.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: trashedAttachments.map((card) => card.instanceId),
        from: "battleArea",
        to: Zone.Trash,
      });
    }
    if (added.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: added.map((c) => c.instanceId),
        from: "various",
        to: Zone.Security,
      });
      // SubTrigger bus: "when cards are added to security" —
      // PlaceToSecurityEffect runs through the same IAddSecurity.AddSecurity seam as ＜Recovery＞.
      // Awaited (not detached `void`) so the watcher body — which may prompt a decision — is
      // sequenced after this add and BEFORE the calling effect continues, matching the
      // onDeletionOf/whenLeavesPlay seam (WR-01); a `void` fire ran the body in a later
      // microtask, interleaving its decisions with subsequent actions of the same effect.
      if (engine.fireSubTrigger) {
        await engine.fireSubTrigger("whenAddSecurity", {
          addedToSecuritySeat: seat,
          addedToSecurityInstanceIds: added.map((c) => c.instanceId),
        });
        // Piggyback whenFaceUpCardsAddedToOpponentSecurity on the same add (EX11-004): this is
        // the only PlaceToSecurityEffect seam that can add FACE-UP (opts.faceUp), unlike
        // ascendToSecurity/recoverToSecurity which always add face-down — so only this site
        // needs the extra fire. The interpreter gate itself filters for actually-face-up cards.
        await engine.fireSubTrigger("whenFaceUpCardsAddedToOpponentSecurity", {
          addedToSecuritySeat: seat,
          addedToSecurityInstanceIds: added.map((c) => c.instanceId),
        });
      }
    }
  };

  // --- continuous / static ---------------------------------------------------

  const restrict = (
    permanentId: string,
    restriction: Parameters<Primitives["restrict"]>[1],
    duration: EffectDuration,
    opts?: { fromSourceKind?: string[]; byOpponentEffectsOnly?: boolean; continuous?: boolean },
  ): void => {
    continuous.addRestriction(permanentId, restriction, durationForTarget(permanentId, duration), {
      ...(opts?.continuous === true ? { continuous: true } : continuousOpt()),
      fromSourceKind: opts?.fromSourceKind,
      byOpponentEffectsOnly: opts?.byOpponentEffectsOnly,
    });
  };

  const restrictPlayer: NonNullable<Primitives["restrictPlayer"]> = (seat, restriction, duration, matches): void => {
    const ownerSeat = effectSeatStack.at(-1) ?? engine.controllerSeat();
    continuous.addPlayerRestriction(seat, ownerSeat, restriction, duration, matches, continuousOpt());
  };

  const restrictAttackTarget = (
    attackerPermanentId: string,
    targetPermanentId: string,
    duration: EffectDuration,
  ): void => {
    continuous.addAttackTargetRestriction(
      attackerPermanentId,
      targetPermanentId,
      durationForTarget(attackerPermanentId, duration),
      continuousOpt(),
    );
  };

  /**
   * Whether the effect currently resolving is controlled by `permanentId`'s OPPONENT —
   * the discriminator a `byOpponentEffectsOnly` restriction keys on. Undefined when the
   * subject is not a battle-area permanent, so the ledger falls back to blocking.
   */
  const isOpponentEffectAgainst = (permanentId: string): boolean | undefined => {
    const perm = access.permanentById(permanentId);
    if (perm === undefined) return undefined;
    // The resolution-owner stack is the accurate resolving seat when an effect pushed one; it
    // beats `controllerSeat()` (the turn seat), which misreads a [Counter] or [Opponent's Turn]
    // effect resolving on the other player's turn as an opponent's effect.
    const resolvingSeat = effectSeatStack.at(-1) ?? engine.controllerSeat();
    return resolvingSeat !== perm.controllerSeat;
  };

  /** `hasRestriction` with the opponent-scope discriminator resolved for `permanentId`. */
  const isRestricted = (permanentId: string, restriction: Restriction): boolean =>
    continuous.hasRestriction(permanentId, restriction, undefined, {
      byOpponentEffect: isOpponentEffectAgainst(permanentId),
    });

  const grantCanAttackUnsuspended: Primitives["grantCanAttackUnsuspended"] = (permanentId, duration, opts) => {
    continuous.grantCanAttackUnsuspended(permanentId, durationForTarget(permanentId, duration), {
      ...continuousOpt(),
      noDigivolutionCards: opts?.noDigivolutionCards,
      defenderLevelMax: opts?.defenderLevelMax,
    });
  };

  const grantVortexCanAttackPlayers = (permanentId: string, duration: EffectDuration): void => {
    // EX11-062's [Your Turn] "while your opponent has no unsuspended Digimon, your ＜Vortex＞ can also
    // attack players": a persistent per-permanent grant re-derived each continuous pass (CR-01). The
    // consume-site (combat/legality.canAttackTarget) widens a ＜Vortex＞-mode player attack to legal
    // while this is active (KB Q5920); it never changes an attack target (KB Q5921).
    continuous.grantVortexCanAttackPlayers(permanentId, durationForTarget(permanentId, duration), continuousOpt());
  };

  const armSuspendRestrictionSource = (permanentId: string, duration: EffectDuration): void => {
    // The armed marker is a one-shot, duration-scoped entry (NOT continuous): it survives the
    // continuous-recompute passes and clears only at its own boundary (UntilOpponentTurnEnd).
    continuous.armSuspendRestrictionSource(permanentId, duration);
  };

  const hasSuspendRestrictionSource = (permanentId: string): boolean =>
    continuous.hasSuspendRestrictionSource(permanentId);

  const isBeAffectedBySourceKind = (permanentId: string, sourceKind: string): boolean =>
    continuous.hasRestriction(permanentId, "beAffected", sourceKind);

  // True when the permanent carries an UNQUALIFIED beAffected restriction (blocks all sources,
  // e.g. GrantImmunity's "not affected by your opponent's effects"; a source-kind-qualified
  // entry like immuneToOpponentOptionEffects is honored only through the kind-specific
  // isBeAffectedBySourceKind path) OR is the current attacker with ＜Progress＞ (Comprehensive
  // Rules §16-39-1: "this Digimon isn't affected by your opponent's effects while attacking" —
  // a persistent effect scoped to its own in-flight attack, §16-39-3). Reusing this seam means
  // ＜Progress＞ needs no separate targeting exclusion: it is excluded from opponent-effect
  // candidate selection exactly like a blanket immunity, only time-boxed to the attack.
  const isUnaffectableByOpponentEffects = (permanentId: string): boolean =>
    continuous.hasRestriction(permanentId, "beAffected") ||
    (continuous.hasKeyword(permanentId, "Progress") && engine.combat?.currentAttackerId === permanentId);

  const restrictDigivolveInto = (
    permanentId: string,
    matchesInto: (def: CardDefinition) => boolean,
    duration: EffectDuration,
  ): void => {
    // A persistent [All Turns] constraint re-derived each continuous pass (CR-01): tag continuous.
    continuous.addDigivolveIntoConstraint(
      permanentId,
      matchesInto,
      durationForTarget(permanentId, duration),
      continuousOpt(),
    );
  };

  const minDpFloor = (permanentId: string, floor: number, duration: EffectDuration): void => {
    // EX11-070's [All Turns] "can't have less than 1000 DP": a persistent floor re-derived each
    // continuous pass (CR-01), applied in the DP-calc layer AFTER all +/- changes (KB Q5941).
    ledger.addMinDpFloor(state, permanentId, floor, durationForTarget(permanentId, duration), continuousOpt());
  };

  const stackTrashLock = (permanentId: string, duration: EffectDuration): void => {
    // EX11-070's [All Turns] "your opponent's effects can't trash this Digimon's stacked cards":
    // a persistent lock re-derived each continuous pass (CR-01), consulted at the digivolution-card
    // trash sites (trashDigivolutionCards / deDigivolve) against the trashing effect's seat.
    continuous.addStackTrashLock(permanentId, durationForTarget(permanentId, duration), continuousOpt());
  };

  const stackCardTrashLock = (instanceId: string, ownerSeat: Seat, duration: EffectDuration): void => {
    continuous.addStackCardTrashLock(instanceId, ownerSeat, duration, continuousOpt());
  };

  const securityAttackInvert = (permanentId: string, duration: EffectDuration): void => {
    // EX6-031's [Your Turn] "Change ＜Security Attack -＞ to ＜Security Attack +＞ on all of your
    // Digimon": a persistent per-permanent sign-inversion re-derived each continuous pass (CR-01).
    // The consume-site (GameEngine.runSecurityCheck.strikeFor) negates each existing SA grant's
    // amount while this is active (per-instance flip, KB Q3752) — never per-permanent value math
    // in a card file.
    continuous.addSecurityAttackInversion(permanentId, durationForTarget(permanentId, duration), continuousOpt());
  };

  const delayedDeletePlayed = (playedPermanentId: string): void => {
    // EX10-035 / P-029 "[End of Your Turn] delete this Digimon": a one-shot `endOfTurn` watcher
    // anchored on the affected permanent, expiring at the owner's turn end. Fired with OnEndTurn while
    // still the owner's frame; gated to the owner's turn + still-on-field.
    const ownerSeat = access.permanentById(playedPermanentId)?.controllerSeat;
    subTriggers.subscribe({
      event: "endOfTurn",
      sourcePermanentId: playedPermanentId,
      once: true,
      ...(ownerSeat !== undefined ? { expiresOnTurnEndOf: ownerSeat } : {}),
      matches: (subCtx) => subCtx.source.isOwnersTurn() && subCtx.source.isOnBattleArea(),
      description: "[End of Your Turn] Delete this Digimon (EX10-035 delayed-delete-played).",
      run: async () => {
        await deletePermanent([playedPermanentId], "byEffect");
      },
    });
  };

  const delayedGainMemory = (seat: Seat, amount: number): void => {
    // BT1-021 "at the end of your turn, lose 3 memory": a one-shot `endOfTurn` watcher with
    // NO source anchor — per KB Q882/Q883 the delayed loss still fires if the installing
    // Digimon left the field first (the effect "has already activated"), so it must not be
    // dropped by the anchor teardown. `expiresOnTurnEndOf` still bounds it to this turn end.
    subTriggers.subscribe({
      event: "endOfTurn",
      once: true,
      expiresOnTurnEndOf: seat,
      description: `At end of turn, ${amount >= 0 ? "gain" : "lose"} ${Math.abs(amount)} memory (delayed one-shot).`,
      run: async () => {
        engine.memory.addMemoryForSeat(seat, amount, "gainMemory", { isTamerEffect: false });
      },
    });
  };

  const endAttack: Primitives["endAttack"] = () => {
    engine.combat?.endAttack();
  };

  const grantNameTrait = (
    permanentId: string,
    kind: "name" | "trait",
    tokens: string[],
    duration: EffectDuration,
    opts?: { digiXrosOnly?: boolean },
  ): void => {
    continuous.addNameTraitGrant(permanentId, kind, tokens, durationForTarget(permanentId, duration), {
      ...continuousOpt(),
      ...opts,
    });
  };

  const setOriginalCardInfo: Primitives["setOriginalCardInfo"] = (permanentId, info, duration): void => {
    continuous.addOriginalCardInfoOverride(
      permanentId,
      info,
      durationForTarget(permanentId, duration),
      continuousOpt(),
    );
  };

  const grantKeyword: Primitives["grantKeyword"] = (permanentId, keyword, duration, amount, opts): void => {
    // A duration-scoped keyword is a one-shot grant even if its async target selection
    // happens to overlap a continuous recompute. `continuousMode` is engine-global, so
    // blindly inheriting it here can misclassify the tail of a triggered effect and make
    // the next recompute erase the grant (Bifrost followed by another Option). Genuine
    // continuous auras pass opts.continuous explicitly; only permanent intrinsic/static
    // grants need the legacy mode inference.
    const provenance = {
      sourceCardId: opts?.sourceCardId,
      sourceEffectText: opts?.sourceEffectText,
    };
    const continuousOpts =
      opts?.continuous === true
        ? { continuous: true, active: opts.active, specifiers: opts.specifiers, ...provenance }
        : duration === EffectDuration.Permanent
          ? { ...continuousOpt(), active: opts?.active, specifiers: opts?.specifiers, ...provenance }
          : opts?.active
            ? { active: opts.active, specifiers: opts.specifiers, ...provenance }
            : opts?.specifiers
              ? { specifiers: opts.specifiers, ...provenance }
              : opts?.sourceCardId !== undefined
                ? provenance
                : undefined;
    continuous.addKeywordGrant(permanentId, keyword, durationForTarget(permanentId, duration), amount, continuousOpts);
  };

  const grantDnaLevel: Primitives["grantDnaLevel"] = (permanentId, level, opts): void => {
    continuous.addDnaLevelOverride(permanentId, level, {
      intoNames: opts?.intoNames,
      continuous: opts?.continuous === true || continuousOpt()?.continuous === true,
    });
  };

  const canDnaDigivolve: NonNullable<Primitives["canDnaDigivolve"]> = (
    materialPermanentIds,
    resultInstanceId,
  ): boolean => {
    const result = peekLooseInstance(state, resultInstanceId);
    if (result === undefined) return false;
    const into = requireCardDefinition(result.cardId);
    const materials = materialPermanentIds
      .map((id) => access.permanentById(id))
      .filter((permanent): permanent is Permanent => permanent?.topCard !== undefined);
    if (materials.length !== materialPermanentIds.length || materials.length < 2) return false;
    if (
      into.level === 7 &&
      materials.some((material) => continuous.hasRestriction(material.permanentId, "digivolveToLevel7"))
    ) {
      return false;
    }
    const definitions = materials.map((material) => {
      const printed = requireCardDefinition(material.topCard!.cardId);
      const effectiveLevel = continuous.dnaLevelFor(material.permanentId, into);
      return effectiveLevel === undefined ? printed : { ...printed, level: effectiveLevel };
    });
    return dnaDigivolveCostFor(into, definitions) !== undefined;
  };

  const grantedKeywords = (permanentId: string): { keyword: string; amount?: number }[] =>
    continuous.grantedKeywords(permanentId);

  const grantPlayerKeyword: Primitives["grantPlayerKeyword"] = (seat, keyword, duration, amount): void => {
    continuous.addPlayerKeywordGrant(seat, keyword, duration, amount);
  };

  const revokeKeyword = (permanentId: string, keyword: string): void => {
    continuous.removeKeywordGrant(permanentId, keyword);
  };

  const grantLinkMax: Primitives["grantLinkMax"] = (permanentId, delta, duration, opts): void => {
    continuous.addLinkMaxGrant(
      permanentId,
      delta,
      durationForTarget(permanentId, duration),
      opts?.continuous === true ? { continuous: true } : continuousOpt(),
    );
  };

  const grantLinkCostReduction = (
    permanentId: string,
    amount: number,
    traits: string[],
    duration: EffectDuration,
  ): void => {
    continuous.addLinkCostReductionGrant(
      permanentId,
      amount,
      traits,
      durationForTarget(permanentId, duration),
      continuousOpt(),
    );
  };

  const cannotIgnoreDigivolution = (seat: Seat, duration: EffectDuration): void => {
    continuous.addCannotIgnoreDigivolution(seat, duration, continuousOpt());
  };

  const isDigivolutionRequirementIgnoreBlocked = (seat: Seat): boolean => continuous.cannotIgnoreDigivolution(seat);

  const addColorGrant = (permanentId: string, color: CardColor, duration: EffectDuration): void => {
    continuous.addColorGrant(permanentId, color, durationForTarget(permanentId, duration), continuousOpt());
  };

  const grantKind: NonNullable<Primitives["grantKind"]> = (
    permanentId: string,
    kinds: CardKind[],
    duration: EffectDuration,
  ): void => {
    continuous.addKindGrant(permanentId, kinds, durationForTarget(permanentId, duration), continuousOpt());
  };

  const waiveColorRequirement = (instanceId: string, duration: EffectDuration): void => {
    continuous.addColorWaiver(instanceId, duration, continuousOpt());
  };

  const conferStackEffects = (targetPermanentId: string, stackInstanceId: string, _duration: EffectDuration): void => {
    continuous.conferStackEffects(targetPermanentId, stackInstanceId, continuousOpt());
  };

  // A named custom effect grant is a one-shot, DURATION-scoped grant (NOT continuous): it is
  // installed once when the granting effect resolves and survives the continuous recompute, so
  // it is recorded WITHOUT continuousOpt(). It lapses at its boundary (sweep) or when the host
  // permanent leaves the field (dropForPermanent).
  const grantCustomEffect = (instanceId: string, ownerSeat: Seat, token: string, duration: EffectDuration): void => {
    continuous.addCustomEffectGrant(instanceId, ownerSeat, token, duration);
  };

  // Generic custom-grant store: the interpreter's catch-all for GrantStatic actions whose
  // `grant` shape has no dedicated primitive (object-shaped grants like BT11-062's
  // `cannotLeavePlay` or BT16-055's `Protection`, and unrecognized string grants like
  // `quotedEffect`/`attackImmunity`), plus BT7-055's hand-authored unsuspend-cost. Recorded
  // per permanentId so a call is honest, inspectable authored state instead of the prior
  // silent no-op (the method was declared on Primitives but never assigned here, so every
  // `ctx.fx.grantCustom?.()` call was swallowed by the optional-call idiom). NO CONSUMER
  // reads this store back yet: the grant kinds it captures remain behaviorally inert until a
  // subsystem is built per grant kind, matching how `continuous.ts`'s own restriction store
  // documents unread entries as "documented TODOs where not yet wired" rather than crashes.
  const customGrants = new Map<string, { grant: Record<string, unknown>; duration: EffectDuration }[]>();
  const grantCustom: NonNullable<Primitives["grantCustom"]> = (permanentId, grant, duration) => {
    const existing = customGrants.get(permanentId);
    if (existing) existing.push({ grant, duration });
    else customGrants.set(permanentId, [{ grant, duration }]);
  };

  // --- security-stack manipulation -------------------------------------------

  /**
   * Shuffle `seat`'s security stack in place (source ShuffleSecurity). A
   * Fisher–Yates shuffle over the ArraySchema; the deck/security RNG seam is the
   * engine's (this uses Math.random, sufficient for the server-authoritative shuffle
   * until a seeded RNG is injected). Security cards stay face-down.
   */
  const shuffleSecurity = (seat: Seat): void => {
    const stack = player(seat).security;
    for (let i = stack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = stack[i]!;
      const b = stack[j]!;
      stack[i] = b;
      stack[j] = a;
    }
    // Shuffling re-hides every security card: a card turned face-up by an effect is
    // face-down again once the stack is shuffled (KB EX11-064 Q5929-5931, BT25-102).
    for (const card of stack) card.faceUp = false;
  };

  const revealCard = (seat: Seat, cardId: string, sourceCardId?: string): void => {
    engine.emit({ kind: "cardRevealed", seat, cardId, ...(sourceCardId !== undefined ? { sourceCardId } : {}) });
  };

  /**
   * Move `n` of `seat`'s security cards to its owner's hand (source
   * SecurityToHand / "add your top security card to the hand"). `fromTop` (default)
   * takes from index 0; otherwise the bottom. `instanceIds` selects exact cards from
   * the security stack for "look at your security stack, add 1" effects. Cards become
   * face-up in hand.
   */
  const securityToHand = async (
    seat: Seat,
    n: number,
    opts?: { fromTop?: boolean; instanceIds?: string[] },
  ): Promise<CardInstance[]> => {
    const p = player(seat);
    const fromTop = opts?.fromTop ?? true;
    const moved: CardInstance[] = [];
    if (opts?.instanceIds !== undefined) {
      const requested = new Set(opts.instanceIds.slice(0, n));
      for (let i = p.security.length - 1; i >= 0; i--) {
        const card = p.security[i];
        if (card === undefined || !requested.has(card.instanceId)) continue;
        extractCardAt(p, Zone.Security, i);
        card.faceUp = true;
        insertCard(p, Zone.Hand, card);
        moved.push(card);
      }
    } else {
      for (let i = 0; i < n; i++) {
        const card = fromTop ? takeTop(p, Zone.Security) : takeBottom(p, Zone.Security);
        if (card === undefined) break;
        card.faceUp = true;
        insertCard(p, Zone.Hand, card);
        moved.push(card);
      }
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: Zone.Security,
        to: Zone.Hand,
      });
      // A card added from security to hand still left the security stack. Publish the
      // same generic removal event used by checks and effect-driven trash so watchers
      // such as BT4-097 react to every printed form of security removal (KB Q1250).
      await engine.fireSubTrigger?.("whenSecurityRemoved", { removedFromSecuritySeat: seat });
    }
    return moved;
  };

  /**
   * ＜Recovery +N (Deck)＞: move the top `n` cards of `seat`'s deck onto the TOP of its
   * security stack, face-down (source Recovery keyword). The deck top becomes the
   * new security top. Stops at an empty deck. Security has no universal maximum;
   * card-specific ceilings such as EX2-018 Q3304 are enforced by that card's effect.
   * Returns the cards moved.
   */
  const recoverToSecurity = async (seat: Seat, n: number): Promise<CardInstance[]> => {
    if (continuous.cannotAddSecurityFromEffect(effectSeatStack.at(-1))) return [];
    const p = player(seat);
    const moved: CardInstance[] = [];
    // There is no universal security-stack maximum. Individual cards that say
    // they cannot raise security above a threshold enforce that condition locally.
    for (let i = 0; i < n; i++) {
      const card = takeTop(p, Zone.Deck);
      if (card === undefined) break;
      card.faceUp = false;
      insertCard(p, Zone.Security, card, "top");
      moved.push(card);
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: Zone.Deck,
        to: Zone.Security,
      });
      // Narrate Recovery without revealing the face-down cards' identities. The
      // synchronized state remains authoritative; this event exists so clients can
      // explain the otherwise easy-to-miss increase in the security stack.
      engine.emit({ kind: "securityRecovered", seat, amount: moved.length });
      // SubTrigger bus: "when cards are added to security" watchers (documented behavior EffectTiming.OnAddSecurity,
      // documented behavior IAddSecurity.AddSecurity). Fired once per add operation, mirroring the
      // source single StackSkillInfos(OnAddSecurity) call — the counterpart to whenSecurityRemoved.
      // Awaited (not detached `void`) so a watcher body's decisions/mutations are sequenced after
      // this add and before the calling effect continues, matching the onDeletionOf seam (WR-01).
      if (engine.fireSubTrigger)
        await engine.fireSubTrigger("whenAddSecurity", {
          addedToSecuritySeat: seat,
          addedToSecurityInstanceIds: moved.map((c) => c.instanceId),
        });
    }
    return moved;
  };

  /**
   * Flip `seat`'s top FACE-UP security card face down (source the `SetReverse()`
   * loop in the "by flipping your top face-up security card face down" cost). Scans
   * from the top of the stack and flips the first face-up card; returns true when a
   * card was flipped (false when there was no face-up security card to flip). Used by
   * the flipSecurity prevention cost (BT23-043, EX11-031).
   */
  const flipTopSecurity = (seat: Seat): boolean => {
    const stack = player(seat).security;
    for (const card of stack) {
      if (card.faceUp) {
        card.faceUp = false;
        engine.emit({
          kind: "cardsMoved",
          instanceIds: [card.instanceId],
          from: Zone.Security,
          to: Zone.Security,
        });
        return true;
      }
    }
    return false;
  };

  /**
   * Flip `seat`'s top FACE-DOWN security card FACE UP (source the
   * `new IFlipSecurity(source).FlipFaceUp()` over the first non-flipped security card,
   * EX11-064). Scans from the top of the stack and flips the first face-down card; the
   * card stays in security but is now revealed (the visibility layer encodes a face-up
   * security card to both players). Returns true when a card was flipped, false when
   * there was no face-down security card. `fromTop` (default) scans from index 0.
   */
  const flipSecurityFaceUp = (seat: Seat, opts?: { fromTop?: boolean }): boolean => {
    const stack = player(seat).security;
    const fromTop = opts?.fromTop ?? true;
    const order = fromTop ? [...stack.keys()] : [...stack.keys()].reverse();
    for (const i of order) {
      const card = stack[i]!;
      if (!card.faceUp) {
        card.faceUp = true;
        engine.emit({
          kind: "cardsMoved",
          instanceIds: [card.instanceId],
          from: Zone.Security,
          to: Zone.Security,
        });
        return true;
      }
    }
    return false;
  };

  // --- combat ----------------------------------------------------------------

  /**
   * Effect-driven attack: make `attackerPermanentId` attack. Asks the attacker's
   * controller to pick the attack target — the opponent player, or one of the
   * opponent's SUSPENDED battle-area Digimon (Comprehensive Rules §11-2-7-1) — then
   * runs the full combat lifecycle. The seatless decision picks among an "opponent
   * player" sentinel and the eligible suspended Digimon. A no-op when the combat port
   * is absent, the attacker is gone, or an attack is already mid-resolution (the
   * engine does not nest combat).
   *
   * When the attacker carries an active "can also attack unsuspended Digimon" grant
   * (`grantCanAttackUnsuspended` — e.g. ＜Execute＞'s own "this effect also allows for
   * attacking an opponent's unsuspended Digimon", CR §16-38-1), the opponent's UNSUSPENDED
   * battle-area Digimon widen the candidate set too, narrowed to "no digivolution cards"
   * when every active grant restricts it that way — mirroring combat/legality.ts's
   * canAttackTarget so an effect-driven attack offers exactly the targets a player-declared
   * one would accept.
   */
  const forceAttack = async (
    attackerPermanentId: string,
    opts?: {
      withoutSuspending?: boolean;
      attackPlayer?: boolean;
      afterAttackTriggers?: () => Promise<void>;
      drainTimingWindow?: () => Promise<void>;
    },
  ): Promise<void> => {
    const combat = engine.combat;
    if (combat === undefined) return; // no combat port (test engine): narrate nothing
    if (combat.isAttacking) return; // do not nest an effect-driven attack inside another
    const attacker = access.permanentById(attackerPermanentId);
    if (attacker === undefined) return;
    const controllerSeat = attacker.controllerSeat;
    if (canAttackerDeclare(access, controllerSeat, attacker, continuous, false, opts?.withoutSuspending) !== null) {
      return;
    }
    const opponentSeat = access.opponentOf(controllerSeat);

    // Reuse declared-attack target legality so forced attacks cannot offer a
    // protected defender, an unsuspended defender without a matching grant, or a
    // player forbidden by the effect/restriction (BT9-100, KB Q1904/Q1905).
    const PLAYER = "player";
    const playerTarget: AttackTarget = { kind: "player" };
    const legalEnemyIds = access
      .battleAreaPermanents(opponentSeat)
      .filter(
        (permanent) =>
          canAttackTarget(
            access,
            controllerSeat,
            attacker,
            { kind: "permanent", permanentId: permanent.permanentId },
            continuous,
          ) === null,
      )
      .map((permanent) => permanent.permanentId);
    const candidates = [
      ...(opts?.attackPlayer !== false &&
      canAttackTarget(access, controllerSeat, attacker, playerTarget, continuous) === null
        ? [PLAYER]
        : []),
      ...legalEnemyIds,
    ];
    const chosen = await engine.ask.selectInstances(
      controllerSeat,
      candidates,
      1,
      1,
      "Choose the attack target for the forced attack.",
    );
    if (candidates.length === 0) return;
    const pick = chosen[0] ?? candidates[0]!;
    const target: AttackTarget = pick === PLAYER ? { kind: "player" } : { kind: "permanent", permanentId: pick };

    await combat.resolveAttack(controllerSeat, attacker, target, {
      withoutTap: opts?.withoutSuspending ?? false,
      afterAttackTriggers: opts?.afterAttackTriggers,
      drainTimingWindow: opts?.drainTimingWindow,
    });
  };

  const isAttackResolving = (): boolean => engine.combat?.isAttacking === true;

  /**
   * Redirect the currently-resolving attack onto one of `candidatePermanentIds`
   * (chosen by the source's controller). A no-op when no attack is open or no
   * candidate resolves. The candidate ids are battle-area permanents the redirect
   * filter resolved (the interpreter supplies them); the controller picks one.
   */
  const redirectAttack: Primitives["redirectAttack"] = async (candidatePermanentIds, opts) => {
    const combat = engine.combat;
    if (combat === undefined || !combat.isAttacking) return;
    const candidates = candidatePermanentIds.filter((id) => access.permanentById(id) !== undefined);
    if (candidates.length === 0) return;
    // The chooser is the source's controller by default; BT4-075 passes the opponent seat so
    // the DEFENDING player picks among their own unsuspended Digimon. When `optional`, the
    // chooser may decline (min 0) and the attack proceeds unchanged.
    const chooserSeat = opts?.chooserSeat ?? engine.controllerSeat();
    const optional = opts?.optional ?? false;
    let chosen: string[];
    if (candidates.length === 1 && !optional) {
      chosen = candidates;
    } else {
      chosen = await engine.ask.selectInstances(
        chooserSeat,
        candidates,
        optional ? 0 : 1,
        1,
        "Choose the new target of the attack.",
      );
    }
    const pick = chosen[0];
    if (pick === undefined) return; // declined (or no pick): attack proceeds unchanged
    const attackerId = combat.currentAttackerId;
    combat.redirectTarget({ kind: "permanent", permanentId: pick });
    // The attack target was just switched — notify reactive watchers ("when this Digimon's
    // attack target is switched", BT11-008). The attacker is the event subject; a watcher's
    // sourceFilter isSelfRef gates it to its own attack.
    if (attackerId !== undefined) {
      await engine.fireSubTrigger?.("whenAttackTargetSwitched", { subjectPermanentId: attackerId });
    }
  };

  // --- sub-trigger / delayed / replacement -----------------------------------

  // Stamp the `continuous` flag while re-firing persistent effects (exactly like the modifier /
  // continuous ledgers via continuousOpt) so the recompute's clearContinuous can drop and
  // re-derive these subscriptions without accumulation. A one-shot install from a triggered
  // window (OnPlay/WhenDigivolving — e.g. BT23-056's granted timed trigger) carries no flag and
  // is therefore preserved across recomputes.
  const subscribeSubTrigger: Primitives["subscribeSubTrigger"] = (sub) =>
    // A scheduled one-shot consequence belongs to the triggered resolution that armed
    // it. Never inherit the engine-global continuous flag merely because its async
    // installation overlaps a recompute; otherwise a subsequent digivolution clears it
    // before its boundary fires (P-030/Q4141).
    subTriggers.subscribe({ ...sub, ...(sub.once ? {} : continuousOpt()) });

  const subscribeReplacement: Primitives["subscribeReplacement"] = (sub) =>
    subTriggers.subscribeReplacement({ ...sub, ...continuousOpt() });

  const playToken = async (
    seat: Seat,
    tokenName: string,
    opts?: { payCost?: boolean; suspended?: boolean },
  ): Promise<Permanent | undefined> => {
    const cardId = resolveTokenCardId(tokenName);
    if (cardId === undefined) return undefined;
    const def = requireCardDefinition(cardId);
    const pay = opts?.payCost !== false;
    const cost = pay ? normalizeCost(def.playCost) : 0;
    if (cost > 0 && engine.memory.maxCostFor(seat) < cost) return undefined;
    if (cost > 0) engine.memory.pay(seat, cost);

    const instance = new CardInstance();
    instance.instanceId = engine.nextInstanceId?.() ?? `inst-${Date.now()}`;
    instance.cardId = cardId;
    instance.ownerSeat = seat;
    instance.faceUp = true;

    const owner = player(seat);
    const permanent = placePermanent(engine, owner, instance, def, opts?.suspended ?? false);
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [instance.instanceId],
      from: Zone.Deck,
      to: Zone.BattleArea,
    });
    // Fire the token's own [On Play] — it was played, not merely placed
    // (CAP-H5-05). Uses `enteredByEffect` so a by-effect gate fires
    // correctly (BT25-084).
    if (def.kinds.includes(CardKind.Digimon)) {
      await engine.fireEnteredByEffect?.(EffectTiming.OnPlay, instance.instanceId, seat);
    }
    // An EFFECT just played this token — fire the whenPlayed bus (mirrors playInstances'
    // seam) so a "when you play a [name]" / "when an effect plays a Digimon" watcher sees it
    // (KB Q3664/Q3665). A caller that plays SEVERAL same-named tokens in one resolving effect
    // (e.g. BT2-053 Keramon's [When Digivolving] playing 2 [Diaboromon] Tokens) makes one
    // `playToken` call per token; each call's fire shares the ambient resolving-effect
    // `windowToken` (see GameEngine's `beginResolvingWindow`/`fireSubTrigger`), so an
    // `oncePerTiming` watcher dedupes across them (KB Q2814) instead of firing per token.
    await engine.fireSubTrigger?.("whenPlayed", {
      subjectPermanentId: permanent.permanentId,
      playedByEffect: true,
      ...(def.level !== undefined ? { playedLevel: def.level } : {}),
      ...(def.playCost !== undefined ? { playedPlayCost: def.playCost } : {}),
    });
    return permanent;
  };

  const modifySecurityDp: Primitives["modifySecurityDp"] = (seat, delta, opts): void => {
    engine.securityDp?.add(seat, delta, {
      continuous: opts?.continuous === true || engine.inContinuousPass?.() === true,
      duration: opts?.duration,
    });
  };

  const forceBattle = async (attackerPermanentId: string, defenderPermanentId: string): Promise<void> => {
    // Direct §14 battle: compare DP via the shared resolver and delete the loser(s) through
    // the deletion primitive (so On Deletion / WhenPermanentWouldBeDeleted fire). No attack
    // declaration / block / security — and no effect-immunity check (a battle is a rule).
    const attacker = access.permanentById(attackerPermanentId);
    const defender = access.permanentById(defenderPermanentId);
    if (attacker === undefined || defender === undefined) return;
    const outcome = resolvePermanentBattle({
      attackerPermanentId,
      attackerDP: attacker.currentDP,
      defenderPermanentId,
      defenderDP: defender.currentDP,
    });
    if (outcome.deletedPermanentIds.length > 0) await deletePermanent(outcome.deletedPermanentIds);
    engine.emit({
      kind: "combatResolved",
      seat: attacker.controllerSeat,
      attackerPermanentId,
      deletedPermanentIds: outcome.deletedPermanentIds,
    });
  };

  const addDeletionMaxDp = (target: { seat: Seat } | { permanentId: string }, delta: number): void => {
    if ("permanentId" in target) engine.deletionMaxDp?.addSelf(target.permanentId, delta);
    else engine.deletionMaxDp?.addOwnerWide(target.seat, delta);
  };

  const deletionMaxDpBonus = (seat: Seat, sourcePermanentId?: string): number =>
    engine.deletionMaxDp?.bonusFor(seat, sourcePermanentId) ?? 0;

  const addDpDeleteBudget: NonNullable<Primitives["addDpDeleteBudget"]> = (permanentId, amount) => {
    engine.dpDeleteBudget?.add(permanentId, amount);
  };

  const dpDeleteBudgetBonus: NonNullable<Primitives["dpDeleteBudgetBonus"]> = (permanentId) =>
    engine.dpDeleteBudget?.bonusFor(permanentId) ?? 0;

  return {
    draw,
    gainMemory,
    gainMemoryForSeat,
    restrictMemoryGain,
    restrictCostReduction,
    restrictUnsuspendedDigivolve,
    restrictPlay,
    isPlayProhibited,
    disableSecurityEffect,
    disableSecurityEffectsForSeat,
    disableTimingEffect,
    isTimingEffectDisabled,
    declareWinner,
    setMemory,
    setTurnEndMinMemory: (seat: Seat, minimum: number) => engine.memory.setTurnEndMinMemory?.(seat, minimum),
    modifyDP,
    setBaseDP,
    playFromHand,
    playFromSecurity,
    playInstances,
    placeOptionAsPermanent,
    digivolveFromInstance,
    dnaDigivolveInto,
    canDnaDigivolve,
    appFuseInto,
    deDigivolve,
    placeUnder,
    placeOwnTopAtStackBottom,
    relocatePermanent,
    relocatePermanentByEffect,
    movePermanentZone,
    hatch,
    placeUnderFromEggDeck,
    placeAsTopFromEggDeck,
    link,
    trash,
    trashDigivolutionCards,
    canTrashDigivolutionCard,
    redirectDigivolutionTrashHosts,
    armorPurge,
    ascendToSecurity,
    materialSave,
    fireOptionUsed,
    fireOnDiscardLibrary,
    fireWhenTrashedFromDeck,
    useOptionFromHand,
    resolveCardEffect,
    trashFromSecurity,
    trashTopSecurityOfPlayerWithMostSecurity,
    deletePermanent,
    suspend,
    fireSuspensionTriggers,
    payActivationCost,
    reactivateOnPlay,
    unsuspend,
    returnToHand,
    returnToDeck,
    returnToEggDeck,
    reveal,
    searchDeck,
    addSecurity,
    enterEffectResolution,
    leaveEffectResolution,
    restrictSecurityAddsFromEffect,
    grantPierce,
    changeEvoCost,
    changePlayCost,
    restrict,
    restrictPlayer,
    restrictAttackTarget,
    grantNameTrait,
    setOriginalCardInfo,
    grantKeyword,
    grantDnaLevel,
    grantPlayerKeyword,
    grantedKeywords,
    revokeKeyword,
    grantLinkMax,
    grantLinkCostReduction,
    cannotIgnoreDigivolution,
    isDigivolutionRequirementIgnoreBlocked,
    addColorGrant,
    grantKind,
    waiveColorRequirement,
    conferStackEffects,
    grantCustomEffect,
    grantCustom,
    shuffleSecurity,
    revealCard,
    securityToHand,
    recoverToSecurity,
    flipTopSecurity,
    flipSecurityFaceUp,
    forceAttack,
    isAttackResolving,
    redirectAttack,
    grantCanAttackUnsuspended,
    grantVortexCanAttackPlayers,
    armSuspendRestrictionSource,
    hasSuspendRestrictionSource,
    isBeAffectedBySourceKind,
    isUnaffectableByOpponentEffects,
    restrictDigivolveInto,
    minDpFloor,
    stackTrashLock,
    stackCardTrashLock,
    securityAttackInvert,
    delayedDeletePlayed,
    delayedGainMemory,
    endAttack,
    subscribeSubTrigger,
    subscribeReplacement,
    expandDigiXrosZones,
    digiXrosExpandedZones,
    playToken,
    modifySecurityDp,
    addDeletionMaxDp,
    deletionMaxDpBonus,
    addDpDeleteBudget,
    dpDeleteBudgetBonus,
    forceBattle,
  };
}

// --- pure helpers ------------------------------------------------------------

/** -1 sentinel (no play cost) is paid as 0 (source HasPlayCost). */
function normalizeCost(playCost: number): number {
  return playCost < 0 ? 0 : playCost;
}

/** A Digimon, Tamer, or DigiEgg is a field permanent kind (source IsPermanent). */
function isPermanentKind(definition: CardDefinition): boolean {
  return (
    definition.kinds.includes(CardKind.Digimon) ||
    definition.kinds.includes(CardKind.Tamer) ||
    definition.kinds.includes(CardKind.DigiEgg)
  );
}

/**
 * Create a new battle-area Permanent for `instance` and append it to `owner`'s battle
 * area. DP is seeded from the definition for Digimon (0 otherwise). Mirrors the
 * placement half of rule implementation (and matches the play-card action's placePermanent
 * so the two cannot diverge).
 */
function placePermanent(
  engine: PrimitivesEngine,
  owner: PlayerState,
  instance: CardInstance,
  definition: CardDefinition,
  suspended: boolean,
): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = engine.nextPermanentId();
  permanent.controllerSeat = owner.seat;
  permanent.topCard = instance;
  permanent.stack = new ArraySchema<CardInstance>();
  permanent.linked = new ArraySchema<CardInstance>();
  const dp = definition.kinds.includes(CardKind.Digimon) ? definition.dp : 0;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  permanent.isSuspended = suspended;
  permanent.inBreeding = false;
  permanent.enterFieldTurnCount = engine.state.turnCount;
  appendPermanent(owner, permanent);
  return permanent;
}

interface LocatedInZone {
  owner: PlayerState;
  index: number;
}

/** Find a card instance in any player's hand. */
function locateInHand(state: GameState, instanceId: string): LocatedInZone | undefined {
  for (const owner of state.players) {
    const index = owner.hand.findIndex((c) => c.instanceId === instanceId);
    if (index >= 0) return { owner, index };
  }
  return undefined;
}

/** Find a card instance in any player's security stack. */
function locateInSecurity(state: GameState, instanceId: string): LocatedInZone | undefined {
  for (const owner of state.players) {
    const index = owner.security.findIndex((c) => c.instanceId === instanceId);
    if (index >= 0) return { owner, index };
  }
  return undefined;
}

/**
 * Remove a "loose" card instance (in hand, security, deck, trash, or as a permanent's
 * digivolution-stack / linked card — NOT a permanent's top card) from wherever it
 * sits and return it. Returns undefined when not found or when the instance is a
 * permanent's top card (those move only via delete/bounce of the whole permanent).
 *
 * `includeTrash` (default true) lets effects pull a card OUT of the trash ("play 1 [X]
 * from your trash"). The one verb that must NOT pull from trash is `trash` itself (it
 * moves cards INTO trash), so it passes `false`; every other caller wants the full set.
 */
function removeLooseInstance(state: GameState, instanceId: string, includeTrash = true): CardInstance | undefined {
  for (const owner of state.players) {
    // See the matching note in peekLooseInstance: a resolving Option's own effect is allowed
    // to move it out of the transient `resolvingOption` slot into a real area (§9-1-5's
    // placement exception). Checked first so it takes priority over the (impossible, since
    // it isn't in trash yet) trash lookup below.
    if (owner.resolvingOption?.instanceId === instanceId) {
      const card = owner.resolvingOption;
      owner.resolvingOption = undefined;
      return card;
    }
    const fromHand = spliceById(owner.hand, instanceId);
    if (fromHand) return fromHand;
    const fromSecurity = spliceById(owner.security, instanceId);
    if (fromSecurity) return fromSecurity;
    const fromDeck = spliceById(owner.deck, instanceId);
    if (fromDeck) return fromDeck;
    if (includeTrash) {
      const fromTrash = spliceById(owner.trash, instanceId);
      if (fromTrash) return fromTrash;
    }
    for (const permanent of owner.battleArea) {
      const fromStack = spliceById(permanent.stack, instanceId);
      if (fromStack) return fromStack;
      const fromLinked = spliceById(permanent.linked, instanceId);
      if (fromLinked) return fromLinked;
    }
    if (owner.breeding !== undefined) {
      const fromStack = spliceById(owner.breeding.stack, instanceId);
      if (fromStack) return fromStack;
      const fromLinked = spliceById(owner.breeding.linked, instanceId);
      if (fromLinked) return fromLinked;
    }
  }
  return undefined;
}

/**
 * Read a "loose" card instance (in hand, security, deck, trash, or as a permanent's
 * digivolution-stack / linked card — NOT a permanent's top card) WITHOUT removing it.
 * Used to inspect a card's definition (kind/cost) before deciding to play it.
 */
function peekLooseInstance(state: GameState, instanceId: string): CardInstance | undefined {
  for (const owner of state.players) {
    // §9-1-4/9-1-5: an Option resolving its own [Main] effect is held on `resolvingOption`
    // (no zone array) rather than pre-trashed. Its own effect can still relocate it into a
    // real area during that resolution — §9-1-5's "unless it is considered to be placed in
    // an area" clause is exactly this: PlaceInBattleAreaSelf (BT18-100 option permanents),
    // PlayWithoutCost, and self-referencing SecurityManipulation (P-181) all resolve by
    // finding and moving "this card" through these loose-instance helpers.
    if (owner.resolvingOption?.instanceId === instanceId) return owner.resolvingOption;
    for (const list of [owner.hand, owner.security, owner.deck, owner.trash]) {
      const found = list.find((c) => c.instanceId === instanceId);
      if (found) return found;
    }
    for (const permanent of owner.battleArea) {
      const inStack = permanent.stack.find((c) => c.instanceId === instanceId);
      if (inStack) return inStack;
      const inLinked = permanent.linked.find((c) => c.instanceId === instanceId);
      if (inLinked) return inLinked;
    }
    if (owner.breeding !== undefined) {
      const inStack = owner.breeding.stack.find((c) => c.instanceId === instanceId);
      if (inStack) return inStack;
    }
  }
  return undefined;
}

/** The loose zone that currently contains `instanceId`, if it is in a zone we can name. */
function looseZoneOfInstance(state: GameState, instanceId: string): ZoneRef | undefined {
  for (const owner of state.players) {
    if (owner.hand.some((c) => c.instanceId === instanceId)) return "hand";
    if (owner.security.some((c) => c.instanceId === instanceId)) return "security";
    if (owner.deck.some((c) => c.instanceId === instanceId)) return "deck";
    if (owner.trash.some((c) => c.instanceId === instanceId)) return "trash";
    for (const permanent of owner.battleArea) {
      if (permanent.stack.some((c) => c.instanceId === instanceId)) return "digivolutionCards";
      if (permanent.linked.some((c) => c.instanceId === instanceId)) return undefined;
    }
    if (owner.breeding !== undefined && owner.breeding.stack.some((c) => c.instanceId === instanceId)) {
      return "digivolutionCards";
    }
  }
  return undefined;
}

/** The owner seat of a loose instance (where it currently sits), or undefined. */
function ownerSeatOfLoose(state: GameState, instanceId: string): Seat | undefined {
  return peekLooseInstance(state, instanceId)?.ownerSeat;
}

/**
 * If `instanceId` currently sits as a LINK card (in some permanent's `linked` list — battle
 * area or the breeding slot, per Comprehensive Rules §3-4-4 "the field is divided into the
 * breeding area and the battle area"), return that host permanent's id; otherwise undefined.
 * Read by the `trash` verb to fire whenLinkTrashed only for a genuine link-card trash (a
 * digivolution-stack card or a loose hand/trash card yields undefined).
 */
function hostOfLinkedInstance(state: GameState, instanceId: string): string | undefined {
  for (const owner of state.players) {
    for (const permanent of owner.battleArea) {
      if (permanent.linked.some((c) => c.instanceId === instanceId)) return permanent.permanentId;
    }
    if (owner.breeding?.linked.some((c) => c.instanceId === instanceId) === true) {
      return owner.breeding.permanentId;
    }
  }
  return undefined;
}

/**
 * The field permanent (battle area or breeding slot — §3-4-4) whose DIGIVOLUTION STACK
 * contains `instanceId` (its host), with the stacked card's cardId — used to fire
 * onDigivolutionCardReturnToDeckBottom for the host's watcher. Only a stack card (not a top
 * card) qualifies; undefined when the instance is elsewhere.
 */
function hostOfStackInstance(
  state: GameState,
  instanceId: string,
): { hostPermanentId: string; cardId: string } | undefined {
  for (const owner of state.players) {
    for (const permanent of owner.battleArea) {
      const card = permanent.stack.find((c) => c.instanceId === instanceId);
      if (card !== undefined) return { hostPermanentId: permanent.permanentId, cardId: card.cardId };
    }
    if (owner.breeding !== undefined) {
      const card = owner.breeding.stack.find((c) => c.instanceId === instanceId);
      if (card !== undefined) return { hostPermanentId: owner.breeding.permanentId, cardId: card.cardId };
    }
  }
  return undefined;
}

/**
 * The memory cost by which `evolving` may digivolve onto a base card `base`, per the
 * printed EvoCost requirement (base includes the required color and is at most the
 * required level). Returns the matching entry's memoryCost, or undefined when no
 * printed requirement is satisfied.
 *
 * Delegates to the single shared `cardData.matchingEvoCost` so the color+level test —
 * including the Q4242 level-less-base rejection — has ONE source of truth across the
 * effect-driven digivolve path here and the player-action digivolve path in cardData.
 * `cardData` is the engine's pure static-data window (no digivolve-subsystem dependency).
 */
function matchingDigivolveCost(evolving: CardDefinition, base: CardDefinition): number | undefined {
  return matchingEvoCost(evolving, base)?.memoryCost;
}

/**
 * The DNA-digivolve memory cost for `evolving` given a candidate `materials` set: the printed
 * DNA-digivolve requirement when the card prints one. The best (lowest) printed single-base
 * digivolve cost is only a legacy fallback for cards lacking structured DNA requirements
 * (mirrors `dnaDigivolveInto`'s own cost-choice at apply time — factored out so
 * `actions/dnaDigivolve.ts`'s synchronous affordability check cannot drift from apply).
 * Undefined when no legal path matches.
 */
export function dnaDigivolveCostFor(evolving: CardDefinition, materials: CardDefinition[]): number | undefined {
  const requirements = dnaDigivolutionRequirementsFor(evolving.cardId);
  if (requirements.length > 0) return matchingDnaDigivolveCost(evolving, materials);
  let best: number | undefined;
  for (const material of materials) {
    const c = matchingDigivolveCost(evolving, material);
    if (c !== undefined && (best === undefined || c < best)) best = c;
  }
  return best;
}

function matchingDnaDigivolveCost(evolving: CardDefinition, materials: CardDefinition[]): number | undefined {
  const requirements = dnaDigivolutionRequirementsFor(evolving.cardId);
  let best: number | undefined;
  for (const req of requirements) {
    if (req.materials.length === 0) continue;
    if (!dnaRequirementMatches(req.materials, materials)) continue;
    if (best === undefined || req.cost < best) best = req.cost;
  }
  return best;
}

// `ir.ts` is deliberately schema-free (no enum imports), so `DnaDigivolveRequirement.materials`
// encodes color as a plain string literal union rather than the `CardColor` enum this module
// otherwise uses. The two share runtime values (CardColor is string-valued), so the comparison
// in `dnaMaterialSpecMatches` casts at the boundary rather than coupling ir.ts to the schema.
function dnaRequirementMatches(
  specs: { color?: string; level?: number; names?: string[]; traits?: string[] }[],
  materials: CardDefinition[],
): boolean {
  const used = new Set<number>();
  const visit = (specIndex: number): boolean => {
    if (specIndex >= specs.length) return true;
    const spec = specs[specIndex]!;
    for (let i = 0; i < materials.length; i++) {
      if (used.has(i)) continue;
      if (!dnaMaterialSpecMatches(spec, materials[i]!)) continue;
      used.add(i);
      if (visit(specIndex + 1)) return true;
      used.delete(i);
    }
    return false;
  };
  return visit(0);
}

function dnaMaterialSpecMatches(
  spec: { color?: string; level?: number; names?: string[]; traits?: string[] },
  material: CardDefinition,
): boolean {
  if (spec.color !== undefined && !material.colors.includes(spec.color as CardColor)) return false;
  if (spec.level !== undefined && material.level !== spec.level) return false;
  if (spec.names && spec.names.length > 0) {
    const name = material.nameEn ?? material.cardId;
    if (!spec.names.some((token) => name.includes(token))) return false;
  }
  if (spec.traits && spec.traits.length > 0) {
    if (!spec.traits.some((trait) => (material.types ?? []).includes(trait))) return false;
  }
  return true;
}

/**
 * Collect the card instances to move when `instanceId` is "returned" (to hand, deck,
 * or security). If the id is a loose card, that single card. If it is a permanent's
 * TOP card, the whole permanent (top + stack + linked) is taken off the field and its
 * cards are returned (source bounce of a permanent returns the stack with it).
 * Removes the cards from their current location. Returns undefined when not found.
 *
 * A bounce of a permanent is a TRUE leave-the-battle-area: the source `permanentId`
 * ceases to exist (its cards move to hand/deck/security; a re-play makes a NEW id), so
 * its modifier + continuous + subTrigger ledgers must drop — the same WR-02 teardown
 * every other leave seam (delete, DNA-consume, relocate, toBreeding) performs. The
 * teardown is co-located with the removal via `onPermanentRemoved` rather than
 * resolved separately in each caller: hand-rolling the drop per site is exactly how
 * the subTrigger drop drifted out of the relocate/toBreeding seams (see the
 * `dropPermanentLedgers` note above). Loose-card returns leave no battle-area
 * permanent, so the callback is not invoked for them.
 */
function collectForReturn(
  state: GameState,
  instanceId: string,
  onPermanentRemoved?: (permanentId: string) => void,
): CardInstance[] | undefined {
  // Top card of a permanent => take the whole permanent.
  for (const owner of state.players) {
    const index = owner.battleArea.findIndex((p) => p.topCard !== undefined && p.topCard.instanceId === instanceId);
    if (index >= 0) {
      const permanent = extractPermanentAt(owner, index)!;
      onPermanentRemoved?.(permanent.permanentId);
      return [...permanent.stack, ...(permanent.topCard ? [permanent.topCard] : []), ...permanent.linked];
    }
    if (owner.breeding !== undefined && owner.breeding.topCard?.instanceId === instanceId) {
      const permanent = owner.breeding;
      owner.breeding = undefined;
      onPermanentRemoved?.(permanent.permanentId);
      return [...permanent.stack, ...(permanent.topCard ? [permanent.topCard] : []), ...permanent.linked];
    }
  }
  // Otherwise a loose card (hand/security/deck/trash/under-a-permanent): no battle-area
  // permanent left play, so no ledger teardown — `onPermanentRemoved` is not called.
  const loose = removeLooseInstance(state, instanceId);
  return loose ? [loose] : undefined;
}

/** Splice the first element with `instanceId` out of an array-like, returning it. */
function spliceById(
  list: { findIndex(p: (c: CardInstance) => boolean): number; splice(i: number, n: number): CardInstance[] },
  instanceId: string,
): CardInstance | undefined {
  const index = list.findIndex((c) => c.instanceId === instanceId);
  if (index < 0) return undefined;
  return list.splice(index, 1)[0];
}
