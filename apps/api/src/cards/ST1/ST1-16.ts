import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-16";
async function resolve(ctx: EffectContext): Promise<void> {
  const opponent = ctx.game.opponentOf(ctx.source.ownerSeat);
  const candidates = ctx.game
    .player(opponent)
    .battleArea.filter((permanent) => permanent.topCard && isDigimon(ctx.game.definitionOf(permanent.topCard)))
    .map(({ permanentId }) => permanentId);
  if (!candidates.length) return;
  const [picked] =
    candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (picked) await ctx.fx.deletePermanent([picked]);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnUseOption)
      return [activated({ source, effectKey: `${cardId}/main`, description: "Delete 1 opposing Digimon.", resolve })];
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
