import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-099";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnUseOption) return [];
    return [
      activated({
        source,
        effectKey: `${cardId}/main`,
        description: "[Main] Trash all digivolution cards from 1 opposing Digimon.",
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
            .map((p) => p.permanentId);
          if (!candidates.length) return;
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
          const target = chosen[0] ? ctx.game.permanentById(chosen[0]) : undefined;
          if (!target?.stack.length) return;
          await ctx.fx.trashDigivolutionCards(
            target.permanentId,
            target.stack.map((card) => card.instanceId),
            { byEffectSeat: source.ownerSeat },
          );
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
