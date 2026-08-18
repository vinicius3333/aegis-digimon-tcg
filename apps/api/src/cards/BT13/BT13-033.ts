import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT13-033";

/** Opponent's battle-area Digimon permanents (valid bounce targets). */
const opponentDigimon = (game: GameAccess, source: CardSource): Permanent[] => {
  const opponent = game.opponentOf(source.ownerSeat);
  const result: Permanent[] = [];
  for (const p of game.player(opponent).battleArea as Iterable<Permanent>) {
    if (p.topCard === undefined) continue;
    if (isDigimon(game.definitionOf(p.topCard))) result.push(p);
  }
  return result;
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Return 1 of your opponent's Digimon to their hand. Then, gain 1 memory
    // for every 4 cards in your opponent's hand.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-return-gain-memory`,
          description:
            "[When Digivolving] Return 1 of your opponent's Digimon to the hand. Then, gain 1 " +
            "memory for every 4 cards in your opponent's hand.",
          optional: false,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const hasTargets = opponentDigimon(ctx.game, source).length > 0;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            let handCount = 0;
            for (const _c of ctx.game.player(opponent).hand as Iterable<CardInstance>) handCount++;
            return hasTargets || Math.floor(handCount / 4) >= 1;
          },
          resolve: async (ctx) => {
            const targets = opponentDigimon(ctx.game, source);
            if (targets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: targets.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                const perm = ctx.game.permanentById(chosen[0]!);
                if (perm?.topCard !== undefined) {
                  await ctx.fx.returnToHand([perm.topCard.instanceId]);
                }
              }
            }

            // Gain 1 memory per 4 cards in opponent's hand (computed AFTER the bounce).
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            let handCount = 0;
            for (const _c of ctx.game.player(opponent).hand as Iterable<CardInstance>) handCount++;
            const memoryGain = Math.floor(handCount / 4);
            if (memoryGain > 0) {
              // [When Digivolving] can be reached via an effect-driven (reactive) digivolve
              // on the opponent's turn, not only a normal main-phase digivolve -- credit
              // this card's controller explicitly.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, memoryGain);
            }
          },
        }),
      ];
    }

    // [When Attacking] If your opponent has 9 or more cards in their hand, by choosing cards in
    // your opponent's hand without looking and returning them to the bottom of the deck so that 8
    // remain, unsuspend this Digimon. (KB Q2285: the activating player chooses.)
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-return-hand-unsuspend`,
          description:
            "[When Attacking] If your opponent has 9 or more cards in their hand, by choosing " +
            "cards in your opponent's hand without looking and returning them to the bottom of the " +
            "deck so that 8 remain, unsuspend this Digimon.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            let handCount = 0;
            for (const _c of ctx.game.player(opponent).hand as Iterable<CardInstance>) handCount++;
            return handCount >= 9;
          },
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opponentHandInstances: CardInstance[] = [];
            for (const c of ctx.game.player(opponent).hand as Iterable<CardInstance>) {
              opponentHandInstances.push(c);
            }
            if (opponentHandInstances.length < 9) return;

            const returnCount = opponentHandInstances.length - 8;
            const candidates = opponentHandInstances.map((c) => c.instanceId);

            // Controller selects which cards to return to the bottom of the deck.
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: returnCount,
              max: returnCount,
            });
            if (chosen.length === 0) return;

            await ctx.fx.returnToDeck(chosen, { toTop: false });

            // Unsuspend self after returning the cards to deck.
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.unsuspend([self.permanentId]);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
