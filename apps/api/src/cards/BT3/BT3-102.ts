import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated } from "../../engine/effects/builders.js";
import { requireOpponentAsk } from "../../engine/decisions/decisionApi.js";
import { registerCard } from "../../engine/effects/registry.js";

const module: EffectModule = {
  cardId: "BT3-102",
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseOption) return [];
    return [activated({
      source,
      effectKey: "BT3-102/main",
      description: "[Main] Your opponent may trash the top security card; otherwise recover 1.",
      optional: false,
      resolve: async (ctx) => {
        const opponent = ctx.game.opponentOf(source.ownerSeat);
        const accept = await requireOpponentAsk(ctx).optional(ctx, "Trash the top card of your security stack?");
        if (accept && ctx.game.player(opponent).security.length > 0) {
          await ctx.fx.trashFromSecurity(opponent, 1, { fromTop: true });
          return;
        }
        const top = ctx.game.player(source.ownerSeat).deck[0];
        if (top !== undefined) await ctx.fx.addSecurity(source.ownerSeat, [top.instanceId], { toTop: true });
      },
    })];
  },
};

registerCard(module);
export default module;
