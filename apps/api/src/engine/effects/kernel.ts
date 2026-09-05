import { CardKind } from "@aegis/shared";
import type { Effect } from "./Effect.js";
import type { EffectContext } from "./EffectContext.js";

/**
 * The effect-framework kernel: the cross-cutting `CanTrigger` / `CanActivate`
 * logic the upstream `ICardEffect` base class applied to EVERY effect, plus the
 * per-turn use limit. Keeping it here lets the timing builders (builders.ts) and
 * each card file stay purely declarative — exactly as the source centralized this
 * in the abstract base class (ICardEffect.cs `CanTrigger`/`CanActivate`,
 * CEntity_EffectController.cs `isOverMaxCountPerTurn`).
 *
 * Pure and side-effect free: every function takes the data it needs. The only
 * mutable piece, the per-turn use ledger, is an explicit object (UseTracker) the
 * engine owns and resets each turn.
 */

/**
 * Records how many times each effect has been used in the current turn. Mirrors
 * `CEntity_EffectController.UseEffectsThisTurn` + `GetUseCountThisTurn`: the source
 * counts uses by `ICardEffect.IsSameEffect`, which is "same source card AND same
 * HashString AND same RootCardEffect". Our analogue of that identity is
 * (source.instanceId, effect.effectKey) — the effectKey is the documented analogue
 * of HashString (PORTING-GUIDE.md section 2), and a given physical card instance is
 * the source. Reset via `resetForNewTurn` at each turn boundary.
 */
export class UseTracker {
  private readonly counts = new Map<string, number>();

  private static key(instanceId: string, effectKey: string): string {
    return `${instanceId}\0${effectKey}`;
  }

  /** upstream GetUseCountThisTurn(cardEffect). */
  count(instanceId: string, effectKey: string): number {
    return this.counts.get(UseTracker.key(instanceId, effectKey)) ?? 0;
  }

  /** upstream RegisterUseEffectThisTurn(cardEffect). */
  register(instanceId: string, effectKey: string): void {
    const k = UseTracker.key(instanceId, effectKey);
    this.counts.set(k, (this.counts.get(k) ?? 0) + 1);
  }

  /** upstream RemoveUseEffectThisTurn(cardEffect): undo one recorded use. */
  unregister(instanceId: string, effectKey: string): void {
    const k = UseTracker.key(instanceId, effectKey);
    const next = (this.counts.get(k) ?? 0) - 1;
    if (next <= 0) this.counts.delete(k);
    else this.counts.set(k, next);
  }

  /** Clear all use counts (called when a new turn begins). */
  resetForNewTurn(): void {
    this.counts.clear();
  }
}

/**
 * upstream `isOverMaxCountPerTurn`: an effect is over its limit when the recorded
 * use count this turn is `>= maxPerTurn`. A non-positive `maxPerTurn` means
 * "unlimited" (the source setter ignores values <= 0, leaving the sentinel large
 * number; Effect uses -1 for that). Returns false when there is no limit.
 */
export function isOverMaxPerTurn(effect: Effect, tracker: UseTracker, instanceId: string): boolean {
  if (effect.maxPerTurn <= 0) return false; // unlimited
  return tracker.count(instanceId, effect.effectKey) >= effect.maxPerTurn;
}

/**
 * Whether this effect's source card is currently placed such that an
 * inherited/linked effect may activate. Mirrors the inherited/linked branch of
 * ICardEffect.CanActivate (ICardEffect.cs lines ~386-415):
 *
 *  - An INHERITED effect's source must be a digivolution card; a LINKED effect's source
 *    must be a linked card. Neither may come from the permanent's top card.
 *  - A NON-inherited, NON-linked effect's source card must BE the permanent's top
 *    card (a stack card's own printed effect does not fire while buried).
 *
 * When a printed source card is not on any permanent (e.g. an explicit hand/trash effect),
 * placement does not gate it. Inherited/linked effects are different: off-field they only
 * remain eligible for the deletion event whose trigger snapshot proves their former role.
 *
 * Continuous "is flipped" / link-membership / on-deletion nuances from the source
 * are deferred to the inherited-effects and advanced-mechanics subsystems.
 */
