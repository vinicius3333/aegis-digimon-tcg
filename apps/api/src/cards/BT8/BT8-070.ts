// @ts-nocheck
import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT8-070 — BlackWarGreymon (BT8, Black Lv.6 Digimon).
 *
 *
 * Printed text (errata 2022-05-20):
 *   [When Digivolving] If this Digimon has a red digivolution card, choose any number of
 *   your opponent's Digimon. If this Digimon has a black digivolution card, choose any
 *   number of your opponent's Tamers. The chosen cards' play costs must add up to 6 or
 *   less. Delete the chosen cards.
 *   [All Turns][Once Per Turn] When an opponent's Digimon is deleted, you may unsuspend
 *   this Digimon.
 *
 * KB Q1751-Q1753: if both red and black digi cards are present, can choose both
 * Digimon and Tamers. Total combined play cost ≤ 6.
 */
const cardId = "BT8-070";

function hasRedDivocard(source: CardSource, ctx: EffectContext): boolean {
  const me = source.permanent();
  if (me === undefined) return false;
  return me.stack.some((c) => {
    const def = ctx.game.definitionOf(c);
    return def.colors.includes("Red" as any);
  });
}

function hasBlackDivocard(source: CardSource, ctx: EffectContext): boolean {
  const me = source.permanent();
  if (me === undefined) return false;
  return me.stack.some((c) => {
    const def = ctx.game.definitionOf(c);
    return def.colors.includes("Black" as any);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Select opponent Digimon (if red) and/or Tamers (if black)
    // whose total play costs ≤ 6, then delete them.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-budget`,
          description:
            "[When Digivolving] If this Digimon has a red digivolution card, choose any number of " +
            "your opponent's Digimon. If this Digimon has a black digivolution card, choose any " +
            "number of your opponent's Tamers. The chosen cards' play costs must add up to 6 or " +
            "less. Delete the chosen cards.",
          optional: false,
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const hasRed = hasRedDivocard(source, ctx);
            const hasBlack = hasBlackDivocard(source, ctx);
            if (!hasRed && !hasBlack) return false;

            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opp.battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              const playCost = (def as any).playCost ?? 0;
              if (playCost > 6) return false;
              if (hasRed && isDigimon(def)) return true;
              if (hasBlack && isTamer(def)) return true;
              return false;
            });
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;

            const hasRed = hasRedDivocard(source, ctx);
            const hasBlack = hasBlackDivocard(source, ctx);
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);

            const candidates: { id: string; cost: number }[] = [];
            for (const p of opp.battleArea) {
              if (p.topCard === undefined) continue;
              const def = ctx.game.definitionOf(p.topCard);
              const playCost = (def as any).playCost ?? 0;
              if (playCost > 6) continue;
              if (hasRed && isDigimon(def)) {
                candidates.push({ id: p.permanentId, cost: playCost });
              }
              if (hasBlack && isTamer(def)) {
                candidates.push({ id: p.permanentId, cost: playCost });
              }
            }

            if (candidates.length === 0) return;

            const picked = await ctx.ask.selectPermanents(ctx, {
              candidates: candidates.map(({ id }) => id),
              min: 0,
              max: candidates.length,
              maxTotalPlayCost: 6,
            });

            // The overlay prevents an over-budget confirmation, but the engine remains
            // authoritative if a hostile client sends one anyway.
            const selected: string[] = [];
            let spent = 0;
            for (const id of picked) {
              const entry = candidates.find((candidate) => candidate.id === id);
              if (entry !== undefined && spent + entry.cost <= 6) {
                selected.push(id);
                spent += entry.cost;
              }
            }

            if (selected.length > 0) {
              await ctx.fx.deletePermanent(selected);
            }
          },
        }),
      ];
    }

    // [All Turns][Once Per Turn] When an opponent's Digimon is deleted, you may
    // unsuspend this Digimon.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/unsuspend-on-deletion`,
          description:
            "[All Turns][Once Per Turn] When an opponent's Digimon is deleted, " +
            "you may unsuspend this Digimon.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const deleted = ctx.trigger?.deletedInstanceIds;
            if (deleted === undefined) return true;
            // Check if any deleted card belonged to the opponent and was a Digimon.
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const stackCards = new Set(ctx.trigger?.deletedWasStackInstanceIds ?? []);
            return ctx.game.player(oppSeat).trash.some((card) => {
              if (!deleted.includes(card.instanceId) || stackCards.has(card.instanceId)) return false;
              return isDigimon(ctx.game.definitionOf(card));
            });
          },
          canActivate: (ctx) => {
            const me = source.permanent();
            return me !== undefined && me.isSuspended;
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me !== undefined) {
              ctx.fx.unsuspend([me.permanentId]);
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
