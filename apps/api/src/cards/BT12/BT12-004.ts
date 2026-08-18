import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-004";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [staticModifier({
      source,
      effectKey: `${cardId}/inherited-green-play-dp`,
      description: "[Your Turn][Once Per Turn] When you play a green Digimon, this Digimon gets +2000 DP.",
      isInherited: true,
      maxPerTurn: 1,
      when: () => source.isOwnersTurn(),
      resolve: async (ctx) => {
        const host = source.permanent();
        if (host === undefined) return;
        ctx.fx.subscribeSubTrigger({
          event: "whenPlayed",
          sourcePermanentId: host.permanentId,
          once: false,
          description: `${cardId}: green Digimon played`,
          matches: (subCtx) => {
            const subject = subCtx.trigger.subjectPermanentId === undefined ? undefined : subCtx.game.permanentById(subCtx.trigger.subjectPermanentId);
            if (subject?.topCard === undefined || subject.controllerSeat !== source.ownerSeat) return false;
            const def = subCtx.game.definitionOf(subject.topCard);
            return isDigimon(def) && def.colors.includes(CardColor.Green);
          },
          run: async (subCtx) => {
            const liveHost = source.permanent();
            if (liveHost !== undefined) subCtx.fx.modifyDP(liveHost.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
          },
        });
      },
    })];
  },
};
registerCard(module);
export default module;
