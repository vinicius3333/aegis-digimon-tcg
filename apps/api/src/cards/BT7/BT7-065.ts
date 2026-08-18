import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT7-065";

function hasXAntibody(definition: CardDefinition): boolean {
  return [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])]
    .some((trait) => trait.toLowerCase() === "x antibody");
}

function xAntibodyCardsInHand(ctx: EffectContext, source: CardSource) {
  return ctx.game.player(source.ownerSeat).hand.filter((card) => hasXAntibody(ctx.game.definitionOf(card)));
}

function xAntibodySourceCount(ctx: EffectContext, source: CardSource): number {
  return source.permanent()?.stack.filter((card) => hasXAntibody(ctx.game.definitionOf(card))).length ?? 0;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/dp-per-x-antibody-source`,
          description: "[Your Turn] This Digimon gets +1000 DP for each X-Antibody card in its sources.",
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn() && xAntibodySourceCount(ctx, source) > 0,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.modifyDP(self.permanentId, 1000 * xAntibodySourceCount(ctx, source), EffectDuration.UntilOwnerTurnEnd);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/place-and-delete`,
          description:
            "[When Attacking][Once Per Turn] Place an X-Antibody card from hand under this " +
            "Digimon to delete up to 2 opposing Digimon within its source-count play-cost limit.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => source.isOnBattleArea() && xAntibodyCardsInHand(ctx, source).length > 0,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            const handCandidates = xAntibodyCardsInHand(ctx, source).map((card) => card.instanceId);
            const selectedCard = handCandidates.length === 1
              ? handCandidates[0]
              : (await ctx.ask.selectCards(ctx, { candidates: handCandidates, min: 1, max: 1 }))[0];
            if (!selectedCard) return;
            const placed = await ctx.fx.placeUnder(self.permanentId, [selectedCard]);
            if (placed.length !== 1) return;

            const limit = self.stack.length;
            const opponents = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((permanent) => {
              if (!permanent.topCard) return false;
              const definition = ctx.game.definitionOf(permanent.topCard);
              return isDigimon(definition) && definition.playCost <= limit;
            });
            if (opponents.length === 0) return;
            const ids = opponents.map((permanent) => permanent.permanentId);
            const selected = await ctx.ask.chooseTargets(ctx, {
              candidates: ids,
              min: 0,
              max: Math.min(2, ids.length),
            });
            if (selected.length > 0) await ctx.fx.deletePermanent(selected);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
