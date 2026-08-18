import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST2-09",
  effectsForTiming(timing, source): Effect[] {
    if (timing !== EffectTiming.WhenDigivolving) return [];
    return [
      whenDigivolving({
        source,
        effectKey: "ST2-09/trash-bottom-two",
        description: "Trash up to the bottom 2 sources of 1 opposing Digimon.",
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.filter(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length > 0,
            )
            .map(({ permanentId }) => permanentId);
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: Math.min(1, candidates.length), max: 1 });
          const target = chosen[0] === undefined ? undefined : ctx.game.permanentById(chosen[0]);
          if (target !== undefined)
            await ctx.fx.trashDigivolutionCards(
              target.permanentId,
              target.stack.slice(0, 2).map(({ instanceId }) => instanceId),
              { byEffectSeat: source.ownerSeat },
            );
        },
      }),
    ];
  },
};
registerCard(module);
