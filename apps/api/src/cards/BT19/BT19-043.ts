import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT19-043";

const hasLucemonName = (nameEn: string): boolean => nameEn.includes("Lucemon");

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [All Turns][Once Per Turn] Leave-prevention: if a [Lucemon]-named card is in this
    // Digimon's digivolution cards and both security stacks are non-empty, trash both top
    // security cards to prevent the leave.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-leave-prevention`,
          description:
            "[All Turns][Once Per Turn] When this Digimon would leave the battle area, if a " +
            "card with [Lucemon] in its name is in this Digimon's digivolution cards, by " +
            "trashing both players' top security cards, it doesn't leave.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const selfPermanent = ctx.source.permanent();
            if (!selfPermanent) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: selfPermanent.permanentId,
              mode: "prevent",
              description: `${cardId} [All Turns][Once Per Turn] trash both security tops to prevent leaving`,
              oncePerTurnKey: `${cardId}/leave-prevention/${selfPermanent.permanentId}`,
              protects: (_subCtx, leavingId) => selfPermanent.permanentId === leavingId,
              preventCheck: async (subCtx, leavingId) => {
                if (leavingId !== selfPermanent.permanentId) return false;
                // Must be on the battle area to fire (not already gone).
                if (!subCtx.source.isOnBattleArea()) return false;
                // Condition: at least one [Lucemon]-named card in digivolution cards.
                const haLucemon = selfPermanent.stack.some((c) => hasLucemonName(subCtx.game.definitionOf(c).nameEn));
                if (!haLucemon) return false;
                // Q3096: both players' security stacks must be non-empty.
                const owner = subCtx.game.player(source.ownerSeat);
                const opponent = subCtx.game.player(subCtx.game.opponentOf(source.ownerSeat));
                if (owner.security.length < 1 || opponent.security.length < 1) return false;
                // Optional choice: the controller decides whether to pay.
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Trash both players' top security cards to prevent leaving?",
                );
                if (!yes) return false;
                // Pay the cost: trash both players' top security cards.
                await subCtx.fx.trashFromSecurity(source.ownerSeat, 1, { fromTop: true });
                await subCtx.fx.trashFromSecurity(subCtx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
                return true;
              },
            });
          },
        }),
      ];
    }

    // [End of Your Turn][Once Per Turn] Opponent may trash their top security. If they
    // don't, Recovery +1 (Deck) + delete 1 of opponent's Digimon or Tamers.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-your-turn-security-pressure`,
          description:
            "[End of Your Turn][Once Per Turn] Your opponent may trash their top security " +
            "card. If this effect didn't trash, ＜Recovery +1 (Deck)＞, and delete 1 of your " +
            "opponent's Digimon or Tamers.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.game.state.turnSeat === source.ownerSeat,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const opponent = ctx.game.player(opponentSeat);

            let opponentDiscarded = false;

            if (opponent.security.length > 0) {
              // Ask the OPPONENT whether to trash their top security card.
              const opponentDecides = await ctx.ask.optional(
                ctx,
                "Trash your top security card to avoid Recovery +1 and deletion?",
              );
              if (opponentDecides) {
                await ctx.fx.trashFromSecurity(opponentSeat, 1, { fromTop: true });
                opponentDiscarded = true;
              }
            }

            if (!opponentDiscarded) {
              // Recovery +1 (Deck): move top card of controller's deck to top of own security.
              await ctx.fx.recoverToSecurity(source.ownerSeat, 1);

              // Delete 1 of opponent's Digimon or Tamers.
              const targets = opponent.battleArea.filter((perm) => {
                if (perm.inBreeding || !perm.topCard) return false;
                const def = ctx.game.definitionOf(perm.topCard);
                const kinds = def.kinds as string[];
                return kinds.includes(CardKind.Digimon) || kinds.includes(CardKind.Tamer);
              });
              if (targets.length > 0) {
                const chosen = await ctx.ask.chooseTargets(ctx, {
                  candidates: targets.map((p) => p.permanentId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await ctx.fx.deletePermanent([chosen[0]!]);
                }
              }
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
