import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX2-018";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnPlay) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/recover-for-source-free-opponents`,
        description: "[On Play] For each opposing Digimon without digivolution cards, recover 1, without increasing security to 6 or more.",
        optional: false,
        resolve: async (ctx) => {
          const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
          const sourceFreeCount = opponent.battleArea.filter(
            (permanent) => permanent.topCard !== undefined && permanent.stack.length === 0 && isDigimon(ctx.game.definitionOf(permanent.topCard)),
          ).length;
          const securitySpace = Math.max(0, 5 - ctx.game.player(source.ownerSeat).security.length);
          await ctx.fx.recoverToSecurity(source.ownerSeat, Math.min(sourceFreeCount, securitySpace));
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
