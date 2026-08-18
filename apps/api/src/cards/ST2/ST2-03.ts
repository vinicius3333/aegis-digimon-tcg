import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST2-03",
  effectsForTiming(timing, source): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: "ST2-03/inherited-trash-bottom",
        isInherited: true,
        description: "Inherited: trash the bottom source of 1 opposing level-5-or-less Digimon.",
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.filter(
              (p) =>
                p.topCard !== undefined &&
                isDigimon(ctx.game.definitionOf(p.topCard)) &&
                (ctx.game.definitionOf(p.topCard).level ?? 99) <= 5 &&
                p.stack.length > 0,
            )
            .map(({ permanentId }) => permanentId);
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: Math.min(1, candidates.length), max: 1 });
          const target = chosen[0] === undefined ? undefined : ctx.game.permanentById(chosen[0]);
          if (target?.stack[0] !== undefined)
            await ctx.fx.trashDigivolutionCards(target.permanentId, [target.stack[0].instanceId], {
              byEffectSeat: source.ownerSeat,
            });
        },
      }),
    ];
  },
};
registerCard(module);
