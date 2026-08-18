import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-058";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-attack-plus-one`,
          description: "＜Security Attack +1＞",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined)
              ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
          },
        }),
      ];
    if (timing !== EffectTiming.WhenDigivolving) return [];
    return [
      whenDigivolving({
        source,
        effectKey: `${cardId}/bottom-deck-suspended`,
        description:
          "[When Digivolving] With HerculesKabuterimon or X Antibody in its sources, bottom-deck 1 opposing suspended Digimon.",
        when: (ctx) =>
          source.permanent()?.stack.some((card) => {
            const name = ctx.game.definitionOf(card).nameEn;
            return name.includes("HerculesKabuterimon") || name.includes("X Antibody");
          }) ?? false,
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.filter(
              (permanent) =>
                permanent.isSuspended &&
                permanent.topCard !== undefined &&
                isDigimon(ctx.game.definitionOf(permanent.topCard)),
            )
            .map(({ permanentId }) => permanentId);
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
          const target = chosen[0] === undefined ? undefined : ctx.game.permanentById(chosen[0]);
          if (target?.topCard !== undefined) await ctx.fx.returnToDeck([target.topCard.instanceId], { toTop: false });
        },
      }),
    ];
  },
};
registerCard(module);
