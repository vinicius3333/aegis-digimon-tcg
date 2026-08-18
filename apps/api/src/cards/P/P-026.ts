import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-026";

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
        effectKey: `${cardId}/digi-burst-2-unsuspend`,
        description: "[Main] Digi-Burst 2: Unsuspend this Digimon.",
        canActivate: (ctx) => trashableSources(source, ctx.fx.canTrashDigivolutionCard).length >= 2,
        resolve: async (ctx) => {
          const self = source.permanent();
          const eligible = trashableSources(source, ctx.fx.canTrashDigivolutionCard);
          if (self === undefined || eligible.length < 2) return;
          const chosen = await ctx.ask.selectCards(ctx, {
            candidates: eligible.map((card) => card.instanceId),
            min: 2,
            max: 2,
          });
          if (chosen.length !== 2) return;
          const moved = await ctx.fx.trashDigivolutionCards(self.permanentId, chosen, {
            byEffectSeat: source.ownerSeat,
            byEffectCardId: cardId,
            isDigiBurst: true,
          });
          if (moved.length !== 2) return;
          await ctx.fx.unsuspend([self.permanentId]);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
