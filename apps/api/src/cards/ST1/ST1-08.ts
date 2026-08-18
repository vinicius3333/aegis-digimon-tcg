import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-08";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.WhenDigivolving) return [];
    return [
      whenDigivolving({
        source,
        effectKey: `${cardId}/dp`,
        description: "[When Digivolving] One of your Digimon gets +3000 DP for the turn.",
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(source.ownerSeat)
            .battleArea.filter((permanent) => permanent.topCard && isDigimon(ctx.game.definitionOf(permanent.topCard)))
            .map(({ permanentId }) => permanentId);
          if (!candidates.length) return;
          const [picked] =
            candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
          if (picked) ctx.fx.modifyDP(picked, 3000, EffectDuration.UntilEachTurnEnd);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
