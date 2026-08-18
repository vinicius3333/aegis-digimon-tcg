import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT13-092";

function opponentTrashDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const opp = ctx.game.opponentOf(source.ownerSeat);
  return ctx.game.player(opp).trash
    .filter((c) => ctx.game.definitionOf(c).kinds.includes(CardKind.Digimon))
    .map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] trash 1 opp hand card; if opp hand ≤7, add top security to opp hand
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Search your opponent's hand, and trash 1 card among it. " +
            "Then, if they have 7 or fewer cards in their hand, they add the top card of " +
            "their security stack to their hand.",
          optional: false,
          canActivate: (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opp);
            return oppPlayer.hand.length >= 1 || (oppPlayer.hand.length <= 7 && oppPlayer.security.length >= 1);
          },
          resolve: async (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opp);

            if (oppPlayer.hand.length >= 1) {
              const handIds = oppPlayer.hand.map((c) => c.instanceId);
              const chosen = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 1, max: 1 });
              if (chosen.length > 0) await ctx.fx.trash(chosen);
            }

            // Check hand count after the trash
            if (oppPlayer.hand.length <= 7 && oppPlayer.security.length >= 1) {
              const topSec = oppPlayer.security[0];
              if (topSec !== undefined) {
                await ctx.fx.returnToHand([topSec.instanceId]);
              }
            }
          },
        }),
      ];
    }

    // [When Attacking] optional: return 1 opp trash Digimon to deck bottom →
    // delete all opp Digimon sharing its exact name
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking`,
          description:
            "[When Attacking] By returning 1 Digimon card from your opponent's trash to the " +
            "bottom of their deck, delete all of your opponent's Digimon with the same name " +
            "as the returned card.",
          optional: true,
          canActivate: (ctx) => opponentTrashDigimonIds(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const candidates = opponentTrashDigimonIds(ctx, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;

            const returnedInstanceId = chosen[0]!;
            const opp = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opp);
            const returnedCard = oppPlayer.trash.find((c) => c.instanceId === returnedInstanceId);
            if (returnedCard === undefined) return;

            const returnedDef = ctx.game.definitionOf(returnedCard);
            await ctx.fx.returnToDeck([returnedInstanceId], { toTop: false });

            // Delete all opp battle-area Digimon with the same name (KB Q2337)
            const targets = oppPlayer.battleArea
              .filter((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!def.kinds.includes(CardKind.Digimon)) return false;
                return def.nameEn === returnedDef.nameEn;
              })
              .map((p) => p.permanentId);
            if (targets.length > 0) await ctx.fx.deletePermanent(targets);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
