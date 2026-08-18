import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-008";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/suspended-dp`,
        description: "[Your Turn] While the opponent has 2 suspended Digimon, this Digimon gets +2000 DP.",
        isInherited: true,
        when: (ctx) => {
          if (!source.isOwnersTurn()) return false;
          const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
          return (
            opponent.battleArea.filter(
              (permanent) =>
                permanent.topCard !== undefined &&
                isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
                permanent.isSuspended,
            ).length >= 2
          );
        },
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) ctx.fx.modifyDP(self.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
