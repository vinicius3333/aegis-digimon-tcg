import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT5-018";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnAllyAttack) return [];

    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/when-attacking-trash-red-digimon-dp-boost`,
        description:
          "[When Attacking] You may trash 1 red Digimon card in your hand to add the " +
          "trashed card's DP to this Digimon for the turn.",
        optional: false,
        canActivate: (ctx) => {
          if (!ctx.source.isOnBattleArea()) return false;
          const owner = ctx.game.player(source.ownerSeat);
          return owner.hand.some((c) => {
            const def = ctx.game.definitionOf(c);
            return isDigimon(def) && def.colors.includes(CardColor.Red);
          });
        },
        resolve: async (ctx) => {
          const owner = ctx.game.player(source.ownerSeat);
          const candidates = owner.hand
            .filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && def.colors.includes(CardColor.Red);
            })
            .map((c) => c.instanceId);

          if (candidates.length === 0) return;

          const selected = await ctx.ask.selectCards(ctx, {
            candidates,
            min: 0,
            max: 1,
          });

          if (selected.length === 0) return;

          // Find the trashed card's DP before it moves zones (it's still in hand).
          const instanceId = selected[0]!;
          const handCard = owner.hand.find((c) => c.instanceId === instanceId);
          const dp = handCard !== undefined ? (ctx.game.definitionOf(handCard).dp ?? 0) : 0;

          await ctx.fx.trash(selected);

          // Add the trashed card's DP to this Digimon for the turn (Q1294: stacks).
          if (dp > 0) {
            const me = source.permanent();
            if (me !== undefined) {
              ctx.fx.modifyDP(me.permanentId, dp, EffectDuration.UntilEachTurnEnd);
            }
          }
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
