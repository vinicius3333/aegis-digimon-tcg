// @ts-nocheck
import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT8-096 — Top Gun (BT8, Red Option).
 *
 *
 * Printed text (no errata):
 *   [Main] Delete 1 of your opponent's Digimon with 4000 DP or less. If you have a
 *   Digimon in play with 2 or more colors, or with 2 or more colors in one of its
 *   digivolution cards, delete 1 of your opponent's Digimon with 7000 DP or less instead.
 *   [Security] Activate this card's [Main] effect.
 *
 * Q1771-Q1772: "2 or more colors in a digivolution card" checks printed colors only.
 * The two deletes are mutually exclusive ("instead").
 */
const cardId = "BT8-096";

function hasMulticolorDigimon(ctx: { game: { player: Function; opponentOf: Function } }, source: CardSource): boolean {
  const owner = (ctx.game as any).player(source.ownerSeat);
  for (const p of owner.battleArea) {
    if (p.topCard === undefined) continue;
    const def = (ctx.game as any).definitionOf(p.topCard);
    if (isDigimon(def) && def.colors.length >= 2) return true;
  }
  return false;
}

function hasDivoCardWithMulticolor(ctx: { game: { player: Function; opponentOf: Function } }, source: CardSource): boolean {
  const owner = (ctx.game as any).player(source.ownerSeat);
  for (const p of owner.battleArea) {
    for (const card of p.stack) {
      const def = (ctx.game as any).definitionOf(card);
      if (def.colors && def.colors.length >= 2) return true;
    }
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Delete opponent Digimon (4000 or 7000 DP depending on condition).
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-delete`,
          description:
            "[Main] Delete 1 of your opponent's Digimon with 4000 DP or less. If you have a " +
            "Digimon in play with 2 or more colors, or with 2 or more colors in one of its " +
            "digivolution cards, delete 1 of your opponent's Digimon with 7000 DP or less instead.",
          optional: false,
          canActivate: (ctx: any) => {
            const cond = hasMulticolorDigimon(ctx, source) || hasDivoCardWithMulticolor(ctx, source);
            const dpCap = cond ? 7000 : 4000;
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opp.battleArea.some((p: any) => {
              return p.currentDP <= dpCap && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard));
            });
          },
          resolve: async (ctx: any) => {
            const cond = hasMulticolorDigimon(ctx, source) || hasDivoCardWithMulticolor(ctx, source);
            const dpCap = cond ? 7000 : 4000;
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);

            const candidateIds = opp.battleArea
              .filter((p: any) => p.currentDP <= dpCap && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p: any) => p.permanentId);

            if (candidateIds.length === 0) return;

            const selected = await ctx.ask.selectPermanents(ctx, {
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

    // [Security] Activate this card's [Main] effect.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-main`,
          description: "[Security] Activate this card's [Main] effect.",
          optional: false,
          resolve: async (ctx: any) => {
            const cond = hasMulticolorDigimon(ctx, source) || hasDivoCardWithMulticolor(ctx, source);
            const dpCap = cond ? 7000 : 4000;
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);

            const candidateIds = opp.battleArea
              .filter((p: any) => p.currentDP <= dpCap && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p: any) => p.permanentId);

            if (candidateIds.length === 0) return;

            const selected = await ctx.ask.selectPermanents(ctx, {
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
