import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT4-074";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Rush＞ static keyword.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/rush`,
          description: "＜Rush＞",
          optional: false,
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me !== undefined) {
              ctx.fx.grantKeyword(me.permanentId, "Rush", EffectDuration.Permanent);
            }
          },
        }),
      ];
    }

    // [On Play] Return up to 5 [D-Brigade] Digimon from trash to deck top; gain 2 memory each.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-return-d-brigade`,
          description:
            "[On Play] Return up to 5 Digimon cards with [D-Brigade] in their types from " +
            "your trash to the top of your deck in any order, and for each card you return " +
            "this way, gain 2 memory.",
          optional: false,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.trash.some((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && (def.types as string[] | undefined)?.includes("D-Brigade");
            });
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.trash
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return (
                  isDigimon(def) && (def.types as string[] | undefined)?.includes("D-Brigade")
                );
              })
              .map((c) => c.instanceId);

            if (candidates.length === 0) return;

            const maxCount = Math.min(5, candidates.length);
            let selected = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: maxCount,
            });

            if (selected.length === 0) return;

            if (selected.length > 1 && ctx.ask.orderCards !== undefined) {
              selected = await ctx.ask.orderCards(ctx, {
                candidates: selected,
                visibleCards: selected.map((instanceId) => ({
                  instanceId,
                  cardId: owner.trash.find((card) => card.instanceId === instanceId)!.cardId,
                })),
              });
            }

            // The decision is top-to-bottom; the primitive prepends sequentially.
            await ctx.fx.returnToDeck([...selected].reverse(), { toTop: true });

            ctx.fx.gainMemory(2 * selected.length);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
