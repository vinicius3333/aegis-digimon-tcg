import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-093";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] 1 of your Digimon gets +2000 DP and Security Attack +1 for the turn.",
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (!candidates.length) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (!chosen[0]) return;
            ctx.fx.modifyDP(chosen[0], 2000, EffectDuration.UntilEachTurnEnd);
            ctx.fx.grantKeyword(chosen[0], "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Add this card to hand.",
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
