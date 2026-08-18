import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-027";

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
        effectKey: `${cardId}/digi-burst-use-option`,
        description:
          "[Main] Digi-Burst 2: Use a purple Option card with a cost of 7 or less from " +
          "your hand without paying its cost.",
        canActivate: (ctx) => trashableSources(source, ctx.fx.canTrashDigivolutionCard).length >= 2,
        resolve: async (ctx) => {
          const self = source.permanent();
          const eligibleSources = trashableSources(source, ctx.fx.canTrashDigivolutionCard);
          if (self === undefined || eligibleSources.length < 2) return;
          const sources = await ctx.ask.selectCards(ctx, {
            candidates: eligibleSources.map((card) => card.instanceId),
            min: 2,
            max: 2,
          });
          if (sources.length !== 2) return;
          const moved = await ctx.fx.trashDigivolutionCards(self.permanentId, sources, {
            byEffectSeat: source.ownerSeat,
            byEffectCardId: cardId,
            isDigiBurst: true,
          });
          if (moved.length !== 2) return;

          const owner = ctx.game.player(source.ownerSeat);
          const eligible = Array.from(owner.hand).filter((card) => {
            const definition = ctx.game.definitionOf(card);
            return definition.kinds.includes(CardKind.Option) &&
              definition.colors.includes(CardColor.Purple) &&
              definition.playCost <= 7 &&
              ctx.fx.isPlayProhibited?.(source.ownerSeat, card.cardId, "play") !== true;
          });
          if (eligible.length === 0) return;
          const chosen = await ctx.ask.selectCards(ctx, {
            candidates: eligible.map((card) => card.instanceId),
            min: 0,
            max: 1,
          });
          const option = eligible.find((card) => card.instanceId === chosen[0]);
          if (option === undefined) return;
          await ctx.fx.useOptionFromHand(
            ctx,
            option.instanceId,
            ctx.game.definitionOf(option).playCost,
          );
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
