import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-15";
async function resolve(ctx: EffectContext): Promise<void> {
  const opponent = ctx.game.opponentOf(ctx.source.ownerSeat);
  const candidates = ctx.game
    .player(opponent)
    .battleArea.filter(
      (permanent) =>
        permanent.topCard && isDigimon(ctx.game.definitionOf(permanent.topCard)) && permanent.currentDP <= 4000,
    )
    .map(({ permanentId }) => permanentId);
  if (!candidates.length) return;
  const selected = await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: Math.min(2, candidates.length) });
  if (selected.length) await ctx.fx.deletePermanent(selected);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "Delete up to 2 opposing 4000 DP or lower Digimon.",
          resolve,
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "Activate this card's Main effect.",
          resolve,
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
