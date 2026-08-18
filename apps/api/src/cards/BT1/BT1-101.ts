import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-101";
async function trashAllSources(ctx: EffectContext, source: CardSource): Promise<void> {
  for (const permanent of [...ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea]) {
    if (
      permanent.topCard === undefined ||
      !isDigimon(ctx.game.definitionOf(permanent.topCard)) ||
      permanent.stack.length === 0
    )
      continue;
    await ctx.fx.trashDigivolutionCards(
      permanent.permanentId,
      permanent.stack.map((card) => card.instanceId),
      { byEffectSeat: source.ownerSeat },
    );
  }
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] Trash all digivolution cards under all opposing Digimon.",
          resolve: async (ctx) => {
            await trashAllSources(ctx, source);
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
            await trashAllSources(ctx, source);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
