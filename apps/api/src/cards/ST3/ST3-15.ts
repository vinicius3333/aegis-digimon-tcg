import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST3-15",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: "ST3-15/main",
          description: "1 opposing Digimon gets Security Attack -3 until the end of its controller's next turn.",
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
            if (chosen[0] !== undefined)
              ctx.fx.grantKeyword(chosen[0], "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -3);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: "ST3-15/security",
          description: "All opposing Digimon get Security Attack -1 for the turn.",
          resolve: async (ctx) => {
            for (const p of ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea)
              if (p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
                ctx.fx.grantKeyword(p.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, -1);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
