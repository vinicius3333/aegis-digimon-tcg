import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-039";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.WhenDigivolving) return [];
    return [
      whenDigivolving({
        source,
        effectKey: `${cardId}/yellow-digimon-to-security`,
        description: "[When Digivolving] You may place 1 other yellow Digimon on top of your security.",
        optional: true,
        canActivate: (ctx) =>
          ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
            if (permanent.permanentId === source.permanent()?.permanentId || permanent.topCard === undefined)
              return false;
            const def = ctx.game.definitionOf(permanent.topCard);
            return def.kinds.includes(CardKind.Digimon) && def.colors.includes(CardColor.Yellow);
          }),
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(source.ownerSeat)
            .battleArea.filter((permanent) => {
              if (permanent.permanentId === source.permanent()?.permanentId || permanent.topCard === undefined)
                return false;
              const def = ctx.game.definitionOf(permanent.topCard);
              return def.kinds.includes(CardKind.Digimon) && def.colors.includes(CardColor.Yellow);
            })
            .map(({ permanentId }) => permanentId);
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
          const target = chosen[0] ? ctx.game.permanentById(chosen[0]) : undefined;
          if (target?.topCard)
            await ctx.fx.addSecurity(source.ownerSeat, [target.topCard.instanceId], {
              toTop: true,
              faceUp: false,
            });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
