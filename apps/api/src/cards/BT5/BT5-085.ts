import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { beforePayCost, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT5-085";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects: Effect[] = [];

    // [Play] When playing this card from your hand, you may delete 1 of your
    // [Diaboromon] to reduce this card's play cost by 12.
    //
    //   added to UntilCalculateFixedCostEffect.
    if (timing === EffectTiming.BeforePayCost) {
      effects.push(
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-delete-diaboromon`,
          description:
            "When playing this card from your hand, you may delete 1 of your " +
            "[Diaboromon] to reduce this card's play cost by 12.",
          optional: false,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (
                isDigimon(def) &&
                def.nameEn.toLowerCase().includes("diaboromon")
              );
            });
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.battleArea.filter((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (
                isDigimon(def) &&
                def.nameEn.toLowerCase().includes("diaboromon")
              );
            });

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: candidates.map((p) => p.permanentId),
              min: 0,
              max: 1,
            });

            if (chosen.length === 0) return;

            await ctx.fx.deletePermanent(chosen);
            ctx.playCostDelta = 12;
          },
        }),
      );
    }

    if (timing === EffectTiming.None) {
      effects.push(
        staticModifier({
          source,
          effectKey: `${cardId}/rush`,
          description: "＜Rush＞",
          optional: false,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Rush", EffectDuration.Permanent);
            }
          },
        }),
      );
    }

    // [All Turns] The [When Digivolving] effects on level 7 Digimon don't activate.
    //
    //   effect source is Lv.7 + ActivateICardEffect + IsWhenDigivolving.
    //   Mapped to restrict("cannotActivateWhenDigivolving") on each Lv.7 Digimon.
    if (timing === EffectTiming.None) {
      effects.push(
        staticModifier({
          source,
          effectKey: `${cardId}/disable-lv7-when-digivolving`,
          description:
            "[All Turns] The [When Digivolving] effects on level 7 Digimon " +
            "don't activate.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const seats = [source.ownerSeat, ctx.game.opponentOf(source.ownerSeat)];
            for (const seat of seats) {
              for (const permanent of ctx.game.player(seat).battleArea) {
                if (permanent.inBreeding) continue;
                if (permanent.topCard === undefined) continue;
                const def = ctx.game.definitionOf(permanent.topCard);
                if (!isDigimon(def)) continue;
                if (def.level !== 7) continue;
                ctx.fx.restrict(
                  permanent.permanentId,
                  "cannotActivateWhenDigivolving",
                  EffectDuration.UntilEachTurnEnd,
                );
              }
            }
          },
        }),
      );
    }

    return effects;
  },
};

registerCard(module);
export default module;
