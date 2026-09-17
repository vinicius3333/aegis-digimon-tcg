import { isTimingActivationDisabled } from "../effects/timingActivation.js";
import { Zone, type CardInstance, type ServerEvent, type Seat } from "@aegis/shared";
import { canAttackerDeclare } from "../combat/legality.js";
import { resolveKeywords } from "../combat/keywords.js";
import { effectiveKinds, effectiveNames, effectiveTraits } from "../effects/continuous.js";
import { createGameAccess, createCardStateLookup, createEffectContext } from "../effects/context.js";
import { createCardSource } from "../cards/CardSource.js";
import { type EffectEnvironment } from "../effects/index.js";
import type { CardSource } from "../effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi, TriggerInfo } from "../effects/EffectContext.js";
import type { GameEngine } from "../GameEngine.js";

export function effectAccess(engine: GameEngine): GameAccess {
  engine.gameAccess ??= createGameAccess(
    engine.state,
    (id) => engine.continuous.linkMaxDelta(id),
    (id, traits) => engine.continuous.linkCostReduction(id, traits),
    (id, keyword) => {
      const permanent = engine.access.permanentById(id);
      return (
        (permanent !== undefined && resolveKeywords(permanent, engine.continuous).includes(keyword)) ||
        (keyword.toLowerCase() === "piercing" && engine.modifiers.hasPierce(id))
      );
    },
    (seat) => engine.tracker.count(`seat:${seat}`, "digivolvedThisTurn") > 0,
    (permanentId, timing) => isTimingActivationDisabled(engine.continuous, permanentId, timing),
    (permanent) => engine.effectiveColorsOf(permanent),
    (instanceId) => engine.continuous.hasColorWaiver(instanceId),
    (instanceId) => engine.continuous.colorRequirementAlternatives(instanceId),
    (permanent) => canAttackerDeclare(engine.access, permanent.controllerSeat, permanent, engine.continuous) === null,
    (permanentId, printedTraits) => effectiveTraits(engine.continuous, permanentId, printedTraits),
    (permanentId, printedKinds) => effectiveKinds(engine.continuous, permanentId, printedKinds),
    (seat, base, evolving, sourceZone) =>
      engine.digivolveSupport.matchBaseGrantedDigivolve(seat, base, evolving, sourceZone),
    undefined,
    (id, traits) =>
      engine.continuous.linkCostReductionGrant(
        id,
        traits,
        (key) => engine.tracker.count(`link-cost/${key}`, "replacement") > 0,
      ),
    (permanent, printedName) => effectiveNames(engine.continuous, permanent, printedName),
    (id) => engine.combat.battleOpponentOf(id),
  );
  return engine.gameAccess;
}

export function effectPrimitives(engine: GameEngine, ownerSeat: Seat): Primitives {
  // `gainMemory` is written from the resolving card's perspective ("gain N memory").
  // Most windows belong to the turn player, but Security and opponent-turn effects may
  // resolve for the non-turn player. Bind the convenience verb to the source owner here;
  // explicit cross-seat effects continue to use `gainMemoryForSeat` directly.
  engine.primitivesBySeat[ownerSeat] ??= {
    ...engine.primitives,
    gainMemory: (amount: number) => engine.primitives.gainMemoryForSeat(ownerSeat, amount),
  };
  return engine.primitivesBySeat[ownerSeat];
}

export function buildEffectContext(
  engine: GameEngine,
  source: CardSource,
  trigger: TriggerInfo,
  askOverride?: DecisionApi,
): EffectContext {
  return createEffectContext({
    source,
    trigger,
    game: effectAccess(engine),
    fx: effectPrimitives(engine, source.ownerSeat),
    ask: askOverride ?? engine.decisionApi,
    usage: engine.tracker,
  });
}

/** Resolve the CardSource for a CardInstance against live state (placement/turn lookup). */
export function cardSourceOf(engine: GameEngine, instance: CardInstance): CardSource {
  const cached = engine.cardSourceByInstance.get(instance);
  if (cached !== undefined) return cached;
  engine.cardStateLookup ??= createCardStateLookup(engine.state);
  const source = createCardSource(instance, engine.cardStateLookup);
  engine.cardSourceByInstance.set(instance, source);
  return source;
}

/**
 * The framework environment a timing resolution runs against: authoritative state,
 * the effect verbs (fx), the player-decision API (ask), and the per-turn use ledger
 * (shared with activateEffect so maxPerTurn accounting is unified).
 */
export function effectEnvironment(engine: GameEngine, trigger: TriggerInfo): EffectEnvironment {
  return {
    state: engine.state,
    fx: engine.primitives,
    fxForSource: (source) => effectPrimitives(engine, source.ownerSeat),
    ask: engine.decisionApi,
    tracker: engine.tracker,
    continuous: engine.continuous,
    hasKeyword: (id, keyword) =>
      engine.continuous.hasKeyword(id, keyword) ||
      (keyword.toLowerCase() === "piercing" && engine.modifiers.hasPierce(id)),
    digivolvedThisTurn: (seat) => engine.tracker.count(`seat:${seat}`, "digivolvedThisTurn") > 0,
    effectiveColors: (permanent) => engine.effectiveColorsOf(permanent),
    colorRequirementWaived: (instanceId) => engine.continuous.hasColorWaiver(instanceId),
    colorRequirementAlternatives: (instanceId) => engine.continuous.colorRequirementAlternatives(instanceId),
    canDeclareAttack: (permanent) =>
      canAttackerDeclare(engine.access, permanent.controllerSeat, permanent, engine.continuous) === null,
    battleOpponentOf: (id) => engine.combat.battleOpponentOf(id),
    triggerInfo: trigger,
  };
}

/**
 * CR §3-1-3-1-2: a card that leaves the field returns as a new card, so its [Once Per Turn]
 * effects are available again (EX12-065 replayed by ＜Fortitude＞, KB Q6866). A card still on
 * the field is the same Digimon (§3-4-5, KB Q4253) and keeps its counts. Forgetting at the
 * departure, not after the deletion reactions, keeps the use ＜Fortitude＞'s replay then spends.
 */
export function forgetUsesOfCardsLeavingField(engine: GameEngine, event: ServerEvent): void {
  if (event.kind !== "cardsMoved") return;
  const onField = (zone: string): boolean => zone === Zone.BattleArea || zone === Zone.Breeding;
  if (!onField(event.from) || onField(event.to)) return;
  for (const instanceId of event.instanceIds) engine.tracker.forgetInstance(instanceId);
}

/**
 * Single-sourced per-permanent teardown for every deletion seam. When a permanent
 * leaves the field its three per-permanent ledgers must be dropped together: the
 * modifier ledger (DP/keyword/cost modifiers), the continuous-rule store, and the
 * SubTrigger registry (delayed watchers + reduceCost/prevent REPLACEMENTS). The
 * effect-driven `deletePermanent` primitive does engine inline; combat and the security
 * check delete through raw state access and so route their cleanup here, so a stale
 * watcher or replacement from a source that died in battle/security cannot fire or
 * discount after the source is gone. Mirrors the DNA-digivolve material teardown.
 */
export function dropPermanentSubscriptions(engine: GameEngine, permanentId: string): void {
  engine.modifiers.dropPermanent(permanentId);
  engine.continuous.dropPermanent(permanentId);
  engine.subTriggers.dropPermanent(permanentId);
}
