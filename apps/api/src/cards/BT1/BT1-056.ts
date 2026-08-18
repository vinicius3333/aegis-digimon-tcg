import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-056";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnEnterFieldAnyone) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/play-tinkermon`,
        description: "[On Play] You may play 1 Tinkermon from hand or trash without paying its cost.",
        optional: true,
        resolve: async (ctx) => {
          const player = ctx.game.player(source.ownerSeat);
          const candidates = [...player.hand, ...player.trash]
            .filter((card) => ctx.game.definitionOf(card).nameEn.includes("Tinkermon"))
            .map((card) => card.instanceId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
          if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
