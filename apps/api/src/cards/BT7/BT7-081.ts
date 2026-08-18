import { EffectTiming, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT7-081 — Bokomon (BT7, White Lv.3 Digimon).
 *
 *   EffectTiming.OnPlay:
 *     reveal top 5 cards of deck, add 1 card with [Hybrid] or [Ten Warriors] trait
 *     and 1 Tamer card to hand, place remaining at deck bottom.
 *   EffectTiming.OnEnterFieldAnyone:
 *     [Your Turn][Once Per Turn] When one of your Tamers digivolves, gain 2 memory.
 *     The completed Digimon stack still contains the Tamer that digivolved, which lets the
 *     entry window distinguish this event from an ordinary play.
 */

const cardId = "BT7-081";

function hasHybridOrTenWarriors(def: CardDefinition): boolean {
  const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  return traits.some((t) => {
    const lt = t.toLowerCase();
    return lt === "hybrid" || lt === "ten warriors" || lt === "tenwarriors";
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal top 5, add 1 Hybrid/TenWarriors + 1 Tamer to hand, rest to bottom.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/reveal-5-add-hybrid-and-tamer`,
          description:
            "[On Play] Reveal the top 5 cards of your deck. Add 1 card with [Hybrid] or " +
            "[Ten Warriors] in its traits and 1 Tamer card among them to your hand. " +
            "Place the remaining cards at the bottom of your deck in any order.",
          optional: false,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => {
            const deck = ctx.game.player(source.ownerSeat).deck;
            const revealCount = Math.min(5, deck.length);
            if (revealCount === 0) return;

            const revealed = await ctx.fx.reveal(source.ownerSeat, revealCount);
            const candidates = revealed.map((c) => c.instanceId);

            // First selection: Hybrid / Ten Warriors, max 1
            const hybridCandidates = candidates.filter((id) => {
              const def = ctx.game.definitionOf(
                ctx.game.player(source.ownerSeat).deck.find((c) => c.instanceId === id) ??
                  revealed.find((c) => c.instanceId === id)!,
              );
              return hasHybridOrTenWarriors(def);
            });

            let hybridPicked: string | undefined;
            if (hybridCandidates.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: hybridCandidates,
                min: 1,
                max: 1,
                visible: candidates,
                visibleCards: revealed.map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              hybridPicked = picked[0];
            }

            // Second selection: Tamer, max 1 (from remaining)
            const remainingAfterHybrid = hybridPicked
              ? candidates.filter((id) => id !== hybridPicked)
              : candidates;

            const tamerCandidates = remainingAfterHybrid.filter((id) => {
              const inst = revealed.find((c) => c.instanceId === id);
              if (!inst) return false;
              return isTamer(ctx.game.definitionOf(inst));
            });

            let tamerPicked: string | undefined;
            if (tamerCandidates.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: tamerCandidates,
                min: 1,
                max: 1,
                visible: candidates,
                visibleCards: revealed.map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              tamerPicked = picked[0];
            }

            const toHand: string[] = [];
            if (hybridPicked) toHand.push(hybridPicked);
            if (tamerPicked) toHand.push(tamerPicked);

            if (toHand.length > 0) {
              await ctx.fx.returnToHand(toHand);
            }

            // Rest to deck bottom (all revealed cards not added to hand)
            // The cards are already loose from reveal; we return the rest to deck bottom.
            let remaining = revealed
              .map((c) => c.instanceId)
              .filter((id) => !toHand.includes(id));
            if (remaining.length > 1 && ctx.ask.orderCards !== undefined) {
              remaining = await ctx.ask.orderCards(ctx, {
                candidates: remaining,
                visibleCards: revealed
                  .filter((card) => remaining.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
              });
            }
            if (remaining.length > 0) {
              await ctx.fx.returnToDeck(remaining, { toTop: false });
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/tamer-digivolves-memory`,
          description: "[Your Turn][Once Per Turn] When one of your Tamers digivolves, gain 2 memory.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!source.isOnBattleArea() || !source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            const subject = subjectId === undefined ? undefined : ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.controllerSeat !== source.ownerSeat) return false;
            return subject.stack.some((card) => isTamer(ctx.game.definitionOf(card)));
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(2);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
