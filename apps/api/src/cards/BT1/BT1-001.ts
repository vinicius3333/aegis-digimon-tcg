import { EffectTiming, EffectDuration } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-001";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Inherited [When Attacking]: if this Digimon attacks an opponent's Digimon,
    // it gets +1000 DP for the turn (source OnAllyAttack rule implementation).
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/dp-plus-1000`,
          description:
            "[When Attacking] If you attack an opponent's Digimon, this Digimon gets +1000 DP for the turn.",
          optional: false,
          isInherited: true,
          // attack target is a Digimon, i.e. a defending permanent exists.
          when: (ctx) => {
            const self = source.permanent();
            return (
              self != null &&
              ctx.trigger.attackerPermanentId === self.permanentId &&
              ctx.trigger.targetPermanentId != null
            );
          },
          canActivate: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) {
              ctx.fx.modifyDP(self.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
