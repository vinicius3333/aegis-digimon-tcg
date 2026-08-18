import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT9-083 — White Lv.7 Digimon (BT9, Omnimon: Merciful Mode).
//
// Digivolve: 3 if name contains [Omnimon]
// [When Digivolving] For each card with [Mega] in their traits in this Digimon's
//   digivolution cards, delete 1 of your opponent's Digimon. Then, place 10 cards from
//   your opponent's trash at the bottom of their deck in any order.
// [Start of Your Turn] Trash the top card of this Digimon. If you do, trash the top
//   card of your opponent's security stack.

const cardId = "BT9-083";

function countMegaInStack(ctx: EffectContext, source: CardSource): number {
  const perm = source.permanent();
  if (perm === undefined) return 0;
  return Array.from(perm.stack).filter((card) => {
    const forms = ctx.game.definitionOf(card).forms ?? [];
    return forms.includes("Mega");
  }).length;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] For each card with [Mega] in their traits in this Digimon's " +
            "digivolution cards, delete 1 of your opponent's Digimon. Then, place 10 cards from " +
            "your opponent's trash at the bottom of their deck in any order.",
          canActivate: (ctx) => {
            const mega = countMegaInStack(ctx, source);
            if (mega < 1) {
              const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
              return opp.trash.length > 0;
            }
            return true;
          },
          resolve: async (ctx) => {
            const mega = countMegaInStack(ctx, source);
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));

            const oppDigimons = Array.from(opponent.battleArea).filter((p) => {
              return p.topCard != null && isDigimon(ctx.game.definitionOf(p.topCard));
            });

            const deleteCount = Math.min(mega, oppDigimons.length);
            if (deleteCount > 0 && oppDigimons.length > 0) {
              const cands = oppDigimons.map((p) => p.permanentId);
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: cands,
                min: deleteCount,
                max: deleteCount,
              });
              if (chosen.length > 0) {
                await ctx.fx.deletePermanent(chosen, "byEffect");
              }
            }

            if (opponent.trash.length > 0) {
              const maxReturn = Math.min(10, opponent.trash.length);
              const trashCands = Array.from(opponent.trash).map((c) => c.instanceId);
              let chosen = trashCands;
              if (trashCands.length > maxReturn) {
                chosen = await ctx.ask.selectCards(ctx, {
                  candidates: trashCands,
                  min: maxReturn,
                  max: maxReturn,
                  visibleCards: Array.from(opponent.trash).map((card) => ({
                    instanceId: card.instanceId,
                    cardId: card.cardId,
                  })),
                });
              }
              if (chosen.length > 1 && ctx.ask.orderCards !== undefined) {
                chosen = await ctx.ask.orderCards(ctx, {
                  candidates: chosen,
                  visibleCards: Array.from(opponent.trash)
                    .filter((card) => chosen.includes(card.instanceId))
                    .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                });
              }
              if (chosen.length > 0) {
                await ctx.fx.returnToDeck(chosen, { toTop: false });
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn`,
          description:
            "[Start of Your Turn] Trash the top card of this Digimon. If you do, trash the top card of your opponent's security stack.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const perm = source.permanent();
            if (perm === undefined) return false;
            return perm.stack.length >= 1;
          },
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (perm === undefined || perm.stack.length === 0) return;

            const topStack = perm.stack[perm.stack.length - 1];
            if (topStack === undefined) return;

            await ctx.fx.trashDigivolutionCards(perm.permanentId, [topStack.instanceId]);

            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            if (opponent.security.length > 0) {
              await ctx.fx.trashFromSecurity(opponent.seat, 1, { fromTop: true });
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
