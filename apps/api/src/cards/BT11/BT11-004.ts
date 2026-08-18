import { CardColor, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-004";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [staticModifier({
      source,
      effectKey: `${cardId}/inherited-green-tamer-draw`,
      description: "[Your Turn][Once Per Turn] When you play a green Tamer, draw 1.",
      isInherited: true,
      when: () => source.isOwnersTurn(),
      resolve: async (ctx) => {
        const host = source.permanent();
        if (host === undefined) return;
        ctx.fx.subscribeSubTrigger({
          event: "whenPlayed",
          sourcePermanentId: host.permanentId,
          once: false,
          oncePerTurnKey: `${source.instanceId}/${cardId}/green-tamer-draw`,
          description: `${cardId}: green Tamer played`,
          matches: (subCtx) => {
            const subjectId = subCtx.trigger.subjectPermanentId;
            const played = subjectId === undefined ? undefined : subCtx.game.permanentById(subjectId);
            if (played?.topCard === undefined || played.controllerSeat !== source.ownerSeat) return false;
            const definition = subCtx.game.definitionOf(played.topCard);
            return isTamer(definition) && definition.colors.includes(CardColor.Green);
          },
          run: async (subCtx) => { await subCtx.fx.draw(source.ownerSeat, 1); },
        });
      },
    })];
  },
};
registerCard(module);
export default module;
