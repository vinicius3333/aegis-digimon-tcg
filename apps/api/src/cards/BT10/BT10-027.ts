import { EffectTiming, isDigimon, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT10-027";

function sourcesAtLevel(ctx: EffectContext, source: CardSource, level: number): CardInstance[] {
  const self = source.permanent();
  if (!self) return [];
  return self.stack.filter((card) => {
    const definition = ctx.game.definitionOf(card);
    return isDigimon(definition) && definition.level === level;
  });
}

function opponentHasSourceLessDigimon(ctx: EffectContext, source: CardSource): boolean {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return opponent.battleArea.some((permanent) => {
    if (!permanent.topCard || permanent.stack.length !== 0) return false;
    return isDigimon(ctx.game.definitionOf(permanent.topCard));
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [whenDigivolving({
        source,
        effectKey: `${cardId}/when-digivolving`,
        description: "[When Digivolving] Trash 2 bottom digivolution cards from 1 opposing Digimon.",
        resolve: async (ctx) => {
          const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
          const candidates = opponent.battleArea
            .filter((permanent) => permanent.stack.length > 0)
            .map((permanent) => permanent.permanentId);
          if (candidates.length === 0) return;
          const selected = await ctx.ask.selectPermanents(ctx, {
            candidates,
            min: 1,
            max: 1,
          });
          const target = ctx.game.permanentById(selected[0] ?? "");
          if (!target) return;
          const bottomCards = target.stack.slice(0, 2).map((card) => card.instanceId);
          if (bottomCards.length > 0) {
            await ctx.fx.trashDigivolutionCards(target.permanentId, bottomCards, {
              byEffectSeat: source.ownerSeat,
            });
          }
        },
      })];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [whenAttacking({
        source,
        effectKey: `${cardId}/when-attacking`,
        description:
          "[When Attacking] If your opponent has a Digimon with no digivolution cards, " +
          "you may play 1 level 3 and 1 level 4 Digimon card from this Digimon's sources for free.",
        optional: true,
        when: (ctx) => opponentHasSourceLessDigimon(ctx, source),
        canActivate: (ctx) =>
          sourcesAtLevel(ctx, source, 3).length > 0 || sourcesAtLevel(ctx, source, 4).length > 0,
        resolve: async (ctx) => {
          const chosen: string[] = [];
          for (const level of [3, 4]) {
            const candidates = sourcesAtLevel(ctx, source, level);
            if (candidates.length === 0) continue;
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((card) => card.instanceId),
              min: 1,
              max: 1,
            });
            if (selected[0]) chosen.push(selected[0]);
          }
          if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
        },
      })];
    }

    return [];
  },
};

registerCard(module);
export default module;
