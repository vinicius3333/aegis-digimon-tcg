import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT4-047 — Rasielmon (BT4, Yellow Lv.6 Digimon).
 *
 *
 * [When Digivolving] Trigger ＜Recovery +2 (Deck)＞.
 * [At End of Opponent's Turn] Trash the top card of your security stack.
 */
const cardId = "BT4-047";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] ＜Recovery +2 (Deck)＞
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/recovery-plus-2`,
          description:
            "[When Digivolving] ＜Recovery +2 (Deck)＞ (Place the top 2 cards of your deck " +
            "on top of your security stack.)",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.recoverToSecurity(source.ownerSeat, 2);
          },
        }),
      ];
    }

    // [End of Opponent's Turn] Trash the top card of your security stack.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-opponent-turn-trash-security`,
          description: "[At End of Opponent's Turn] Trash the top card of your security stack.",
          optional: false,
          when: (ctx) =>
            ctx.source.isOnBattleArea() && !ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const player = ctx.game.player(source.ownerSeat);
            return player.security.length >= 1;
          },
          resolve: async (ctx) => {
            await ctx.fx.trashFromSecurity(source.ownerSeat, 1, { fromTop: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
