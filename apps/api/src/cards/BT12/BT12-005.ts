import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-005";
const hasSave = (text: string | undefined): boolean => text?.includes("Save") ?? false;
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [staticModifier({
      source,
      effectKey: `${cardId}/inherited-save-play-draw`,
      description: "[Your Turn][Once Per Turn] When you play a Digimon with Save in its text, draw 1.",
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
          description: `${cardId}: Save Digimon played`,
          matches: (subCtx) => {
            const subject = subCtx.trigger.subjectPermanentId === undefined ? undefined : subCtx.game.permanentById(subCtx.trigger.subjectPermanentId);
            if (subject?.topCard === undefined || subject.controllerSeat !== source.ownerSeat) return false;
            const def = subCtx.game.definitionOf(subject.topCard);
            return isDigimon(def) && (hasSave(def.effectText) || hasSave(def.inheritedEffectText));
          },
          run: async (subCtx) => { await subCtx.fx.draw(source.ownerSeat, 1); },
        });
      },
    })];
  },
};
registerCard(module);
export default module;
