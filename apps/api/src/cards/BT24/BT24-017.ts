import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT24-017 — Medusamon (BT24, Red Lv.6 Digimon).
 *
 * IR, which was badly miscompiled: the parenthetical describing the [Petrification]
 * Token's OWN sub-effects ("Digimon/White/3000 DP / [Your Turn] can't suspend /
 * [On Deletion] trash your top security card") was folded into Medusamon's effects (as a
 * stray Restrict-suspend in [When Digivolving] and a Trash+ModifyDP at [On Deletion]),
 * the +DP was split off into the wrong trigger, the "by" cost was dropped, and the tokens
 * were spawned on the owner's side. The token's own behavior belongs to the token
 * definition, not to Medusamon.
 *
 * Printed text (cards.json effectText; no errata):
 *   ＜Raid＞ ＜Progress＞ ＜Piercing＞
 *   [When Digivolving] Delete 1 of your opponent's lowest DP Digimon. Then, by returning
 *   2 cards from their trash to the bottom of the deck, they play 2 [Petrification]
 *   Tokens. After, this Digimon gets +2000 DP for each of your opponent's Digimon until
 *   their turn ends.
 *
 * KB (node tools/kb/query.mjs card BT24-017):
 *   Q5591/Q5592 (2025-12-25): "by returning 2 cards from their trash to the bottom of the
 *     deck" is a COST — the 2 tokens play only if exactly 2 cards are returned (an
 *     all-or-nothing gate); fewer than 2 in the opponent's trash means no tokens.
 *   Q5594 (2026-02-06): the [Petrification] Tokens are played as the OPPONENT's Digimon.
 */
const cardId = "BT24-017";
const petrificationToken = "Petrification Token";

/** The opponent's battle-area Digimon (a Digimon top card on the opponent's side). */
function opponentDigimon(ctx: EffectContext, oppSeat: Seat): Permanent[] {
  return Array.from(ctx.game.player(oppSeat).battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // --- ＜Raid＞ ＜Progress＞ ＜Piercing＞ (continuous keyword abilities) --------------
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/keywords`,
          description: "＜Raid＞ ＜Progress＞ ＜Piercing＞",
          optional: false,
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;
            ctx.fx.grantKeyword(me.permanentId, "Raid", EffectDuration.Permanent);
            ctx.fx.grantKeyword(me.permanentId, "Progress", EffectDuration.Permanent);
            ctx.fx.grantPierce(me.permanentId, EffectDuration.Permanent);
          },
        }),
      ];
    }

    // --- [When Digivolving] -----------------------------------------------------------
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Delete 1 of your opponent's lowest DP Digimon. Then, by returning 2 cards from their trash to the bottom of the deck, they play 2 [Petrification] Tokens. After, this Digimon gets +2000 DP for each of your opponent's Digimon until their turn ends.",
          optional: false,
          resolve: async (ctx) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);

            // 1. Delete 1 of the opponent's LOWEST DP Digimon (ties: the controller picks).
            const candidates = opponentDigimon(ctx, oppSeat);
            if (candidates.length > 0) {
              const minDp = Math.min(...candidates.map((p) => p.currentDP ?? 0));
              const lowest = candidates.filter((p) => (p.currentDP ?? 0) === minDp);
              const chosenId =
                lowest.length === 1
                  ? lowest[0]!.permanentId
                  : (
                      await ctx.ask.chooseTargets(ctx, {
                        candidates: lowest.map((p) => p.permanentId),
                        min: 1,
                        max: 1,
                      })
                    )[0];
              if (chosenId !== undefined) await ctx.fx.deletePermanent([chosenId]);
            }

            // 2. "By returning 2 cards from their trash to the bottom of the deck, they
            //    play 2 [Petrification] Tokens." All-or-nothing cost (Q5591/Q5592): only
            //    when exactly 2 cards are returned do the tokens play, as the OPPONENT's
            //    Digimon (Q5594).
            const oppTrash = Array.from(ctx.game.player(oppSeat).trash);
            if (oppTrash.length >= 2) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: oppTrash.map((c) => c.instanceId),
                min: 2,
                max: 2,
              });
              if (chosen.length === 2) {
                await ctx.fx.returnToDeck(chosen, { toTop: false });
                for (let i = 0; i < 2; i++) {
                  await ctx.fx.playToken(oppSeat, petrificationToken, { payCost: false });
                }
              }
            }

            // 3. "After, this Digimon gets +2000 DP for each of your opponent's Digimon
            //    until their turn ends" — counts the opponent's Digimon at this point
            //    (post-delete, including any tokens just played on their side).
            const me = source.permanent();
            if (me !== undefined) {
              const perDigimon = opponentDigimon(ctx, oppSeat).length;
              ctx.fx.modifyDP(me.permanentId, 2000 * perDigimon, EffectDuration.UntilOpponentTurnEnd);
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
