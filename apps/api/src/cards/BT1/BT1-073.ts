import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-073";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/suspended-dp`,
        description: "[Your Turn] This Digimon gets +1000 DP per suspended opposing Digimon.",
        isInherited: true,
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const count = ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.filter(
              (p) => p.isSuspended && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            ).length;
          const self = source.permanent();
          if (self && count > 0) ctx.fx.modifyDP(self.permanentId, 1000 * count, EffectDuration.UntilEachTurnEnd);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
