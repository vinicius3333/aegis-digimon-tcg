import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-053";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/yellow-rookie-draw`,
        description: "[Your Turn] While suspended, when you play a yellow level 3 Digimon, draw 1.",
        when: () => source.isOwnersTurn() && source.permanent()?.isSuspended === true,
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenPlayed",
            sourcePermanentId: self.permanentId,
            once: false,
            description: `${cardId}: yellow level 3 played`,
            matches: (subCtx) => {
              if (!source.isOwnersTurn() || source.permanent()?.isSuspended !== true) return false;
              const subjectId = subCtx.trigger.subjectPermanentId;
              const played = subjectId === undefined ? undefined : subCtx.game.permanentById(subjectId);
              if (played?.topCard === undefined || played.controllerSeat !== source.ownerSeat) return false;
              const definition = subCtx.game.definitionOf(played.topCard);
              return isDigimon(definition) && definition.level === 3 && definition.colors.includes(CardColor.Yellow);
            },
            run: async (subCtx) => {
              await subCtx.fx.draw(source.ownerSeat, 1);
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
