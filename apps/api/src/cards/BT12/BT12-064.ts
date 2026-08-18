import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-064";
function hasSave(def: CardDefinition): boolean {
  return `${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`.includes("＜Save＞");
}
function tamerIds(ctx: EffectContext): string[] {
  return ctx.game
    .player(ctx.source.ownerSeat)
    .battleArea.filter(
      (permanent) => permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard)),
    )
    .map(({ permanentId }) => permanentId);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/de-digivolve`,
          description: "De-Digivolve 1 an opposing Digimon at level 5 plus 1 per 2 digivolution cards.",
          resolve: async (ctx) => {
            const self = source.permanent();
            const ceiling = 5 + Math.floor((self?.stack.length ?? 0) / 2);
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const candidates = ctx.game
              .player(opponent)
              .battleArea.filter(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
                  (ctx.game.definitionOf(permanent.topCard).level ?? 0) <= ceiling,
              )
              .map(({ permanentId }) => permanentId);
            if (!candidates.length) return;
            const [picked] = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (picked) ctx.fx.deDigivolve(picked, 1, { byEffectSeat: source.ownerSeat });
          },
        }),
      ];
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/save-and-place`,
          description: "[On Deletion] Save, then place a Save Digimon from trash under a Tamer.",
          resolve: async (ctx) => {
            let tamers = tamerIds(ctx);
            if (!tamers.length) return;
            const save = await ctx.ask.chooseTargets(ctx, { candidates: tamers, min: 0, max: 1 });
            if (save[0]) await ctx.fx.placeUnder(save[0], [source.instanceId]);
            const candidates = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) => isDigimon(ctx.game.definitionOf(card)) && hasSave(ctx.game.definitionOf(card)))
              .map(({ instanceId }) => instanceId);
            tamers = tamerIds(ctx);
            if (!candidates.length || !tamers.length) return;
            const [card] = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
            const [tamer] = await ctx.ask.chooseTargets(ctx, { candidates: tamers, min: 1, max: 1 });
            if (card && tamer) await ctx.fx.placeUnder(tamer, [card]);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-blocker`,
          description: "[Your Turn] While this Digimon has Save in its text, it gains Blocker.",
          isInherited: true,
          when: (ctx) => {
            const host = source.permanent();
            return source.isOwnersTurn() && host?.topCard !== undefined && hasSave(ctx.game.definitionOf(host.topCard));
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
