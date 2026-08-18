import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-057";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/piercing`,
          description: "＜Piercing＞",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Piercing", EffectDuration.Permanent);
          },
        }),
      ];
    if (timing !== EffectTiming.WhenDigivolving) return [];
    return [
      whenDigivolving({
        source,
        effectKey: `${cardId}/trash-suspend-gain`,
        description:
          "[When Digivolving] Trash up to 3 cards; suspend 1 opposing Digimon per card trashed, then gain 1 per opposing suspended Digimon.",
        resolve: async (ctx) => {
          const hand = ctx.game.player(source.ownerSeat).hand.map(({ instanceId }) => instanceId);
          const discarded =
            hand.length === 0
              ? []
              : await ctx.ask.selectCards(ctx, {
                  candidates: hand,
                  min: 0,
                  max: Math.min(3, hand.length),
                });
          const trashed =
            discarded.length === 0 ? [] : await ctx.fx.trash(discarded, { byEffectSeat: source.ownerSeat });
          if (trashed.length > 0) {
            const candidates = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  !permanent.isSuspended &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)),
              )
              .map(({ permanentId }) => permanentId);
            const count = Math.min(trashed.length, candidates.length);
            if (count > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: count, max: count });
              if (chosen.length > 0) await ctx.fx.suspend(chosen, { byEffectSeat: source.ownerSeat });
            }
          }
          const suspended = ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.filter(
              (permanent) =>
                permanent.topCard !== undefined &&
                permanent.isSuspended &&
                isDigimon(ctx.game.definitionOf(permanent.topCard)),
            ).length;
          if (suspended > 0) ctx.fx.gainMemory(suspended);
        },
      }),
    ];
  },
};
registerCard(module);
