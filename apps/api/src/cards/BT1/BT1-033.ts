import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-033";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/source-less-dp`,
        description: "[Your Turn] If the opponent has a source-less Digimon, this Digimon gets +1000 DP.",
        isInherited: true,
        when: (ctx) =>
          source.isOwnersTurn() &&
          ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length === 0,
            ),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) ctx.fx.modifyDP(self.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
