import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-006 — Monimon (BT26, Purple In-Training Digi-Egg).
//
// Audited against committed rulings Q6959-Q6961, including the exact-two-card cost,
// removal of a DigiXros-material attacker, and pending-effect source-zone invalidation.
//
// Inherited: [When Attacking] [Once Per Turn] By trashing any 2 digivolution cards from
//   your [Bagra Army] trait Digimon, you may play or use 1 [Bagra Army] trait card from
//   your hand with the cost reduced by 2.
//
// Modeled after BT26-012's "[Main] [Once Per Turn] play or use 1 <trait> card from your
// hand with the cost reduced by 2" play-or-use branch (Option -> the paid
// ctx.fx.useOptionFromHand seam; non-Option -> ctx.fx.playInstances with costDelta), and
// after BT26-031's "By trashing <cost>, <effect>" gating shape (an
// activated builder with `optional: true` asking up front, then paying the cost with
// ctx.fx.trashDigivolutionCards before running the effect). "Any 2 digivolution cards
// from your [Bagra Army] trait Digimon" spans every such Digimon you control (not just
// one), so the pool of trashable cards is gathered across all of them and the 2 chosen
// cards are mapped back to their hosts and paid through the exact-count atomic multi-host
// trash primitive. It validates the whole cost before any movement or trash watcher, which
// is required by Q6959: one protected/stale card can't leave the other half partially paid.
// The effect itself is always isInherited: true since this card's only effect is the ability
// it grants as digivolution material.

const cardId = "BT26-006";
const BAGRA_ARMY_TRAIT = "Bagra Army";

function hasBagraArmyTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(BAGRA_ARMY_TRAIT);
}

function bagraArmyTraitHandCards(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.hand).filter((c) => hasBagraArmyTrait(ctx.game.definitionOf(c)));
}

/** Every digivolution card sitting under one of the owner's [Bagra Army] trait Digimon. */
function bagraArmyDigivolutionPool(
  ctx: EffectContext,
  source: CardSource,
): { hostPermanentId: string; instanceId: string }[] {
  const owner = ctx.game.player(source.ownerSeat);
  const pool: { hostPermanentId: string; instanceId: string }[] = [];
  for (const p of owner.battleArea) {
    if (p.topCard === undefined) continue;
    const def = ctx.game.definitionOf(p.topCard);
    if (!isDigimon(def) || !hasBagraArmyTrait(def)) continue;
    for (const card of p.stack) {
      pool.push({ hostPermanentId: p.permanentId, instanceId: card.instanceId });
    }
  }
  return pool;
}

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnAllyAttack) return [];

    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/when-attacking-play-or-use-bagra-army`,
        description:
          "[When Attacking] [Once Per Turn] By trashing any 2 digivolution cards from " +
          "your [Bagra Army] trait Digimon, you may play or use 1 [Bagra Army] trait " +
          "card from your hand with the cost reduced by 2.",
        isInherited: true,
        optional: true,
        maxPerTurn: 1,
        canActivate: (ctx) =>
          bagraArmyDigivolutionPool(ctx, source).length >= 2 && bagraArmyTraitHandCards(ctx, source).length > 0,
        resolve: async (ctx) => {
          const pool = bagraArmyDigivolutionPool(ctx, source);
          if (pool.length < 2) return;

          const chosenIds = await ctx.ask.selectCards(ctx, {
            candidates: pool.map((p) => p.instanceId),
            min: 2,
            max: 2,
          });
          if (chosenIds.length < 2) return;

          const selections: { hostPermanentId: string; instanceId: string }[] = [];
          for (const id of chosenIds) {
            const entry = pool.find((p) => p.instanceId === id);
            if (entry === undefined) continue;
            selections.push(entry);
          }
          const trashed = await ctx.fx.trashDigivolutionCardsAtomic(selections, 2, {
            byEffectSeat: source.ownerSeat,
            byEffectCardId: cardId,
          });
          if (trashed.length !== 2) return;

          const candidates = bagraArmyTraitHandCards(ctx, source);
          if (candidates.length === 0) return;

          const chosen = await ctx.ask.selectCards(ctx, {
            candidates: candidates.map((c) => c.instanceId),
            min: 0,
            max: 1,
          });
          if (chosen.length === 0) return;

          const chosenCard = candidates.find((c) => c.instanceId === chosen[0]!);
          if (chosenCard === undefined) return;
          const def = ctx.game.definitionOf(chosenCard);

          if (def.kinds.includes(CardKind.Option)) {
            await ctx.fx.useOptionFromHand(ctx, chosenCard.instanceId, def.playCost, {
              payCost: true,
              costDelta: 2,
            });
          } else {
            await ctx.fx.playInstances([chosenCard.instanceId], { payCost: true, costDelta: 2 });
          }
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
