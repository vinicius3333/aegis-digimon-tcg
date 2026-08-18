import {
  EffectTiming,
  requireCardDefinition,
  type CardDefinition,
  type CardInstance,
  type DisableTiming,
  type GameState,
  type Permanent,
  type PlayerState,
  type Seat,
} from "@aegis/shared";
import { createCardSource, type CardStateLookup } from "../cards/CardSource.js";
import type { CardSource } from "./CardSource.js";
import type { Effect } from "./Effect.js";
import {
  collectTriggeredEffects,
  collectConferredEffects,
  collectGrantedCustomEffects,
  type CollectedEffect,
} from "./collect.js";
import { grantedTokenEffectsForTiming } from "./interpreter.js";
import { UseTracker } from "./kernel.js";
import { linkMax } from "./mindLink.js";
import { findPermanentInState } from "../state/access.js";
import type { ContinuousEffectLedger } from "./continuous.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives, TriggerInfo } from "./EffectContext.js";

/**
 * Does this permanent carry `instanceId` anywhere — as its top card, in its
 * digivolution stack, or among its linked cards? Mirrors what the source
 * `CardSource.PermanentOfThisCard()` resolves over (top + stack + linked).
 */
function permanentHolds(permanent: Permanent, instanceId: string): boolean {
  if (permanent.topCard !== undefined && permanent.topCard.instanceId === instanceId) {
    return true;
  }
  for (const card of permanent.stack) {
    if (card.instanceId === instanceId) return true;
  }
  for (const card of permanent.linked) {
    if (card.instanceId === instanceId) return true;
  }
  return false;
}

/**
 * The live-state lookup a CardSource needs (engine/cards/CardSource.ts), bound to
 * an authoritative GameState. Resolves where a card instance currently sits (its
 * permanent, whether that permanent is in a battle area) and whose turn it is.
 *
 * This is the seam the read-only card-data-model depends on instead of reaching
 * into GameState directly (card-module contract): the framework owns it.
 */
export function createCardStateLookup(state: GameState): CardStateLookup {
  const findPermanent = (
    instanceId: string,
  ): { permanent: Permanent; inBattleArea: boolean; inBreedingArea: boolean } | undefined => {
    for (const p of state.players) {
      for (const permanent of p.battleArea) {
        if (permanentHolds(permanent, instanceId)) {
          // A permanent can be flagged inBreeding while listed in battleArea (a moved-back
          // permanent); treat it as breeding-area, not battle-area, to match source.
          return {
            permanent,
            inBattleArea: !permanent.inBreeding,
            inBreedingArea: permanent.inBreeding,
          };
        }
      }
      if (p.breeding !== undefined && permanentHolds(p.breeding, instanceId)) {
        return { permanent: p.breeding, inBattleArea: false, inBreedingArea: true };
      }
    }
    return undefined;
  };

  const isInTrash = (instanceId: string): boolean =>
    state.players.some((p) => p.trash.some((c) => c.instanceId === instanceId));

  const isInHand = (instanceId: string): boolean =>
    state.players.some((p) => p.hand.some((c) => c.instanceId === instanceId));

  const isInSecurity = (instanceId: string): boolean =>
    state.players.some((p) => p.security.some((c) => c.instanceId === instanceId && c.faceUp));

  return {
    permanentOf: (instanceId: string): Permanent | undefined => findPermanent(instanceId)?.permanent,
    isOnBattleArea: (instanceId: string): boolean => findPermanent(instanceId)?.inBattleArea ?? false,
    isOnBreedingArea: (instanceId: string): boolean => findPermanent(instanceId)?.inBreedingArea ?? false,
    isInTrash,
    isInHand,
    isInSecurity,
    isSeatsTurn: (seat: Seat): boolean => state.turnSeat === seat,
  };
}

