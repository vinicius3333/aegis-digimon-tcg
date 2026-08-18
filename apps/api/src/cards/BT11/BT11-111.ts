import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, turnTiming, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-111";
const isVemmon = (name: string): boolean => name.includes("Vemmon");
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/place-delete`,
          description: "Place up to 4 Vemmon from trash; with 8 Vemmon delete a Digimon.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const candidates = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) => isVemmon(ctx.game.definitionOf(card).nameEn))
              .map(({ instanceId }) => instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: Math.min(4, candidates.length) });
            if (chosen.length > 0) await ctx.fx.placeUnder(self.permanentId, chosen, { belowTop: false });
            const current = ctx.game.permanentById(self.permanentId);
            if (
              current === undefined ||
              current.stack.filter((card) => isVemmon(ctx.game.definitionOf(card).nameEn)).length < 8
            )
              return;
            const enemies = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map(({ permanentId }) => permanentId);
            const picked = await ctx.ask.chooseTargets(ctx, {
              candidates: enemies,
              min: Math.min(1, enemies.length),
              max: 1,
            });
            if (picked.length > 0) await ctx.fx.deletePermanent(picked, "byEffect");
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/leave-prevention`,
          description: "Bottom-deck 4 Vemmon sources to prevent leaving.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "prevent",
              description: "BT11-111 leave prevention",
              protects: (_subCtx, id) => id === self.permanentId,
              preventCheck: async (subCtx) => {
                const current = subCtx.game.permanentById(self.permanentId);
                if (current === undefined) return false;
                const candidates = current.stack.filter((card) => isVemmon(subCtx.game.definitionOf(card).nameEn));
                if (
                  candidates.length < 4 ||
                  !(await subCtx.ask.optional(subCtx, "Bottom-deck 4 Vemmon to prevent leaving?"))
                )
                  return false;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map(({ instanceId }) => instanceId),
                  min: 4,
                  max: 4,
                });
                return (await subCtx.fx.returnToDeck(chosen, { toTop: false })).length === 4;
              },
            });
          },
        }),
      ];
    if (timing === EffectTiming.OnStartMainPhase)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main`,
          description: "Trash opponent's top security.",
          resolve: async (ctx) => {
            await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
