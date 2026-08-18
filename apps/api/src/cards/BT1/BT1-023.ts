import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-023";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnEnterFieldAnyone) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/delete-blocker`,
        description: "[On Play] Delete 1 opposing Digimon with Blocker.",
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.filter(
              (permanent) =>
                permanent.topCard !== undefined &&
                isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
                (ctx.game.hasKeyword?.(permanent.permanentId, "Blocker") ?? false),
            )
            .map((permanent) => permanent.permanentId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
          if (chosen[0] !== undefined) await ctx.fx.deletePermanent([chosen[0]]);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
