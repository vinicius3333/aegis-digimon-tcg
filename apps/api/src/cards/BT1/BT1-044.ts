import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-044";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/play-source`,
        description: "[When Attacking] Play 1 level 4 or lower Digimon source without paying its cost.",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self === undefined) return;
          const candidates = self.stack
            .filter((card) => {
              const definition = ctx.game.definitionOf(card);
              return isDigimon(definition) && (definition.level ?? 99) <= 4;
            })
            .map((card) => card.instanceId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
          if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
