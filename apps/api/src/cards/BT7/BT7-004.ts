import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT7-004";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-reveal-top`,
          description:
            "[When Attacking] Reveal the top card of your deck, and place it at the top or bottom of your deck.",
          optional: false,
          isInherited: true,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => {
            const revealed = await ctx.fx.reveal(source.ownerSeat, 1);
            if (revealed.length === 0) return;

            const card = revealed[0]!;
            // RemainingCardsPlace.DeckTopOrBottom: player chooses top (0) or bottom (1).
            const choice = await ctx.ask.chooseOption(ctx, ["top", "bottom"]);
            await ctx.fx.returnToDeck([card.instanceId], { toTop: choice === 0 });
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
