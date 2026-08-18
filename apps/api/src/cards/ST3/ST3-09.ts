import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST3-09";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] If you have 3 or fewer security cards, place the top card of " +
            "your deck on top of your security stack.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.security.length > 3) return;
            if (owner.deck.length > 0) {
              const topCard = Array.from(owner.deck)[0];
              if (topCard !== undefined) {
                await ctx.fx.addSecurity(source.ownerSeat, [topCard.instanceId], { toTop: true });
              }
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
