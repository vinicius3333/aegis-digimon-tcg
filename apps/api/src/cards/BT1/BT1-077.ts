import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-077";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/battle-memory`,
        description: "[Your Turn] When this Digimon deletes an opponent in battle and survives, gain 1 memory.",
        isInherited: true,
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (!host) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenDeletesInBattle",
            sourcePermanentId: host.permanentId,
            once: false,
            description: `${cardId}: battle deletion`,
            matches: (subCtx) =>
              source.isOwnersTurn() &&
              subCtx.trigger.attackerPermanentId === host.permanentId &&
              subCtx.game.permanentById(host.permanentId) !== undefined,
            run: async (subCtx) => {
              subCtx.fx.gainMemoryForSeat(source.ownerSeat, 1);
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
