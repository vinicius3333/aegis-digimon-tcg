import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-038";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.OnDestroyedAnyone) return [];
    return [onDeletion({
      source,
      effectKey: `${cardId}/play-devimon`,
      description: "[On Deletion] If you have a purple Digimon or Tamer, you may play 1 Devimon from trash.",
      optional: true,
      canActivate: (ctx) => ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
        if (permanent.topCard === undefined) return false;
        const def = ctx.game.definitionOf(permanent.topCard);
        return def.colors.includes(CardColor.Purple) &&
          (def.kinds.includes(CardKind.Digimon) || def.kinds.includes(CardKind.Tamer));
      }) && ctx.game.player(source.ownerSeat).trash.some((card) =>
        ctx.game.definitionOf(card).nameEn.includes("Devimon")
      ),
      resolve: async (ctx) => {
        const cards = ctx.game.player(source.ownerSeat).trash.filter((card) =>
          ctx.game.definitionOf(card).nameEn.includes("Devimon")
        );
        const chosen = await ctx.ask.selectCards(ctx, {
          candidates: cards.map(({ instanceId }) => instanceId),
          min: 1,
          max: 1,
          visibleCards: cards.map(({ instanceId, cardId: visibleCardId }) => ({ instanceId, cardId: visibleCardId })),
        });
        if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
      },
    })];
  },
};
registerCard(module);
export default module;
