import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT8-004";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [staticModifier({
      source,
      effectKey: `${cardId}/inherited-dp`,
      description: "[Opponent's Turn] While all of your Digimon are suspended, this Digimon gets +1000 DP.",
      isInherited: true,
      when: (ctx) => {
        if (source.isOwnersTurn()) return false;
        const ownDigimon = ctx.game.player(source.ownerSeat).battleArea.filter((permanent) =>
          permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
        );
        return ownDigimon.length > 0 && ownDigimon.every((permanent) => permanent.isSuspended);
      },
      resolve: async (ctx) => {
        const host = source.permanent();
        if (host !== undefined) ctx.fx.modifyDP(host.permanentId, 1000, EffectDuration.UntilOpponentTurnEnd);
      },
    })];
  },
};

registerCard(module);
export default module;
