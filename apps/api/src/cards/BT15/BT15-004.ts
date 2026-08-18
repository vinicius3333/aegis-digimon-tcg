import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT15-004";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [End of Your Turn] [Inherited] If this Digimon has the [Insectoid] trait,
    // it may attack an opponent's Digimon.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-turn-insectoid-may-attack`,
          description:
            "[End of Your Turn] [Inherited] If this Digimon has the [Insectoid] trait, " +
            "it may attack an opponent's Digimon.",
          optional: true,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          // and the top card of this permanent has the [Insectoid] trait.
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return false;

            // Top card must have [Insectoid] trait (TopCard.CardTraits.Contains("Insectoid")).
            if (self.topCard === undefined) return false;
            const topDef = ctx.game.definitionOf(self.topCard);
            if (!(topDef.types ?? []).includes("Insectoid")) return false;

            // Opponent must have at least one Digimon in play (attack must have a target).
            const oppSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            const oppArea = ctx.game.player(oppSeat).battleArea;
            return oppArea.some((p) => {
              if (p.topCard === undefined) return false;
              return ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon);
            });
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return;
            await ctx.fx.forceAttack(self.permanentId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