/**
 * Concrete plumbing that binds the effect-framework runtime context to the
 * authoritative GameState. The `EffectContext` interface (EffectContext.ts) is the
 * contract card modules are written against (card-module contract); this is
 * its implementation seam.
 *
 * What lives here (this subsystem, effect-framework):
 *   - `createGameAccess`: a complete, read-only GameAccess over GameState.
 *   - `createEffectContext`: assembles an EffectContext from its parts.
 *
 * What is supplied by OTHER subsystems and injected in:
 *   - `Primitives` (fx) -> effect-primitives subsystem.
 *   - `DecisionApi` (ask) -> effect-stack-resolution subsystem.
 * Until those land, `unimplementedPrimitives` / `unimplementedDecisions` give a
 * context whose verbs throw a clear error, so an un-implemented primitive fails loudly
 * inside a card's resolve() instead of silently doing nothing.
 */

/**
 * Read-only access to authoritative state for effect guards and bodies. Pure: it
 * only reads `state`; it never mutates. Mutation is the job of Primitives (fx).
 */
export function createGameAccess(
  state: GameState,
  linkMaxDelta?: (permanentId: string) => number,
  linkCostReduction?: (recipientId: string, cardTraits: readonly string[]) => number,
  hasKeyword?: (permanentId: string, keyword: string) => boolean,
  digivolvedThisTurn?: (seat: Seat) => boolean,
  isTimingEffectDisabled?: (permanentId: string, timing: "whenDigivolving" | "whenAttacking" | "onPlay") => boolean,
  effectiveColors?: (permanent: Permanent) => import("@aegis/shared").CardColor[],
  colorRequirementWaived?: (instanceId: string) => boolean,
): GameAccess {
  const player = (seat: Seat): PlayerState => {
    const p = state.players[seat];
    if (p === undefined) throw new Error(`No player seated at ${seat}`);
    return p;
  };

  const permanentById = (permanentId: string): Permanent | undefined => findPermanentInState(state, permanentId);

  return {
    state,
    player,
    opponentOf: (seat: Seat): Seat => (seat === 0 ? 1 : 0),
    permanentById,
    definitionOf: (card: CardInstance): CardDefinition => requireCardDefinition(card.cardId),
    // Base 1 + Σ active <Link +N>. When no ledger resolver is supplied (guard-only
    linkMax: (permanent: Permanent): number => linkMax(permanent, { linkMaxDelta: linkMaxDelta ?? (() => 0) }),
    // Recipient-scoped link-cost reduction. When no ledger
    // resolver is supplied (guard-only contexts) the reduction is 0, leaving the base link cost.
    linkCostReduction: (recipientId: string, cardTraits: readonly string[]): number =>
      (linkCostReduction ?? (() => 0))(recipientId, cardTraits),
    hasKeyword: (permanentId: string, keyword: string): boolean => (hasKeyword ?? (() => false))(permanentId, keyword),
    digivolvedThisTurn: (seat: Seat): boolean => (digivolvedThisTurn ?? (() => false))(seat),
    isTimingEffectDisabled: (permanentId, timing): boolean =>
      (isTimingEffectDisabled ?? (() => false))(permanentId, timing),
    effectiveColors: (permanent): import("@aegis/shared").CardColor[] =>
      (effectiveColors ?? ((p) => (p.topCard === undefined ? [] : requireCardDefinition(p.topCard.cardId).colors)))(
        permanent,
      ),
    colorRequirementWaived: (instanceId): boolean => (colorRequirementWaived ?? (() => false))(instanceId),
  };
}

/** Assemble the runtime EffectContext handed to canTrigger/canActivate/resolve. */
export function createEffectContext(parts: {
  source: CardSource;
  trigger: TriggerInfo;
  game: GameAccess;
  fx: Primitives;
  ask: DecisionApi;
  usage?: UseTracker;
  activeTiming?: string;
  activeEffectText?: string;
  conferredToPermanentId?: string;
}): EffectContext {
  return {
    source: parts.source,
    trigger: parts.trigger,
    game: parts.game,
    fx: parts.fx,
    ask: parts.ask,
    usage: parts.usage,
    activeTiming: parts.activeTiming,
    activeEffectText: parts.activeEffectText,
    conferredToPermanentId: parts.conferredToPermanentId,
  };
}

