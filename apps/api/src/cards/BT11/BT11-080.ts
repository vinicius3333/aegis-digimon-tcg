import { CardColor, EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-080";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/yellow-rush-retaliation`,
        description:
          "[Your Turn] While you have a yellow Digimon or Tamer, this Digimon gains ＜Rush＞ and ＜Retaliation＞.",
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self === undefined) return;
          const hasYellow = ctx.game
            .player(source.ownerSeat)
            .battleArea.some(
              (permanent) =>
                permanent.topCard !== undefined &&
                ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Yellow),
            );
          if (!hasYellow) return;
          ctx.fx.grantKeyword(self.permanentId, "Rush", EffectDuration.Permanent);
          ctx.fx.grantKeyword(self.permanentId, "Retaliation", EffectDuration.Permanent);
        },
      }),
    ];
  },
};
registerCard(module);
