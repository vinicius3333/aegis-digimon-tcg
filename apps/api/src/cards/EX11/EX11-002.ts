import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-002";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/can-attack-unsuspended`,
          description:
            "[Your Turn] [Inherited] While your opponent has no Digimon with digivolution " +
            "cards, this Digimon can also attack your opponent's unsuspended Digimon.",
          isInherited: true,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const hasStacked = Array.from(ctx.game.player(opponent).battleArea).some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length > 0,
            );
            if (!hasStacked) {
              ctx.fx.grantCanAttackUnsuspended(self.permanentId, EffectDuration.UntilEachTurnEnd);
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