const refuse = (subsystem: string, verb: string): never => {
  throw new Error(
    `${subsystem} not implemented: ${verb}. This verb is owned by the ${subsystem} subsystem (see historical migration ledger).`,
  );
};

/**
 * A Primitives whose every verb throws. Used for guard evaluation and tests that
 * need a complete EffectContext without a live engine; a card that reaches an
 * un-implemented verb fails loudly. Production always injects the real
 * `createPrimitives(engine)` from `engine/effects/primitives.ts`.
 */
export function unimplementedPrimitives(): Primitives {
  return {
    draw: () => refuse("effect-primitives", "draw"),
    gainMemory: () => refuse("effect-primitives", "gainMemory"),
    gainMemoryForSeat: () => refuse("effect-primitives", "gainMemoryForSeat"),
    restrictMemoryGain: () => refuse("static-continuous-effects", "restrictMemoryGain"),
    restrictCostReduction: () => refuse("static-continuous-effects", "restrictCostReduction"),
    restrictUnsuspendedDigivolve: () => refuse("static-continuous-effects", "restrictUnsuspendedDigivolve"),
    restrictPlay: () => refuse("static-continuous-effects", "restrictPlay"),
    disableSecurityEffect: () => refuse("static-continuous-effects", "disableSecurityEffect"),
    disableSecurityEffectsForSeat: () => refuse("static-continuous-effects", "disableSecurityEffectsForSeat"),
    disableTimingEffect: () => refuse("static-continuous-effects", "disableTimingEffect"),
    declareWinner: () => refuse("effect-primitives", "declareWinner"),
    setMemory: () => refuse("effect-primitives", "setMemory"),
    modifyDP: () => refuse("effect-primitives", "modifyDP"),
    setBaseDP: () => refuse("static-continuous-effects", "setBaseDP"),
    playFromHand: () => refuse("effect-primitives", "playFromHand"),
    playFromSecurity: () => refuse("effect-primitives", "playFromSecurity"),
    playInstances: () => refuse("effect-primitives", "playInstances"),
    placeOptionAsPermanent: () => refuse("effect-primitives", "placeOptionAsPermanent"),
    digivolveFromInstance: () => refuse("effect-primitives", "digivolveFromInstance"),
    dnaDigivolveInto: () => refuse("effect-primitives", "dnaDigivolveInto"),
    appFuseInto: () => refuse("effect-primitives", "appFuseInto"),
    deDigivolve: () => refuse("effect-primitives", "deDigivolve"),
    placeUnder: () => refuse("effect-primitives", "placeUnder"),
    placeOwnTopAtStackBottom: () => refuse("effect-primitives", "placeOwnTopAtStackBottom"),
    relocatePermanent: () => refuse("effect-primitives", "relocatePermanent"),
    movePermanentZone: () => refuse("effect-primitives", "movePermanentZone"),
    hatch: () => refuse("effect-primitives", "hatch"),
    placeUnderFromEggDeck: () => refuse("effect-primitives", "placeUnderFromEggDeck"),
    placeAsTopFromEggDeck: () => refuse("effect-primitives", "placeAsTopFromEggDeck"),
    link: () => refuse("effect-primitives", "link"),
    trash: () => refuse("effect-primitives", "trash"),
    trashDigivolutionCards: () => refuse("effect-primitives", "trashDigivolutionCards"),
    redirectDigivolutionTrashHosts: () => refuse("effect-primitives", "redirectDigivolutionTrashHosts"),
    armorPurge: () => refuse("effect-primitives", "armorPurge"),
    ascendToSecurity: () => refuse("effect-primitives", "ascendToSecurity"),
    materialSave: () => refuse("effect-primitives", "materialSave"),
    fireOptionUsed: () => refuse("effect-primitives", "fireOptionUsed"),
    fireOnDiscardLibrary: () => refuse("effect-primitives", "fireOnDiscardLibrary"),
    fireWhenTrashedFromDeck: () => refuse("effect-primitives", "fireWhenTrashedFromDeck"),
    useOptionFromHand: () => refuse("effect-primitives", "useOptionFromHand"),
    resolveCardEffect: () => refuse("effect-primitives", "resolveCardEffect"),
    trashFromSecurity: () => refuse("effect-primitives", "trashFromSecurity"),
    trashTopSecurityOfPlayerWithMostSecurity: () =>
      refuse("effect-primitives", "trashTopSecurityOfPlayerWithMostSecurity"),
    deletePermanent: () => refuse("effect-primitives", "deletePermanent"),
    suspend: () => refuse("effect-primitives", "suspend"),
    unsuspend: () => refuse("effect-primitives", "unsuspend"),
    returnToHand: () => refuse("effect-primitives", "returnToHand"),
    returnToDeck: () => refuse("effect-primitives", "returnToDeck"),
    reveal: () => refuse("effect-primitives", "reveal"),
    searchDeck: () => refuse("effect-primitives", "searchDeck"),
    addSecurity: () => refuse("effect-primitives", "addSecurity"),
    grantPierce: () => refuse("effect-primitives", "grantPierce"),
    changeEvoCost: () => refuse("effect-primitives", "changeEvoCost"),
    changePlayCost: () => refuse("static-continuous-effects", "changePlayCost"),
    restrict: () => refuse("static-continuous-effects", "restrict"),
    restrictAttackTarget: () => refuse("static-continuous-effects", "restrictAttackTarget"),
    grantNameTrait: () => refuse("static-continuous-effects", "grantNameTrait"),
    setOriginalCardInfo: () => refuse("static-continuous-effects", "setOriginalCardInfo"),
    grantKeyword: () => refuse("static-continuous-effects", "grantKeyword"),
    grantDnaLevel: () => refuse("static-continuous-effects", "grantDnaLevel"),
    grantPlayerKeyword: () => refuse("static-continuous-effects", "grantPlayerKeyword"),
    grantedKeywords: () => [],
    grantLinkMax: () => refuse("static-continuous-effects", "grantLinkMax"),
    grantLinkCostReduction: () => refuse("static-continuous-effects", "grantLinkCostReduction"),
    cannotIgnoreDigivolution: () => refuse("static-continuous-effects", "cannotIgnoreDigivolution"),
    addColorGrant: () => refuse("static-continuous-effects", "addColorGrant"),
    waiveColorRequirement: () => refuse("static-continuous-effects", "waiveColorRequirement"),
    conferStackEffects: () => refuse("static-continuous-effects", "conferStackEffects"),
    shuffleSecurity: () => refuse("effect-primitives", "shuffleSecurity"),
    revealCard: () => refuse("effect-primitives", "revealCard"),
    securityToHand: () => refuse("effect-primitives", "securityToHand"),
    recoverToSecurity: () => refuse("effect-primitives", "recoverToSecurity"),
    flipTopSecurity: () => refuse("effect-primitives", "flipTopSecurity"),
    flipSecurityFaceUp: () => refuse("effect-primitives", "flipSecurityFaceUp"),
    forceAttack: () => refuse("attack-and-block", "forceAttack"),
    redirectAttack: () => refuse("attack-and-block", "redirectAttack"),
    grantCanAttackUnsuspended: () => refuse("attack-and-block", "grantCanAttackUnsuspended"),
    endAttack: () => refuse("attack-and-block", "endAttack"),
    subscribeSubTrigger: () => refuse("delayed-and-rule-effects", "subscribeSubTrigger"),
    subscribeReplacement: () => refuse("delayed-and-rule-effects", "subscribeReplacement"),
    playToken: () => refuse("effect-primitives", "playToken"),
    modifySecurityDp: () => refuse("effect-primitives", "modifySecurityDp"),
  };
}

