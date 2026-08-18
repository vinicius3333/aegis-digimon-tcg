import { CardColor, CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT7-045";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnAllyAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/reveal-green-for-dp`,
        description:
          "[When Attacking] You may reveal 1 green Digimon card from your hand and place it " +
          "on top of your deck to have this Digimon get +3000 DP for the turn.",
        isInherited: true,
        optional: true,
        canActivate: (ctx) =>
          source.isOnBattleArea() &&
          ctx.game.player(source.ownerSeat).hand.some((card) => {
            const definition = ctx.game.definitionOf(card);
            return definition.kinds.includes(CardKind.Digimon) && definition.colors.includes(CardColor.Green);
          }),
        resolve: async (ctx) => {
          const candidates = ctx.game.player(source.ownerSeat).hand
            .filter((card) => {
              const definition = ctx.game.definitionOf(card);
              return definition.kinds.includes(CardKind.Digimon) && definition.colors.includes(CardColor.Green);
            })
            .map((card) => card.instanceId);
          if (candidates.length === 0) return;
          const selected = candidates.length === 1
            ? candidates
            : await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
          if (selected.length !== 1) return;
          await ctx.fx.returnToDeck(selected, { toTop: true });
          const self = source.permanent();
          if (self) ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilOwnerTurnEnd);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
