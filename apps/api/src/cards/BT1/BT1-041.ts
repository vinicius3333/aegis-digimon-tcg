import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-041";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/draw`,
          description: "[On Play] Draw 2.",
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 2);
          },
        }),
      ];
    if (timing === EffectTiming.OnUseAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/memory`,
          description: "[When Attacking] Gain 1 memory if the opponent has a source-less Digimon.",
          isInherited: true,
          canActivate: (ctx) =>
            ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.some(
                (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length === 0,
              ),
          resolve: async (ctx) => {
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
