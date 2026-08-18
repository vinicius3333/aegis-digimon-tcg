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
      const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
      const hasNoDigivolutionCards = (permanentId: string): boolean => {
        const permanent = ctx.game.permanentById(permanentId);
        return (
          permanent?.topCard !== undefined &&
          isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
          permanent.stack.length === 0
        );
      };
      if (ctx.fx.restrictPlayer) {
        ctx.fx.restrictPlayer(opponentSeat, "attack", duration, hasNoDigivolutionCards);
        return;
      }
      for (const permanent of ctx.game.player(opponentSeat).battleArea) {
        if (hasNoDigivolutionCards(permanent.permanentId)) {
          ctx.fx.restrict(permanent.permanentId, "attack", duration);
        }
      }
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
