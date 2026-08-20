import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT21-096";

function marcusCandidates(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter((p) => p.topCard !== undefined && ctx.game.definitionOf(p.topCard).nameEn === "Marcus Damon")
    .map((p) => p.permanentId);
}

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] For the turn, 1 of your [Marcus Damon]s is also treated as a 12000 DP Digimon, " +
            "can't digivolve, and gains ＜Rush＞. Then, that Digimon may attack your opponent's Digimon.",
          optional: false,
          canActivate: (ctx) => marcusCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = marcusCandidates(ctx, source);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 });
            const id = chosen[0];
            if (id === undefined) return;
            ctx.fx.grantKind?.(id, [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
            ctx.fx.setBaseDP(id, 12000, EffectDuration.UntilEachTurnEnd);
            ctx.fx.restrict(id, "digivolve", EffectDuration.UntilEachTurnEnd);
            ctx.fx.grantKeyword(id, "Rush", EffectDuration.UntilEachTurnEnd);
            ctx.fx.grantCanAttackUnsuspended?.(id, EffectDuration.UntilEachTurnEnd);
            await ctx.fx.forceAttack(id, { attackPlayer: false });
          },
        }),
      ];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description:
            "[Security] You may play 1 [Marcus Damon] from your hand or trash without paying the cost, then add this card to your hand.",
          optional: false,
          resolve: async (ctx) => {
            const player = ctx.game.player(source.ownerSeat);
            const candidates = [...player.hand, ...player.trash].filter(
              (card) => ctx.game.definitionOf(card).nameEn === "Marcus Damon",
            );
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((card) => card.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
            }
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
