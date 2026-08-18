import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST3-14",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: "ST3-14/main",
          description: "1 opposing Digimon gets -2000 DP for the turn.",
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map(({ permanentId }) => permanentId);
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: Math.min(1, candidates.length),
              max: 1,
            });
            if (chosen[0] !== undefined) ctx.fx.modifyDP(chosen[0], -2000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: "ST3-14/security",
          description: "Add this card to hand.",
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
