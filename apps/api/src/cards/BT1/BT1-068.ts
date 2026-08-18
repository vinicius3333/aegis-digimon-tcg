import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-068";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/level-six-security-attack`,
        description: "[Your Turn] If this Digimon is level 6 or higher, it gains Security Attack +1.",
        isInherited: true,
        when: (ctx) => {
          const self = source.permanent();
          return (
            source.isOwnersTurn() &&
            self?.topCard !== undefined &&
            (ctx.game.definitionOf(self.topCard).level ?? 0) >= 6
          );
        },
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
