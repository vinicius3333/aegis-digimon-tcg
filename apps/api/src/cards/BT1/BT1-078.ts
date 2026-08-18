import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-078";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/reveal-digivolve`,
        description: "[When Attacking] Reveal 3 and may digivolve into a green level 6 Digimon for free.",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (!self) return;
          const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
          const candidates = revealed
            .filter((card) => {
              const def = ctx.game.definitionOf(card);
              return isDigimon(def) && def.level === 6 && def.colors.includes(CardColor.Green);
            })
            .map((card) => card.instanceId);
          const chosen = candidates.length ? await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 }) : [];
          const returnRemaining = async (): Promise<void> => {
            let rest = revealed.filter((card) => !chosen.includes(card.instanceId)).map((card) => card.instanceId);
            if (rest.length > 1 && ctx.ask.orderCards !== undefined) {
              rest = await ctx.ask.orderCards(ctx, {
                candidates: rest,
                visibleCards: revealed
                  .filter((card) => rest.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                destination: "deckBottom",
              });
            }
            if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
          };
          if (chosen[0]) {
            const restToStage = revealed
              .filter((card) => !chosen.includes(card.instanceId))
              .map((card) => card.instanceId);
            if (restToStage.length > 0) await ctx.fx.returnToHand(restToStage, { silent: true });
            await ctx.fx.digivolveFromInstance(self.permanentId, chosen[0], {
              payCost: false,
              draw: true,
              beforeWhenDigivolving: returnRemaining,
            });
          } else {
            await returnRemaining();
          }
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
