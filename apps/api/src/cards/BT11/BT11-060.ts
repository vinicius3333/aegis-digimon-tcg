import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-060";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/opponent-return-protection`,
        description: "[All Turns] This Digimon can't be returned to hands or decks by your opponent's effects.",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) {
            ctx.fx.restrict(self.permanentId, "beReturned", EffectDuration.Permanent, {
              byOpponentEffectsOnly: true,
            });
          }
        },
      }),
    ];
  },
};

registerCard(module);