/**
 * A DecisionApi whose every call throws. Used for guard evaluation and tests that
 * need a complete EffectContext without a live decision manager. Production always
 * injects the real `createDecisionApi` from `engine/decisions/decisionApi.ts`.
 */
export function unimplementedDecisions(): DecisionApi {
  return {
    optional: () => refuse("effect-stack-resolution", "ask.optional"),
    chooseTargets: () => refuse("effect-stack-resolution", "ask.chooseTargets"),
    selectCards: () => refuse("effect-stack-resolution", "ask.selectCards"),
    selectPermanents: () => refuse("effect-stack-resolution", "ask.selectPermanents"),
    chooseOption: () => refuse("effect-stack-resolution", "ask.chooseOption"),
  };
}

/**
 * Everything the framework needs to evaluate effects against a live match: the
 * authoritative state plus the verbs/decision API the resolver will inject (from
 * the effect-primitives and effect-stack-resolution subsystems).
 */
export interface EffectEnvironment {
  state: GameState;
  fx: Primitives;
  ask: DecisionApi;
  /** Per-turn use ledger for maxPerTurn accounting (engine-owned, reset each turn). */
  tracker: UseTracker;
  /** Continuous rules including stack-effect conferrals. */
  continuous: ContinuousEffectLedger;
  hasKeyword?: (permanentId: string, keyword: string) => boolean;
  digivolvedThisTurn?: (seat: Seat) => boolean;
  effectiveColors?: (permanent: Permanent) => import("@aegis/shared").CardColor[];
  colorRequirementWaived?: (instanceId: string) => boolean;
  /** Trigger payload for the active timing window. */
  triggerInfo?: TriggerInfo;
}

