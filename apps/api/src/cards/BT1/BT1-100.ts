import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-100";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const apply = async (ctx: Parameters<Effect["resolve"]>[0], duration: EffectDuration): Promise<void> => {
      for (const p of ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea)
        if (p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length === 0)
          ctx.fx.restrict(p.permanentId, "attack", duration);
    };
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] Opposing source-less Digimon can't attack through the opponent's turn.",
          resolve: async (ctx) => {
            await apply(ctx, EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Opposing source-less Digimon can't attack for the turn.",
          resolve: async (ctx) => {
            await apply(ctx, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
