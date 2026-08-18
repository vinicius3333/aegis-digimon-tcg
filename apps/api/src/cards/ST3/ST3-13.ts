import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST3-13",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: "ST3-13/main",
          description: "1 of your Digimon gets +3000 DP for the turn.",
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map(({ permanentId }) => permanentId);
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: Math.min(1, candidates.length),
              max: 1,
            });
            if (chosen[0] !== undefined) ctx.fx.modifyDP(chosen[0], 3000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: "ST3-13/security",
          description: "All your Digimon get +5000 DP for the turn; add this card to hand.",
          resolve: async (ctx) => {
            for (const p of ctx.game.player(source.ownerSeat).battleArea)
              if (p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
                ctx.fx.modifyDP(p.permanentId, 5000, EffectDuration.UntilEachTurnEnd);
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
