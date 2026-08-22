import { EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { drawIfHostHasSave, hasSaveText, saveSelf } from "./saveSupport.js";

const cardId = "BT12-075";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/recover-under-tamer`,
          description: "Return a Save Digimon from under one of your Tamers to hand.",
          optional: true,
          resolve: async (ctx) => {
            const ids: string[] = [];
            for (const permanent of ctx.game.player(source.ownerSeat).battleArea)
              if (
                permanent.topCard !== undefined &&
                isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                permanent.stack.length
              )
                for (const card of permanent.stack)
                  if (hasSaveText(ctx.game.definitionOf(card))) ids.push(card.instanceId);
            if (!ids.length) return;
            const [picked] = await ctx.ask.selectCards(ctx, { candidates: ids, min: 0, max: 1 });
            if (picked) await ctx.fx.returnToHand([picked]);
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
const registered = registerIrCard(cardId, { effects: [], coverage: "full", residual: [] });
registered.effectsForTiming = module.effectsForTiming;
export default registered;
