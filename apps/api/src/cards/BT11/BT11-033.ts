// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: [
      { kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } }, count: 1 }, to: "hand" },
      { kind: "SecurityManipulation", op: "toHand", controller: "opponent", source: "securityTop", condition: { kind: "lastEffectDidNotAct", raw: "no Digimon was returned by this effect" } },
    ] },
    { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", actions: [{ kind: "GainMemory", amount: 1 }], scaling: { per: 4, filter: { zone: "hand", controller: "opponent" }, unit: "cards" } }], frequency: "OncePerTurn" },
  ],
  coverage: "full", residual: [],
};

registerIrCard("BT11-033", compiled);

/*

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Return 1 of your opponent's level 5 or lower Digimon to their owner's
    // hand. If no Digimon was returned by this effect, your opponent adds the top card of their
    // security stack to their hand.
    //
    // fallback: if !bounced(), AddHandCards(security[0]) + ReduceSecurity.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-bounce-or-security-to-hand`,
          description:
            "[When Digivolving] Return 1 of your opponent's level 5 or lower Digimon to their " +
            "owner's hand. If no Digimon was returned by this effect, your opponent adds the top " +
            "card of their security stack to their hand.",
          optional: false,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opponent);
            const hasTarget = Array.from(oppPlayer.battleArea).some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (def.kinds as string[]).includes("Digimon") && (def.level ?? 99) <= 5;
            });
            return hasTarget || oppPlayer.security.length >= 1;
          },
          resolve: async (ctx) => {
            if (!ctx.source.isOnBattleArea()) return;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opponent);

            const targetPerms = Array.from(oppPlayer.battleArea).filter((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (def.kinds as string[]).includes("Digimon") && (def.level ?? 99) <= 5;
            });

            let bounced = false;

            if (targetPerms.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: targetPerms.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              const chosenId = chosen[0];
              if (chosenId !== undefined) {
                const perm = ctx.game.permanentById(chosenId);
                if (perm?.topCard !== undefined) {
                  const returned = await ctx.fx.returnToHand([perm.topCard.instanceId]);
                  bounced = returned.length > 0;
                }
              }
            }

            // Fallback: opponent adds top security card to their hand.
            // Q2070: the moved card's [Security] effect does NOT activate.
            if (!bounced) {
              const secCards = oppPlayer.security;
              if (secCards.length >= 1) {
                const topCard = secCards[0];
                if (topCard !== undefined) {
                  await ctx.fx.returnToHand([topCard.instanceId], { silent: true });
                }
              }
            }
          },
        }),
      ];
    }

    // [All Turns][Once Per Turn] When an effect adds cards to your opponent's hand,
    // gain 1 memory for every 4 cards in your opponent's hand.
    //
    //   memoryGain = floor(opponentHandCount / 4).
    if (timing === EffectTiming.OnAddHand) {
      return [
        onAddHand({
          source,
          effectKey: `${cardId}/add-hand-gain-memory`,
          description:
            "[All Turns][Once Per Turn] When an effect adds cards to your opponent's hand, " +
            "gain 1 memory for every 4 cards in your opponent's hand.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            return ctx.trigger.effectAddedToHandSeat === opponent;
          },
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppHandSize = ctx.game.player(opponent).hand.length;
            const memoryGain = Math.floor(oppHandSize / 4);
            if (memoryGain > 0) {
              // [All Turns]: an effect can add cards to the opponent's hand on either
              // player's turn, so credit this card's controller explicitly.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, memoryGain);
            }
            return Promise.resolve();
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
*/
