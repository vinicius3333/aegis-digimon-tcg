import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX1-022";

const module: EffectModule = { cardId, effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
  if (timing === EffectTiming.WhenDigivolving) return [whenDigivolving({
    source,
    effectKey: `${cardId}/free-source-unsuspend-and-suspend`,
    description: "[When Digivolving] With a Free card in this Digimon's sources, unsuspend it and suspend 1 opposing Digimon.",
    when: (ctx) => source.permanent()?.stack.some((card) => { const def = ctx.game.definitionOf(card); return (def.types ?? []).includes("Free") || (def.attributes ?? []).includes("Free"); }) ?? false,
    resolve: async (ctx) => {
      const self = source.permanent();
      if (self === undefined) return;
      await ctx.fx.unsuspend([self.permanentId]);
      const opponent = ctx.game.opponentOf(source.ownerSeat);
      const candidates = ctx.game.player(opponent).battleArea.filter((p) => isDigimon(ctx.game.definitionOf(p.topCard)) && !p.isSuspended).map((p) => p.permanentId);
      if (candidates.length === 0) return;
      const chosen = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 });
      if (chosen[0] !== undefined) await ctx.fx.suspend([chosen[0]]);
    },
  })];
  if (timing === EffectTiming.None) return [staticModifier({
    source,
    effectKey: `${cardId}/dp-per-source-color`,
    description: "[Your Turn] +1000 DP for each color in this Digimon's digivolution cards.",
    when: () => source.isOwnersTurn(),
    resolve: async (ctx) => {
      const self = source.permanent();
      if (self === undefined) return;
      const colors = new Set<string>();
      for (const card of self.stack) {
        for (const color of ctx.game.definitionOf(card).colors) colors.add(color);
      }
      if (colors.size > 0) ctx.fx.modifyDP(self.permanentId, colors.size * 1000, EffectDuration.UntilEachTurnEnd);
    },
  })];
  return [];
} };

registerCard(module);
export default module;
