import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-076";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/two-color-or-composite-evo-reduction`,
          description:
            "[Your Turn] Reduce by 2 when this Digimon digivolves into a two-color or Composite card.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.changeEvoCost(({ target, into }) => {
              const self = source.permanent();
              if (self === undefined || target.permanentId !== self.permanentId) return false;
              if (into === undefined) return false;
              return into.colors.length >= 2 || (into.types ?? []).includes("Composite");
            }, -2);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-delete-per-color`,
          description:
            "[When Attacking] For each of this Digimon's colors, delete 1 opposing Digimon with 3000 DP or less.",
          isInherited: true,
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host === undefined) return;
            const colors = ctx.game.effectiveColors?.(host) ?? ctx.game.definitionOf(host.topCard).colors;
            const count = new Set(colors).size;
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const candidates = opponent.battleArea.filter((permanent) =>
              isDigimon(ctx.game.definitionOf(permanent.topCard)) && permanent.currentDP <= 3000
            );
            const amount = Math.min(count, candidates.length);
            if (amount === 0) return;
            const chosen = await ctx.ask.selectPermanents(ctx, {
              candidates: candidates.map((permanent) => permanent.permanentId),
              min: amount,
              max: amount,
            });
            if (chosen.length > 0) await ctx.fx.deletePermanent(chosen, "byEffect");
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
