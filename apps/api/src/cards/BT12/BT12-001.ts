import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-001";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [staticModifier({
      source,
      effectKey: `${cardId}/inherited-dp-deletion-ceiling`,
      description: "[Your Turn] Add 1000 to your DP-based deletion maximums.",
      isInherited: true,
      when: () => source.isOwnersTurn(),
      resolve: async (ctx) => { ctx.fx.addDeletionMaxDp?.({ seat: source.ownerSeat }, 1000); },
    })];
  },
};
registerCard(module);
export default module;
