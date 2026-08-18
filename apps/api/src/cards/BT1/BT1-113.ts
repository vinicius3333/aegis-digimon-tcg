import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-113";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] 1 opposing Digimon can't attack or block through the opponent's turn.",
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (!candidates.length) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (!chosen[0]) return;
            ctx.fx.restrict(chosen[0], "attack", EffectDuration.UntilOpponentTurnEnd);
            ctx.fx.restrict(chosen[0], "block", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] All opposing Digimon can't unsuspend through the opponent's turn.",
          resolve: async (ctx) => {
            for (const p of ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea)
              if (p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
                ctx.fx.restrict(p.permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
