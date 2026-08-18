import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-044";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.WhenDigivolving) return [];

    return [
      whenDigivolving({
        source,
        effectKey: `${cardId}/when-digivolving`,
        description:
          "[When Digivolving] Suspend 1 of your opponent's Digimon, or 2 of your " +
          "opponent's Digimon with 5000 DP or less.",
        resolve: async (ctx) => {
          const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
          const allDigimon = opponent.battleArea.filter(
            (permanent) =>
              permanent.topCard !== undefined &&
              isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
              !permanent.isSuspended,
          );
          if (allDigimon.length === 0) return;

          const lowDpDigimon = allDigimon.filter((permanent) => permanent.currentDP <= 5000);
          let candidates = allDigimon;
          let max = 1;

          if (lowDpDigimon.length >= 2) {
            const choice = await ctx.ask.chooseOption(ctx, [
              "Suspend 1 opponent Digimon",
              "Suspend 2 opponent Digimon with 5000 DP or less",
            ]);
            if (choice === 1) {
              candidates = lowDpDigimon;
              max = 2;
            }
          }

          const chosen = await ctx.ask.chooseTargets(ctx, {
            candidates: candidates.map((permanent) => permanent.permanentId),
            min: 1,
            max,
          });
          if (chosen.length > 0) await ctx.fx.suspend(chosen);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
