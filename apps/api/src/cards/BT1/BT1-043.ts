import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-043";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.WhenDigivolving) return [];
    return [
      whenDigivolving({
        source,
        effectKey: `${cardId}/trash-sources`,
        description: "[When Digivolving] Trash up to 4 digivolution cards from 1 opposing Digimon.",
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.filter(
              (permanent) =>
                permanent.topCard !== undefined &&
                isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
                permanent.stack.length > 0,
            )
            .map((permanent) => permanent.permanentId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
          const target = chosen[0] === undefined ? undefined : ctx.game.permanentById(chosen[0]);
          if (target === undefined) return;
          await ctx.fx.trashDigivolutionCards(
            target.permanentId,
            target.stack.slice(-4).map((card) => card.instanceId),
            { byEffectSeat: source.ownerSeat },
          );
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
