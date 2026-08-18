import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT3-093";

function isBlueDiigmon(ctx: EffectContext, card: CardInstance): boolean {
  const def = ctx.game.definitionOf(card);
  return isDigimon(def) && def.colors.includes(CardColor.Blue);
}

function isGreenDigimon(ctx: EffectContext, card: CardInstance): boolean {
  const def = ctx.game.definitionOf(card);
  return isDigimon(def) && def.colors.includes(CardColor.Green);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If memory is 2 or less, set it to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-memory`,
          description: "[Start of Your Turn] If memory is 2 or less, set it to 3.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            if (ctx.game.state.memory <= 2) {
              ctx.fx.setMemory(3);
            }
          },
        }),
      ];
    }

    // [On Play] Reveal the top 3 cards of your deck. Add 1 blue Digimon card and 1 green
    // Digimon card among them to your hand. Place the remaining cards at the bottom of
    // your deck in any order.
    //
    //   SimplifiedRevealDeckTopCardsAndSelect(revealCount: 3, mutualConditions: true):
    //     (a) 1 blue Digimon → hand (mode: AddHand, max 1, canNoSelect: optional)
    //     (b) 1 green Digimon → hand (mode: AddHand, max 1, canNoSelect: optional)
    //     remainingCardsPlace: DeckBottom.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal-add`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 blue Digimon card and " +
            "1 green Digimon card among them to your hand. Place the remaining cards at " +
            "the bottom of your deck in any order.",
          optional: false,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => {
            const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
            if (revealed.length === 0) return;

            const taken = new Set<string>();

            // Select up to 1 blue Digimon to add to hand.
            // Per Q4704: each selection is independent, both are optional.
            const blueCandidates = revealed
              .filter((c) => !taken.has(c.instanceId) && isBlueDiigmon(ctx, c))
              .map((c) => c.instanceId);
            if (blueCandidates.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: blueCandidates,
                min: 0,
                max: 1,
                visible: revealed.map((card) => card.instanceId),
                visibleCards: revealed.map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              for (const id of picked) taken.add(id);
              if (picked.length > 0) await ctx.fx.returnToHand(picked);
            }

            // Select up to 1 green Digimon to add to hand.
            // mutualConditions: true — a card already taken as blue cannot be taken as green.
            const greenCandidates = revealed
              .filter((c) => !taken.has(c.instanceId) && isGreenDigimon(ctx, c))
              .map((c) => c.instanceId);
            if (greenCandidates.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: greenCandidates,
                min: 0,
                max: 1,
                visible: revealed.map((card) => card.instanceId),
                visibleCards: revealed.map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              for (const id of picked) taken.add(id);
              if (picked.length > 0) await ctx.fx.returnToHand(picked);
            }

            // Remaining revealed cards go to deck bottom (any order).
            let rest = revealed
              .filter((c) => !taken.has(c.instanceId))
              .map((c) => c.instanceId);
            if (rest.length > 1 && ctx.ask.orderCards !== undefined) {
              rest = await ctx.ask.orderCards(ctx, {
                candidates: rest,
                visibleCards: revealed
                  .filter((card) => rest.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
              });
            }
            if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
          },
        }),
      ];
    }

    // [Security] Play this Tamer without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this Tamer without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
