import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST1-13";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "One of your Digimon gets +3000 DP for the turn.",
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter(
                (permanent) => permanent.topCard && isDigimon(ctx.game.definitionOf(permanent.topCard)),
              )
              .map(({ permanentId }) => permanentId);
            if (!candidates.length) return;
            const [picked] =
              candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (picked) ctx.fx.modifyDP(picked, 3000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "All of your Digimon gain Security Attack +1 until the end of your next turn.",
          resolve: async (ctx) => {
            ctx.fx.grantPlayerKeyword(source.ownerSeat, "SecurityAttack", EffectDuration.UntilOwnerTurnEnd, 1);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
