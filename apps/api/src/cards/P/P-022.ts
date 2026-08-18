import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-022";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-hearts-united`,
          description:
            "[Main] If you have [Davis Motomiya] and [Ken Ichijoji] in play, you may place " +
            "1 [ExVeemon] and 1 [Stingmon] from your hand at the bottom of your deck in any " +
            "order to play 1 [Paildramon] from your hand without paying its memory cost.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const permanents = Array.from(owner.battleArea);
            const hasTamer = (name: string): boolean => permanents.some((permanent) => {
              const definition = ctx.game.definitionOf(permanent.topCard);
              return isTamer(definition) && definition.nameEn === name;
            });
            if (!hasTamer("Davis Motomiya") || !hasTamer("Ken Ichijoji")) return;

            const hand = Array.from(owner.hand);
            const named = (name: string) => hand.filter((card) => {
              const definition = ctx.game.definitionOf(card);
              return isDigimon(definition) && definition.nameEn === name;
            });
            const exVeemon = named("ExVeemon");
            const stingmon = named("Stingmon");
            const paildramon = named("Paildramon");
            if (exVeemon.length === 0 || stingmon.length === 0 || paildramon.length === 0) return;

            const accepted = await ctx.ask.optional(ctx, "Place ExVeemon and Stingmon at deck bottom?");
            if (!accepted) return;
            const exChoice = await ctx.ask.selectCards(ctx, {
              candidates: exVeemon.map((card) => card.instanceId), min: 1, max: 1,
            });
            const stingChoice = await ctx.ask.selectCards(ctx, {
              candidates: stingmon.map((card) => card.instanceId), min: 1, max: 1,
            });
            if (exChoice.length !== 1 || stingChoice.length !== 1) return;
            const costCards = [exChoice[0]!, stingChoice[0]!];
            const ordered = await ctx.ask.orderCards?.(ctx, {
              candidates: costCards,
              destination: "deckBottom",
              visibleCards: costCards.map((instanceId) => ({
                instanceId,
                cardId: hand.find((card) => card.instanceId === instanceId)!.cardId,
              })),
            }) ?? costCards;
            await ctx.fx.returnToDeck(ordered, { toTop: false });

            const currentPaildramon = Array.from(owner.hand).filter((card) =>
              paildramon.some((candidate) => candidate.instanceId === card.instanceId)
            );
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: currentPaildramon.map((card) => card.instanceId), min: 1, max: 1,
            });
            if (chosen.length === 1) await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-add-to-hand`,
          description: "[Security] Add this card to its owner's hand.",
          resolve: async (ctx) => { await ctx.fx.returnToHand([source.instanceId]); },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
