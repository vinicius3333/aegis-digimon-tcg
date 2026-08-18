import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-039";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseAttack) return [];
    return [
      whenAttacking({
        source,
        effectKey: `${cardId}/trash-three-unsuspend`,
        description: "[When Attacking][Twice Per Turn] By trashing 3 cards in hand, unsuspend this Digimon.",
        optional: true,
        maxPerTurn: 2,
        canActivate: (ctx) => ctx.game.player(source.ownerSeat).hand.length >= 3,
        resolve: async (ctx) => {
          const candidates = ctx.game.player(source.ownerSeat).hand.map((card) => card.instanceId);
          const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 3, max: 3 });
          if (chosen.length !== 3) return;
          const trashed = await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
          const self = source.permanent();
          if (trashed.length === 3 && self !== undefined) ctx.fx.unsuspend([self.permanentId]);
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
