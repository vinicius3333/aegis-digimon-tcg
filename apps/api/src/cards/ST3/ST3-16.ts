import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
async function main(ctx: EffectContext, ownerSeat: 0 | 1): Promise<void> {
  const candidates = ctx.game
    .player(ctx.game.opponentOf(ownerSeat))
    .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map(({ permanentId }) => permanentId);
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: Math.min(1, candidates.length), max: 1 });
  if (chosen[0] !== undefined) ctx.fx.modifyDP(chosen[0], -10000, EffectDuration.UntilEachTurnEnd);
}
const module: EffectModule = {
  cardId: "ST3-16",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: "ST3-16/main",
          description: "1 opposing Digimon gets -10000 DP for the turn.",
          resolve: (ctx) => main(ctx, source.ownerSeat),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: "ST3-16/security",
          description: "Activate this card's Main effect.",
          resolve: (ctx) => main(ctx, source.ownerSeat),
        }),
      ];
    return [];
  },
};
registerCard(module);
