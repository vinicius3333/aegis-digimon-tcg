import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT7-043";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] You may reveal 1 green Digimon card from your hand.
    // If you do, place it on top of your deck.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal-deck-top`,
          description:
            "[On Play] You may reveal 1 green Digimon card from your hand. If you do, place it on top of your deck.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const hand = ctx.game.player(source.ownerSeat).hand;
            return hand.some((c) => {
              const def = ctx.game.definitionOf(c);
              return (
                (def.colors as CardColor[]).includes(CardColor.Green) &&
                (def.kinds as CardKind[]).includes(CardKind.Digimon)
              );
            });
          },
          resolve: async (ctx) => {
            const hand = ctx.game.player(source.ownerSeat).hand;
            const candidates = hand
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return (
                  (def.colors as CardColor[]).includes(CardColor.Green) &&
                  (def.kinds as CardKind[]).includes(CardKind.Digimon)
                );
              })
              .map((c) => c.instanceId);

            if (candidates.length === 0) return;

            const selected = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (selected.length === 0) return;

            // Reveal is informational; place on top of deck.
            await ctx.fx.returnToDeck(selected, { toTop: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
