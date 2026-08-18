import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-017";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnEnterFieldAnyone) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/security-attack`,
        description: "[On Play] 1 of your Digimon gains Security Attack +1 for the turn.",
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(source.ownerSeat)
            .battleArea.filter(
              (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
            )
            .map((permanent) => permanent.permanentId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
          if (chosen[0] !== undefined)
            ctx.fx.grantKeyword(chosen[0], "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
