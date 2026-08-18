import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { drawIfHostHasSave, saveDigimonInTrash, saveSelf, tamerIds } from "./saveSupport.js";

const cardId = "BT12-077";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/rush`,
          description: "If this Digimon has 2 or more digivolution cards, it gains Rush for the turn.",
          when: () => (source.permanent()?.stack.length ?? 0) >= 2,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.grantKeyword(self.permanentId, "Rush", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/save-and-place`,
          description: "Save, then place a Save Digimon from trash under a Tamer.",
          resolve: async (ctx) => {
            await saveSelf(ctx, source);
            const cards = saveDigimonInTrash(ctx, source);
            const tamers = tamerIds(ctx, source);
            if (!cards.length || !tamers.length) return;
            const [card] = await ctx.ask.selectCards(ctx, { candidates: cards, min: 1, max: 1 });
            const [tamer] = await ctx.ask.chooseTargets(ctx, { candidates: tamers, min: 1, max: 1 });
            if (card && tamer) await ctx.fx.placeUnder(tamer, [card]);
          },
        }),
      ];
    if (timing === EffectTiming.OnAllyAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-draw`,
          description: "[When Attacking][Once Per Turn] If this Digimon has Save, draw 1.",
          isInherited: true,
          maxPerTurn: 1,
          resolve: (ctx) => drawIfHostHasSave(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