/**
 * The full instance -> CardSource -> EffectContext -> collection chain, ready for
 * the engine. Given the match environment, a firing `timing`, and the candidate
 * card instances that could contribute at that timing, return the effects that
 * actually TRIGGER (kernel canTrigger applied), each paired with its source.
 *
 * This is the single entry point the effect-stack-resolution subsystem builds its
 * ordered, interruptible resolution loop on top of (it then orders the result,
 * prompts for optionals, and awaits resolve). It mutates nothing itself.
 */
export function gatherTriggeredEffects(
  env: EffectEnvironment,
  timing: EffectTiming,
  candidateInstances: readonly CardInstance[],
  grantSnapshot?: {
    stackEffectConferrals: readonly { targetPermanentId: string; stackInstanceId: string }[];
    customEffectGrants: readonly { instanceId: string; token: string }[];
  },
): CollectedEffect[] {
  const game = createGameAccess(
    env.state,
    (id) => env.continuous.linkMaxDelta(id),
    (id, traits) => env.continuous.linkCostReduction(id, traits),
    env.hasKeyword,
    env.digivolvedThisTurn,
    undefined,
    env.effectiveColors,
    env.colorRequirementWaived,
  );
  const lookup = createCardStateLookup(env.state);

  const sources: CardSource[] = candidateInstances.map((instance) => createCardSource(instance, lookup));

  const makeContext = (source: CardSource, effect: Effect, conferredToPermanentId?: string): EffectContext =>
    createEffectContext({
      source,
      trigger: env.triggerInfo ?? {},
      game,
      fx: env.fx,
      ask: env.ask,
      usage: env.tracker,
      activeTiming: EffectTiming[timing],
      activeEffectText: effect.description,
      conferredToPermanentId,
    });

  const base = collectTriggeredEffects(timing, sources, (s, e) => makeContext(s, e), env.tracker);

  const instanceById = (id: string): CardSource | undefined => {
    for (const inst of candidateInstances) {
      if (inst.instanceId === id) return createCardSource(inst, lookup);
    }
    return undefined;
  };

  const conferred = collectConferredEffects(
    timing,
    grantSnapshot?.stackEffectConferrals ?? env.continuous.listStackEffectConferrals(),
    instanceById,
    (s, e, permanentId) => makeContext(s, e, permanentId),
    env.tracker,
  );

  // Named custom effect grants (GrantStatic grant:"effects" with tokens — RB1-030's granted
  // "[On Deletion] Delete the lowest-level opponent Digimon"). Compile each grant's token to the
  // engine Effects it contributes at this timing, anchored on the GRANTED card's instance (found
  // among the candidate instances — battle area AND trash, so a granted [On Deletion] is collected
  // from trash on the grantee's own deletion, exactly like a printed one), and collect those that
  // trigger. Resolution then runs through the same stack at the same window (OnDestroyedAnyone).
  const granted = collectGrantedCustomEffects(
    timing,
    grantSnapshot?.customEffectGrants ?? env.continuous.listCustomEffectGrants(),
    instanceById,
    (token, source) => grantedTokenEffectsForTiming(token, timing, source),
    (source, effect) => makeContext(source, effect),
    env.tracker,
  );

  return applyTimingEffectDisable(env, timing, [...base, ...conferred, ...granted]);
}

