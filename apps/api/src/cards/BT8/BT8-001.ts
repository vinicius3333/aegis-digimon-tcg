import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT8-001";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnAllyAttack) return [];
    return [whenAttacking({
      source,
      effectKey: `${cardId}/inherited-draw`,
      description: "[When Attacking][Once Per Turn] If this Digimon has 6000 DP or more, draw 1.",
      isInherited: true,
      optional: false,
      maxPerTurn: 1,
      when: () => (source.permanent()?.currentDP ?? 0) >= 6000,
      resolve: async (ctx) => {
        await ctx.fx.draw(source.ownerSeat, 1);
      },
    })];
  },
};

registerCard(module);
export default module;
