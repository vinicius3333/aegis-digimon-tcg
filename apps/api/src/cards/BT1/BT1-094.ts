import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-094";
async function deleteBlocker(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (p) =>
        p.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(p.topCard)) &&
        (ctx.game.hasKeyword?.(p.permanentId, "Blocker") ?? false),
    )
    .map((p) => p.permanentId);
  if (!candidates.length) return;
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen[0]) await ctx.fx.deletePermanent([chosen[0]]);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] Delete 1 opposing Digimon with Blocker.",
          resolve: async (ctx) => {
            await deleteBlocker(ctx, source);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's Main effect.",
          resolve: async (ctx) => {
            await deleteBlocker(ctx, source);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
