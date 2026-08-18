import { EffectTiming, EffectDuration } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-005";

const requiredSecurityCount = 6;
const dpBonus = 2000;

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Static (inherited): while this is in play on your turn, if you have 6 or more
    // security cards, this Digimon gets +2000 DP.
    // condition: IsExistOnBattleArea && IsOwnerTurn && Owner.SecurityCards.Count >= 6).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/dp-plus-2000-when-6-security`,
          description:
            "While this is in play, on your turn, if you have 6 or more security cards, " +
            "this Digimon gets +2000 DP.",
          isInherited: true,
          // source condition (the factory also ANDs IsExistOnBattleAreaDigimon):
          // on the battle area, your turn, and you have 6+ security cards.
          when: (ctx) =>
            source.isOnBattleArea() &&
            source.isOwnersTurn() &&
            ctx.game.player(source.ownerSeat).security.length >= requiredSecurityCount,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) {
              ctx.fx.modifyDP(self.permanentId, dpBonus, EffectDuration.UntilEachTurnEnd);
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
