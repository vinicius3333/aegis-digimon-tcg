import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { drawIfHostHasSave, hasSaveText, saveSelf, tamerIds } from "./saveSupport.js";

const cardId = "BT12-074";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/place-draw`,
          description: "Place a Save Digimon from hand under a Tamer to draw 1.",
          optional: true,
          resolve: async (ctx) => {
            const cards = ctx.game
              .player(source.ownerSeat)
              .hand.filter((card) => isDigimon(ctx.game.definitionOf(card)) && hasSaveText(ctx.game.definitionOf(card)))
              .map(({ instanceId }) => instanceId);
            const tamers = tamerIds(ctx, source);
            if (!cards.length || !tamers.length) return;
            const [card] = await ctx.ask.selectCards(ctx, { candidates: cards, min: 0, max: 1 });
            if (!card) return;
            const [tamer] = await ctx.ask.chooseTargets(ctx, { candidates: tamers, min: 1, max: 1 });
            if (tamer) {
              await ctx.fx.placeUnder(tamer, [card]);
              await ctx.fx.draw(source.ownerSeat, 1);
            }
          },
        }),
      ];
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/save`,
          description: "＜Save＞",
          optional: true,
          resolve: (ctx) => saveSelf(ctx, source),
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
