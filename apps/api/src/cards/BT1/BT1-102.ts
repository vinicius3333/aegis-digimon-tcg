import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-102";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const draw = async (ctx: Parameters<Effect["resolve"]>[0]): Promise<void> => {
      await ctx.fx.draw(source.ownerSeat, Math.floor(ctx.game.player(source.ownerSeat).security.length / 2));
    };
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] Draw 1 for every 2 security cards.",
          resolve: draw,
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's Main effect.",
          resolve: draw,
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
