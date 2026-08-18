import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-067";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnEnterFieldAnyone) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/reveal-level-four`,
        description: "[On Play] Reveal 3, add 1 level 4 Digimon, bottom-deck the rest.",
        resolve: async (ctx) => {
          const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
          const candidates = revealed
            .filter((card) => {
              const def = ctx.game.definitionOf(card);
              return isDigimon(def) && def.level === 4;
            })
            .map((card) => card.instanceId);
          const chosen = candidates.length ? await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 }) : [];
          if (chosen.length) await ctx.fx.returnToHand(chosen);
          const rest = revealed.filter((card) => !chosen.includes(card.instanceId)).map((card) => card.instanceId);
          if (rest.length) await ctx.fx.returnToDeck(rest, { toTop: false });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
