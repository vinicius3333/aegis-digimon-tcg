
// @ts-nocheck
import { CardColor, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, onPlay, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT4-096";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If memory <= 2, set memory to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/set-memory`,
          description: "[Start of Your Turn] If you have 2 or fewer memory, set your memory to 3.",
          optional: false,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => {
            const state = ctx.game.state;
            // Memory <= 2 means the gauge is on the source owner's opponent side
            // at 2 or fewer (i.e. memory is at most 2 toward the owner).
            const memory = state.memory;
            const ownerSeat = source.ownerSeat;
            // Memory value: positive = seat 0 side, negative = seat 1 side.
            // We need to check if the owner has 2 or fewer memory.
            const ownerMemory = ownerSeat === 0 ? memory : -memory;
            return ownerMemory <= 2;
          },
          resolve: async (ctx) => {
            ctx.fx.setMemory(source.ownerSeat === 0 ? 3 : -3);
          },
        }),
      ];
    }

    // [On Play] Reveal top 3 of deck. If all are black, gain 1 memory. Place on top in any order.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. If all of the revealed cards are " +
            "black, gain 1 memory. Place the cards on top of your deck in any order.",
          optional: false,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.deck.length >= 1;
          },
          resolve: async (ctx) => {
            const revealed = await ctx.fx.reveal(source.ownerSeat, 3);

            if (revealed.length === 0) return;

            // Check if all revealed cards are black.
            const allBlack = revealed.every((c) => {
              const def = ctx.game.definitionOf(c);
              return def.colors.includes(CardColor.Black);
            });

            if (allBlack) {
              // This [On Play] can also fire when the card is played from security (the
              // [Security] clause uses ctx.fx.playInstances, which fires OnPlay for the
              // played card) -- security checks resolve on the ATTACKING player's turn
              // against this card's owner, so turnSeat can differ from source.ownerSeat.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
            }

            // Place cards back on top of deck in any order.
            const revealedIds = revealed.map((card) => card.instanceId);
            const selected = ctx.ask.orderCards !== undefined
              ? await ctx.ask.orderCards(ctx, {
                  candidates: revealedIds,
                  visibleCards: revealed.map((card) => ({
                    instanceId: card.instanceId,
                    cardId: card.cardId,
                  })),
                })
              : revealedIds;

            // Return to deck top in the selected order.
            // `orderCards` is top-to-bottom deck order. `returnToDeck(toTop)`
            // prepends sequentially, so execute the physical moves in reverse.
            await ctx.fx.returnToDeck([...selected].reverse(), { toTop: true });
          },
        }),
      ];
    }

    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
