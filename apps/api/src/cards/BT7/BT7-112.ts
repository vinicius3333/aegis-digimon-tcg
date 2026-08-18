import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT7-112 — Susanoomon (BT7, White Lv.7 Digimon).
 *
 *
 * Printed text (no errata):
 *   ＜Security Attack +2＞
 *   You may digivolve this card from your hand onto one of your Tamers as if the Tamer
 *   is a level 6 Digimon by placing 10 Tamer cards and/or cards with [Hybrid] in their
 *   traits from your hand and/or trash at the bottom of your deck in any order.
 *   [When Digivolving] Delete 1 of your opponent's Digimon.
 *
 * Q1681/Q1684: the alternate digivolution onto a Tamer is handled by the digivolution
 * requirement system (alternate path: onto Tamer, cost 7, placement cost of 10 cards).
 * The engine reads this from the card data definitions; this module handles the
 * static keyword and the WhenDigivolving delete.
 */
const cardId = "BT7-112";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Security Attack +2＞ static keyword.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/sa2`,
          description: "＜Security Attack +2＞",
          optional: false,
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me !== undefined) {
              ctx.fx.grantKeyword(me.permanentId, "SecurityAttack", EffectDuration.Permanent, 2);
            }
          },
        }),
      ];
    }

    // [When Digivolving] Delete 1 of your opponent's Digimon.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete`,
          description: "[When Digivolving] Delete 1 of your opponent's Digimon.",
          optional: false,
          canActivate: (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opp.battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def);
            });
          },
          resolve: async (ctx) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);
            const candidateIds = opp.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def);
              })
              .map((p) => p.permanentId);

            if (candidateIds.length === 0) return;

            const selected = await ctx.ask.chooseTargets(ctx, {
              candidates: candidateIds,
              min: 1,
              max: 1,
            });

            if (selected.length > 0) {
              await ctx.fx.deletePermanent(selected);
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
