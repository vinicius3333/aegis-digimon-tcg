import { EffectTiming, EffectDuration } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onAddHand } from "../../engine/effects/builders.js"; // turnTiming family covers OnAddHand
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT15-002";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnAddHand) return [];

    return [
      onAddHand({
        source,
        effectKey: `${cardId}/dp-plus-1000`,
        description:
          "[Your Turn] [Once Per Turn] When one of your Digimon's effects adds cards to your hand, " +
          "this Digimon gets +1000 DP until the end of your opponent's turn.",
        optional: false,
        isInherited: true,
        maxPerTurn: 1,
        when: (ctx) =>
          source.isOnBattleArea() &&
          source.isOwnersTurn() &&
          ctx.trigger.addedToHand?.byEffect != null &&
          ctx.trigger.addedToHand.byEffect.ownerSeat === source.ownerSeat &&
          ctx.trigger.addedToHand.byEffect.isDigimonEffect === true,
        canActivate: () => source.isOnBattleArea(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) {
            ctx.fx.modifyDP(self.permanentId, 1000, EffectDuration.UntilOpponentTurnEnd);
          }
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
