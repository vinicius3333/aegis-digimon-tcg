import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-103";
async function main(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  for (const permanent of ctx.game.player(opponent).battleArea) {
    if (permanent.topCard === undefined || !isDigimon(ctx.game.definitionOf(permanent.topCard))) continue;
    const recipientId = permanent.permanentId;
    ctx.fx.subscribeSubTrigger({
      event: "whenSuspended",
      sourcePermanentId: recipientId,
      once: false,
      expiresOnTurnEndOf: opponent,
      description: "BT11-103 granted lose 1 memory when suspended",
      matches: (subCtx) => subCtx.trigger.suspendedPermanentId === recipientId,
      run: async (subCtx) => {
        subCtx.fx.gainMemoryForSeat(opponent, -1);
      },
    });
  }
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/green-tamer-cost-reduction`,
          description: "When used with a green Tamer in play, reduce this card's cost by 1.",
          when: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                  ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Green),
              ),
          resolve: async (ctx) =>
            ctx.fx.changePlayCost(
              ({ controllerSeat, def }) =>
                controllerSeat === source.ownerSeat && (def as CardDefinition).cardId === cardId,
              -1,
            ),
        }),
      ];
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Until opponent turn end, all opposing Digimon lose 1 memory whenever they become suspended.",
          resolve: async (ctx) => main(ctx, source),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => main(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
