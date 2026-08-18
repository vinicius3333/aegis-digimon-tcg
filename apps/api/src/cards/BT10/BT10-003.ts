import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT10-003";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/inherited-when-attacking-draw`,
        description: "[When Attacking] If this Digimon has [Xros Heart] in its traits, Draw 1.",
        optional: false,
        isInherited: true,
        when: (ctx) => {
          const host = ctx.source.permanent?.();
          if (host?.topCard === undefined) return false;
          const definition = ctx.game.definitionOf(host.topCard);
          return [...(definition.forms ?? []), ...(definition.attributes ?? []), ...(definition.types ?? [])]
            .some((trait) => trait.toLowerCase() === "xros heart");
        },
        resolve: async (ctx) => {
          await ctx.fx.draw(ctx.source.ownerSeat, 1);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
