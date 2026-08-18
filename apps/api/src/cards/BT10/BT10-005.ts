import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT10-005";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-twilight-dp`,
        description: "[All Turns] While this Digimon has [Twilight] in its traits, it gets +1000 DP.",
        optional: false,
        isInherited: true,
        when: (ctx) => {
          const host = ctx.source.permanent?.();
          if (host?.topCard === undefined) return false;
          const definition = ctx.game.definitionOf(host.topCard);
          return [...(definition.forms ?? []), ...(definition.attributes ?? []), ...(definition.types ?? [])]
            .some((trait) => trait.toLowerCase() === "twilight");
        },
        resolve: async (ctx) => {
          const host = ctx.source.permanent?.();
          if (host !== undefined) ctx.fx.modifyDP(host.permanentId, 1000, EffectDuration.Permanent);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
