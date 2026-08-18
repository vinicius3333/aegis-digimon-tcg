import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-006";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.OnDestroyedAnyone) return [];
    return [onDeletion({
      source,
      effectKey: `${cardId}/inherited-save-deletion-draw`,
      description: "[On Deletion] If this Digimon has Save in its text, draw 1.",
      isInherited: true,
      canActivate: (ctx) => {
        const deletedTopId = ctx.trigger.deletedTopCardId;
        if (deletedTopId === undefined) return false;
        const deleted = ctx.game.player(source.ownerSeat).trash.find(({ cardId }) => cardId === deletedTopId);
        if (deleted === undefined) return false;
        const def = ctx.game.definitionOf(deleted);
        return def.effectText?.includes("Save") === true || def.inheritedEffectText?.includes("Save") === true;
      },
      resolve: async (ctx) => { await ctx.fx.draw(source.ownerSeat, 1); },
    })];
  },
};
registerCard(module);
export default module;
