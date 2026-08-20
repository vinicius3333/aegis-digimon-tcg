import { EffectTiming, isDigimon, CardColor } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-070";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description:
            "[Security] Reveal the top card of your deck. If it's a black Digimon with a play " +
            "cost of 4 or less, you may play it without paying the cost. Otherwise, add it to " +
            "your hand. Then, add this card to your hand.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const topCard = Array.from(owner.deck)[0];
            let played = false;
            if (topCard !== undefined) {
              const def = ctx.game.definitionOf(topCard);
              const eligible =
                isDigimon(def) &&
                def.colors.includes(CardColor.Black) &&
                (def.playCost ?? 99) <= 4;
              if (eligible) {
                const willPlay = await ctx.ask.optional(
                  ctx,
                  `Play ${def.nameEn} without paying the cost?`,
                );
                if (willPlay) {
                  await ctx.fx.playInstances([topCard.instanceId], { payCost: false });
                  played = !Array.from(owner.deck).some(
                    (card) => card.instanceId === topCard.instanceId,
                  );
                }
              }
              if (!played) await ctx.fx.returnToHand([topCard.instanceId]);
            }

            // The final "Then" is unconditional (KB Q4846), including an empty deck.
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
