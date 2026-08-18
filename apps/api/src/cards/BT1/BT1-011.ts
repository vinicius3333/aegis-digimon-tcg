import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-011";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnEnterFieldAnyone) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/recover-agumon`,
        description: "[On Play] Return 1 Digimon card with Agumon in its name from trash to hand.",
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(source.ownerSeat)
            .trash.filter((card) => {
              const definition = ctx.game.definitionOf(card);
              return isDigimon(definition) && definition.nameEn.includes("Agumon");
            })
            .map((card) => card.instanceId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
          if (chosen.length > 0) await ctx.fx.returnToHand(chosen);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