export function passesPlacementGuard(effect: Effect, ctx: EffectContext): boolean {
  // This proof is captured for one discard event and remains on the deferred context. Once the
  // source or host moves again, it is stale: do not let the ordinary inherited branch below
  // reinterpret a reattached source as the original discarded card.
  const discardedProof = ctx.discardedStackSourceProof;
  if (discardedProof !== undefined) {
    const host = ctx.game.permanentById(discardedProof.hostPermanentId);
    const proofIsLive =
      effect.isInherited &&
      discardedProof.sourceInstanceId === ctx.source.instanceId &&
      discardedProof.hostPermanentId === ctx.trigger?.subjectPermanentId &&
      ctx.source.isInTrash?.() === true &&
      host?.inBreeding === false;
    if (!proofIsLive) return false;
  }
  const permanent = ctx.source.permanent();
  if (permanent === undefined) {
    // A discarded digivolution card is not a deletion, so it must not borrow
    // deletedWasStackInstanceIds. The engine supplies this explicit proof only
    // for the exact discard event, source instance, and still-live host.
    if (
      effect.isInherited &&
      discardedProof?.sourceInstanceId === ctx.source.instanceId &&
      discardedProof.hostPermanentId === ctx.trigger?.subjectPermanentId &&
      ctx.game.permanentById(discardedProof.hostPermanentId) !== undefined
    ) {
      return true;
    }
    // Off-field source (deleted → trash, hand-resident, etc.). For an inherited
    // effect whose source was deleted, consult the trigger's deletedWasStackInstanceIds
    // to determine whether the card was a stack card (inherited effect may fire) or
    // the permanent's top card (inherited effect must NOT fire).
    const stackIds = ctx.trigger?.deletedWasStackInstanceIds;
    const linkedIds = ctx.trigger?.deletedWasLinkedInstanceIds;
    if (stackIds !== undefined || linkedIds !== undefined) {
      const wasStackCard = stackIds?.includes(ctx.source.instanceId) === true;
      const wasLinkedCard = linkedIds?.includes(ctx.source.instanceId) === true;
      // A buried card's OWN effect may be active because the deleted host had already
      // gained it through GrantStatic (BT12-072 Q2214). The conferral snapshot and deleted
      // permanent identity prove that relationship survived until this deletion event.
      if (
        ctx.conferredToPermanentId !== undefined &&
        ctx.trigger.deletedPermanentIds?.includes(ctx.conferredToPermanentId) === true &&
        ctx.trigger.deletedInstanceIds?.includes(ctx.source.instanceId) === true &&
        wasStackCard
      ) {
        return true;
      }
      if (effect.isLinked) return wasLinkedCard;
      if (effect.isInherited) return wasStackCard;
      // A stack card moved to trash with its deleted host was not itself the
      // Digimon's top card. Its own printed [On Deletion]/＜Save＞ effect must
      // not activate; only its inherited effect was active in that position.
      if (ctx.trigger?.deletedInstanceIds?.includes(ctx.source.instanceId)) {
        return !wasStackCard && !wasLinkedCard;
      }
    }
    // A pending inherited/linked effect whose host left the battle area before activation has
    // lost the placement that conferred that effect (§15-4-4-3). Only the deletion snapshot
    // branch above can prove it was active for that specific On Deletion event.
    if (effect.isInherited || effect.isLinked) return false;
    return true;
  }
  if (permanent.topCard === undefined) return true;

  const isTop = permanent.topCard.instanceId === ctx.source.instanceId;

  // Conferred stack effects (GrantStatic grant:"effects") fire while the source
  // card remains in the digivolution stack of the target permanent.
  if (ctx.conferredToPermanentId !== undefined) {
    if (permanent.permanentId !== ctx.conferredToPermanentId) return false;
    return !isTop;
  }

  if (effect.isLinked) return permanent.linked.some((card) => card.instanceId === ctx.source.instanceId);
  if (effect.isInherited) {
    // Link-era Digi-Eggs can carry inherited text that is active while attached as a
    // link card (EX10-001/005), so inherited placement accepts either a digivolution
    // stack card or a linked card. The host-kind gate below still applies.
    const isLinkedCard = permanent.linked.some((card) => card.instanceId === ctx.source.instanceId);
    if (!isLinkedCard && !permanent.stack.some((card) => card.instanceId === ctx.source.instanceId)) return false;
    const def = ctx.game.definitionOf(permanent.topCard);
    const isBattleAreaDigimon =
      def.kinds.includes(CardKind.Digimon) ||
      (ctx.source.isOnBattleArea() && def.kinds.includes(CardKind.DigiEgg) && typeof def.dp === "number" && def.dp > 0);
    // The breeding area has one rules-defined exception to the ordinary Digimon-host
    // requirement: BT13-007 King Drasil_7D6 is a Digi-Egg whose inherited effect is active
    // from its digivolution cards while it remains in breeding. In the battle area, the
    // separate DP-bearing Digi-Egg exception represents a legal Digimon such as EX2-007
    // Mother D-Reaper (official Q3276), so its stack can also provide inherited effects.
    return isBattleAreaDigimon || ctx.source.isOnBreedingArea?.() === true;
  }
  // Printed (own) effect: must be the top card.
  return isTop;
}

/**
 * upstream `ICardEffect.CanTrigger`: the effect's own trigger predicate
 * (builders.ts wires this to the timing guard ANDed with the card's `when`),
 * gated by the per-turn use limit. The "game has started" guard from the source is
 * the engine's responsibility (the stack only fires timings during a live match),
 * so it is not duplicated here.
 */
export function canTrigger(effect: Effect, ctx: EffectContext, tracker: UseTracker): boolean {
  if (isOverMaxPerTurn(effect, tracker, ctx.source.instanceId)) return false;
  return effect.canTrigger(ctx);
}

/**
 * upstream `ICardEffect.CanActivate`: per-turn limit, the effect's own activation
 * predicate, and the inherited/linked placement guard. (Disabled-by-other-effect
 * is a static-continuous-effects concern and is layered in there.)
 */
export function canActivate(effect: Effect, ctx: EffectContext, tracker: UseTracker): boolean {
  if (isOverMaxPerTurn(effect, tracker, ctx.source.instanceId)) return false;
  if (!effect.canActivate(ctx)) return false;
  return passesPlacementGuard(effect, ctx);
}

/**
 * upstream `ICardEffect.CanUse`: both gates must pass (used for static effects /
 * declarations that have no separate trigger vs activate step).
 */
export function canUse(effect: Effect, ctx: EffectContext, tracker: UseTracker): boolean {
  return canTrigger(effect, ctx, tracker) && canActivate(effect, ctx, tracker);
}
