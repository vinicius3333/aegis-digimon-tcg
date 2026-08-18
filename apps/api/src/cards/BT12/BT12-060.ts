import { EffectDuration, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-060";
function hasSaveText(text: string | undefined): boolean {
  return text?.includes("＜Save＞") === true;
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/save`,
          description: "[On Deletion] ＜Save＞",
          optional: true,
          resolve: async (ctx) => {
            const tamers = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter(
                (permanent) => permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard)),
              );
            if (!tamers.length) return;
            const [chosen] = await ctx.ask.chooseTargets(ctx, {
              candidates: tamers.map(({ permanentId }) => permanentId),
              min: 1,
              max: 1,
            });
            if (chosen) await ctx.fx.placeUnder(chosen, [source.instanceId]);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-blocker`,
          isInherited: true,
          description: "[Your Turn] While this Digimon has Save in its text, it gains Blocker.",
          when: (ctx) => {
            const host = source.permanent();
            return (
              source.isOwnersTurn() &&
              host?.topCard !== undefined &&
              hasSaveText(ctx.game.definitionOf(host.topCard).effectText)
            );
          },
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host) ctx.fx.grantKeyword(host.permanentId, "Blocker", EffectDuration.Permanent);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