/**
 * The maskable timing windows, mapping each engine EffectTiming to its DisableTiming mask.
 * Timings absent here are never suppressed by a DisableTimingEffect (the lookup returns
 * undefined and the consume site is a no-op). OnUseAttack is the engine home of the
 * [When Attacking] trigger; OnPlay of [On Play]; WhenDigivolving of [When Digivolving].
 */
const TIMING_DISABLE_MASK: Partial<Record<EffectTiming, DisableTiming>> = {
  [EffectTiming.WhenDigivolving]: "whenDigivolving",
  [EffectTiming.OnUseAttack]: "whenAttacking",
  [EffectTiming.OnPlay]: "onPlay",
};

/**
 * Timing-effect disable consume site (the timing half of the source rule implementation
 * split). When the firing `timing` maps to a maskable window ([When Digivolving] /
 * [When Attacking] / [On Play]), drop any collected effect whose SOURCE permanent is
 * timing-disabled for that window — unless the source permanent carries the `beAffected`
 * O(active-disables): the disable lookup short-circuits once the timing is non-maskable.
 */
function applyTimingEffectDisable(
  env: EffectEnvironment,
  timing: EffectTiming,
  collected: CollectedEffect[],
): CollectedEffect[] {
  const mask = TIMING_DISABLE_MASK[timing];
  if (mask === undefined) return collected;
  return collected.filter((c) => {
    const permanent = c.source.permanent();
    if (permanent === undefined) return true;
    // `cannotActivateWhenDigivolving` restriction (BT19-038 KB Q5541–Q5545): the targeted
    // permanent cannot activate any [When Digivolving] effects while this restriction is active.
    // Checked before the isTimingEffectDisabled path; no beAffected bypass per the KB ruling.
    if (
      timing === EffectTiming.WhenDigivolving &&
      env.continuous.hasRestriction(permanent.permanentId, "cannotActivateWhenDigivolving")
    ) {
      return false;
    }
    if (!env.continuous.isTimingEffectDisabled(permanent.permanentId, mask)) return true;
    // Effect-immunity bypass: an immune source's timing effect still fires.
    // Unqualified call (no sourceKind): we are checking the SOURCE permanent's own
    // immunity, not filtering an incoming opponent effect by source kind. Any beAffected
    // entry on this permanent — qualified or not — grants the bypass, because the bypass
    // applies to the timing-disable suppressor's action, not to a specific card kind.
    return env.continuous.hasRestriction(permanent.permanentId, "beAffected");
  });
}
