import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-025";

function trashableSources(source: CardSource, canTrash?: (instanceId: string) => boolean) {
  return (source.permanent()?.stack ?? []).filter(
    (card) => canTrash?.(card.instanceId) !== false,
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnDeclaration) return [];
    return [
      activated({
        source,
        effectKey: `${cardId}/digi-burst-security-attack`,
        description: "[Main] Digi-Burst 2: 1 of your Digimon gains Security Attack +1 for the turn.",
        canActivate: (ctx) => trashableSources(source, ctx.fx.canTrashDigivolutionCard).length >= 2,
        resolve: async (ctx) => {
          const self = source.permanent();
          const eligible = trashableSources(source, ctx.fx.canTrashDigivolutionCard);
          if (self === undefined || eligible.length < 2) return;
          const sources = await ctx.ask.selectCards(ctx, {
            candidates: eligible.map((card) => card.instanceId), min: 2, max: 2,
          });
          if (sources.length !== 2) return;
          const moved = await ctx.fx.trashDigivolutionCards(self.permanentId, sources, {
            byEffectSeat: source.ownerSeat,
            byEffectCardId: cardId,
            isDigiBurst: true,
          });
          if (moved.length !== 2) return;
          const candidates = Array.from(ctx.game.player(source.ownerSeat).battleArea)
            .filter((permanent) => isDigimon(ctx.game.definitionOf(permanent.topCard)))
            .map((permanent) => permanent.permanentId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 });
          if (chosen.length === 1) {
            ctx.fx.grantKeyword(chosen[0]!, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
          }
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
