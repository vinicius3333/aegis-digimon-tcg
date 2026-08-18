import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-079";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/retaliation`,
          description: "＜Retaliation＞",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Retaliation", EffectDuration.Permanent);
          },
        }),
      ];
    }
    if (timing !== EffectTiming.OnDestroyedAnyone) return [];
    return [
      onDeletion({
        source,
        effectKey: `${cardId}/draw-then-trash`,
        description: "[On Deletion] Draw 1. Then, trash 1 card in your hand.",
        resolve: async (ctx) => {
          await ctx.fx.draw(source.ownerSeat, 1);
          const candidates = ctx.game.player(source.ownerSeat).hand.map(({ instanceId }) => instanceId);
          if (candidates.length === 0) return;
          const selected = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
          if (selected.length === 1) await ctx.fx.trash(selected, { byEffectSeat: source.ownerSeat });
        },
      }),
    ];
  },
};
registerCard(module);
