import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST15-13";

const opponentDigimonCostLeq8 = (ctx: EffectContext, source: CardSource): Permanent[] => {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter((p: Permanent) => {
    if (p.inBreeding) return false;
    if (!p.topCard) return false;
    const def: CardDefinition = ctx.game.definitionOf(p.topCard);
    if (!isDigimon(def)) return false;
    if (def.playCost === undefined) return false;
    return def.playCost <= 8;
  });
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Blocker＞ static keyword — continuously re-granted while on the battle area
    // so the combat/legality.hasBlocker ledger path recognizes it.
    // The effectText regex path in hasBlocker also provides fallback coverage.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/static-blocker`,
          description: "＜Blocker＞",
          when: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent?.();
            if (self === undefined) return;
            ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [When Digivolving] Delete 1 opponent Digimon with a play cost of 8 or less.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-cost-leq-8`,
          description:
            "[When Digivolving] Delete 1 of your opponent's Digimon with a play cost of 8 or less.",
          optional: false,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return opponentDigimonCostLeq8(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const targets = opponentDigimonCostLeq8(ctx, source);
            if (targets.length === 0) return;
            const [chosen] = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen === undefined) return;
            await ctx.fx.deletePermanent([chosen]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
