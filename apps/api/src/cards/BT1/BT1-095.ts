import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-095";
async function resolveShield(ctx: EffectContext, source: CardSource, duration: EffectDuration): Promise<void> {
  const candidates = ctx.game
    .player(source.ownerSeat)
    .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
  if (!candidates.length) return;
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (!chosen[0]) return;
  ctx.fx.unsuspend([chosen[0]]);
  ctx.fx.grantKeyword(chosen[0], "Blocker", duration);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] Unsuspend 1 of your Digimon and give it Blocker until the opponent's turn ends.",
          resolve: async (ctx) => {
            await resolveShield(ctx, source, EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Unsuspend 1 of your Digimon and give it Blocker for the turn.",
          resolve: async (ctx) => {
            await resolveShield(ctx, source, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
