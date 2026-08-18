import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-110";

function hasBlocker(ctx: EffectContext, permanentId: string): boolean {
  const permanent = ctx.game.permanentById(permanentId);
  const printed =
    permanent?.topCard === undefined
      ? false
      : /[<＜]\s*Blocker/i.test(ctx.game.definitionOf(permanent.topCard).effectText ?? "");
  return printed || (ctx.game.hasKeyword?.(permanentId, "Blocker") ?? false);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main-suspend`,
          description: "[Main] Suspend 1 opposing Digimon.",
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (!candidates.length) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen[0]) ctx.fx.suspend([chosen[0]]);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security-suspend`,
          description: "[Security] Suspend all opposing Digimon without Blocker.",
          resolve: async (ctx) => {
            const targets = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter(
                (p) =>
                  p.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(p.topCard)) &&
                  !hasBlocker(ctx, p.permanentId),
              )
              .map((p) => p.permanentId);
            ctx.fx.suspend(targets);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
