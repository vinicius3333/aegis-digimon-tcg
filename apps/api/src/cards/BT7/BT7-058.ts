import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT7-058";

function deadlyAxemonPermanents(ctx: EffectContext, source: CardSource) {
  return ctx.game.player(source.ownerSeat).battleArea.filter((permanent) => {
    if (permanent.topCard === undefined || permanent.permanentId === source.permanent()?.permanentId) return false;
    return ctx.game.definitionOf(permanent.topCard).nameEn === "DeadlyAxemon";
  });
}

function darkKnightmonInHand(ctx: EffectContext, source: CardSource) {
  return ctx.game.player(source.ownerSeat).hand.filter((card) => {
    const definition = ctx.game.definitionOf(card);
    return isDigimon(definition) && definition.nameEn.includes("DarkKnightmon");
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/deadly-axemon-digivolve`,
          description:
            "[When Attacking] You may trash all digivolution cards of 1 of your DeadlyAxemon " +
            "and place it under this Digimon to digivolve into DarkKnightmon from hand for free.",
          optional: true,
          canActivate: (ctx) =>
            source.isOnBattleArea() &&
            deadlyAxemonPermanents(ctx, source).length > 0 &&
            darkKnightmonInHand(ctx, source).length > 0,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            const deadlyCandidates = deadlyAxemonPermanents(ctx, source);
            const deadlyIds = deadlyCandidates.map((permanent) => permanent.permanentId);
            const selectedDeadly = deadlyIds.length === 1
              ? deadlyIds[0]
              : (await ctx.ask.chooseTargets(ctx, { candidates: deadlyIds, min: 1, max: 1 }))[0];
            if (!selectedDeadly) return;

            const moved = ctx.fx.relocatePermanentByEffect !== undefined
              ? await ctx.fx.relocatePermanentByEffect(self.permanentId, selectedDeadly, {
                  belowTop: false,
                  shedOwnCards: true,
                })
              : ctx.fx.relocatePermanent(self.permanentId, selectedDeadly, {
                  belowTop: false,
                  shedOwnCards: true,
                });
            if (!moved) return;

            const darkCandidates = darkKnightmonInHand(ctx, source).map((card) => card.instanceId);
            const selectedDark = darkCandidates.length === 1
              ? darkCandidates[0]
              : (await ctx.ask.selectCards(ctx, { candidates: darkCandidates, min: 1, max: 1 }))[0];
            if (!selectedDark) return;
            await ctx.fx.digivolveFromInstance(self.permanentId, selectedDark, {
              payCost: false,
              draw: true,
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-security-attack`,
          description:
            "[Your Turn] While this Digimon has Knightmon or Bagramon in its name, it gains Security Attack +1.",
          isInherited: true,
          when: (ctx) => {
            const self = source.permanent();
            if (!self?.topCard || !source.isOwnersTurn()) return false;
            const name = ctx.game.definitionOf(self.topCard).nameEn;
            return name.includes("Knightmon") || name.includes("Bagramon");
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilOwnerTurnEnd, 1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
