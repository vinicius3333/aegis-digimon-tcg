import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
async function lock(ctx: EffectContext, ownerSeat: 0 | 1, duration: EffectDuration): Promise<void> {
  const candidates = ctx.game
    .player(ctx.game.opponentOf(ownerSeat))
    .battleArea.filter(
      (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length === 0,
    )
    .map(({ permanentId }) => permanentId);
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: Math.min(1, candidates.length), max: 1 });
  if (chosen[0] !== undefined) {
    ctx.fx.restrict(chosen[0], "attack", duration);
    ctx.fx.restrict(chosen[0], "block", duration);
  }
}
const module: EffectModule = {
  cardId: "ST2-14",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: "ST2-14/main",
          description: "A sourceless opposing Digimon can't attack or block through its next turn.",
          resolve: (ctx) => lock(ctx, source.ownerSeat, EffectDuration.UntilOpponentTurnEnd),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: "ST2-14/security",
          description: "A sourceless opposing Digimon can't attack or block through your next turn.",
          resolve: (ctx) => lock(ctx, source.ownerSeat, EffectDuration.UntilOwnerTurnEnd),
        }),
      ];
    return [];
  },
};
registerCard(module);
