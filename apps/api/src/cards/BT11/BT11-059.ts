import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { digivolveCostStatic, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT11-059";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // "When one of your Digimon would digivolve into this card, reduce the digivolution
    //  cost by 1 for each green or black Tamer you have in play."
    //
    //     changeValue: () => -ReduceCost() where ReduceCost() counts green/black Tamers.
    //     permanentCondition: the permanent is on the controller's battle area.
    //     cardCondition: the card being digivolved INTO is this card (cardSource == card).
    //     condition: !IsExistOnField(card) — card is not yet on the field itself.
    //
    // Since `changeEvoCost` applies a continuous digivolution-cost delta, re-evaluated
    // each time None-timing fires (each game-state re-check). The predicate restricts
    // application to permanents on the owner's battle area digivolving into THIS card.
    if (timing === EffectTiming.None) {
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/evo-cost-reduction-per-tamer`,
          description:
            "When one of your Digimon would digivolve into this card, reduce the " +
            "digivolution cost by 1 for each green or black Tamer you have in play.",
          // (this card is the digivolution TARGET sitting in hand). The on-field unsuspend
          // clause is a separate effect, so guarding this one off-field is correct.
          when: (ctx) => !ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const delta = -countGreenBlackTamers(ctx.game, source);
            if (delta === 0) return; // no Tamers → no reduction (also avoids a 0-delta call)
            // The predicate matches the digivolve INTO this card: the digivolving base
            // permanent is on the owner's battle area AND the
            // card being digivolved into is this card (documented behavior CardSourceCondition:
            // cardSource == card), checked via `m.into.cardId`.
            ctx.fx.changeEvoCost(
              ({ target, into }) => {
                if (into !== undefined && into.cardId !== cardId) return false;
                if (target.inBreeding) return false;
                if (target.controllerSeat !== source.ownerSeat) return false;
                return true;
              },
              delta,
            );
          },
        }),
      ];
    }

    // "[All Turns][Once Per Turn] When this Digimon deletes an opponent's Digimon in
    //  battle, unsuspend this Digimon."
    //
    if (timing === EffectTiming.OnEndBattle) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/unsuspend-on-delete-in-battle`,
          description:
            "[All Turns][Once Per Turn] When this Digimon deletes an opponent's Digimon " +
            "in battle, unsuspend this Digimon.",
          maxPerTurn: 1,
          // trigger.attackerPermanentId is the attacker; trigger.targetPermanentId is the
          // defender (the one that was deleted). The source must be either the attacker or
          // the blocker that survived — verified by checking the source permanent contains
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = ctx.source.permanent();
            if (self === undefined) return false;
            // The attacker permanent must be the source (or contain this card).
            const attackerId = ctx.trigger.attackerPermanentId;
            if (attackerId === undefined) return false;
            if (attackerId !== self.permanentId) return false;
            // The defender must be an opponent's permanent (that was deleted).
            const targetId = ctx.trigger.targetPermanentId;
            if (targetId === undefined) return false;
            const target = ctx.game.permanentById(targetId);
            // After deletion the target may already be gone; use controllerSeat from trigger.
            // We check the target was an opponent's Digimon via the trigger.
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            if (target !== undefined && target.controllerSeat !== opponentSeat) return false;
            return true;
          },
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.unsuspend([self.permanentId]);
          },
        }),
      ];
    }

    return [];
  },
};

/**
 * Count the number of green or black Tamers the source controller has in play
 * (documented behavior ReduceCost: IsPermanentExistsOnOwnerBattleArea && TopCard is Tamer &&
 * (Green || Black)). Per KB Q2092, a dual-color Tamer still counts as 1.
 */
function countGreenBlackTamers(game: GameAccess, source: CardSource): number {
  const owner = game.player(source.ownerSeat);
  let count = 0;
  for (const permanent of owner.battleArea) {
    if (permanent.inBreeding) continue;
    const top = permanent.topCard;
    if (top === undefined) continue;
    const def = game.definitionOf(top);
    if (!def.kinds.includes(CardKind.Tamer)) continue;
    const isGreenOrBlack =
      def.colors.includes(CardColor.Green) || def.colors.includes(CardColor.Black);
    if (isGreenOrBlack) count++;
  }
  return count;
}

registerCard(module);
export default module;
