import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { hasTrait, mill } from "./support.js";

const cardId = "ST14-01";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.OnAllyAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/inherited-mill`,
        description:
          "[When Attacking][Once Per Turn] If this Digimon has Wizard or Demon Lord, trash the top 2 cards of your deck.",
        isInherited: true,
        maxPerTurn: 1,
        when: (ctx) => {
          const host = source.permanent();
          return host?.topCard !== undefined && hasTrait(ctx.game.definitionOf(host.topCard), ["Wizard", "Demon Lord"]);
        },
        resolve: (ctx) => mill(ctx, source, 2),
      }),
    ];
  },
};
registerCard(module);
export default module;
