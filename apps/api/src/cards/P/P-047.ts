import { EffectDuration, EffectTiming, isDigiEgg, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-047";

function nonDigiEggTrashIds(ctx: Parameters<Effect["resolve"]>[0], source: CardSource): string[] {
  return Array.from(ctx.game.player(source.ownerSeat).trash)
    .filter((card) => !isDigiEgg(ctx.game.definitionOf(card)))
    .map((card) => card.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Trash the top 3 cards of your deck. Then, if you have a " +
            "Tamer in play, this Digimon gets +3000 DP for the turn.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const topCards = Array.from(owner.deck)
              .slice(0, 3)
              .map((card) => card.instanceId);
            if (topCards.length > 0) await ctx.fx.trash(topCards);

            const hasTamer = Array.from(owner.battleArea).some(
              (permanent) =>
                permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard)),
            );
            const self = source.permanent();
            if (hasTamer && self !== undefined) {
              ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-when-attacking`,
          description:
            "[When Attacking] You may place 3 non-Digi-Egg cards from your trash at the " +
            "bottom of your deck in any order to have this Digimon get +2000 DP for the turn.",
          optional: true,
          isInherited: true,
          canActivate: (ctx) => nonDigiEggTrashIds(ctx, source).length >= 3,
          resolve: async (ctx) => {
            const candidates = nonDigiEggTrashIds(ctx, source);
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 3,
              max: 3,
            });
            if (chosen.length !== 3) return;

            await ctx.fx.returnToDeck(chosen, { toTop: false });
            const recipientId = ctx.conferredToPermanentId ?? source.permanent()?.permanentId;
            if (recipientId !== undefined) {
              ctx.fx.modifyDP(recipientId, 2000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
