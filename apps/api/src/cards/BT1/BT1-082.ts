import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT1-082";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Opponent's Turn] When an opponent's Digimon attacks a player, if this Digimon is
    // suspended, suspend 1 of your opponent's Digimon (without ＜Blocker＞).
    //
    //     non-Blocker opponent Digimon exists, this Digimon is suspended), maxCount -1.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/suspend-opponent-digimon`,
          description:
            "[Opponent's Turn] When an opponent's Digimon attacks a player, if this Digimon " +
            "is suspended, suspend 1 of your opponent's Digimon.",
          optional: false,
          // canTrigger: on battle area + opponent's turn + opponent attacks a player.
          // The OnAllyAttack timing fires for every attack; filter to only the case where
          // an OPPONENT Digimon attacks the controlling player (no defending permanent).
          // trigger.targetPermanentId is undefined when attacking a player (BT22-067 idiom).
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (ctx.source.isOwnersTurn()) return false; // must be opponent's turn
            // The attacker must be an opponent's permanent.
            const attackerId = ctx.trigger.attackerPermanentId;
            if (attackerId === undefined) return false;
            const attacker = ctx.game.permanentById(attackerId);
            if (attacker === undefined) return false;
            if (attacker.controllerSeat === source.ownerSeat) return false;
            // Attack must target the player, not another Digimon.
            return ctx.trigger.targetPermanentId === undefined;
          },
          // canActivate: on battle area + at least one non-Blocker opponent Digimon
          // exists + THIS Digimon is suspended.
          // Q937/Q938: read the live isSuspended state at activation time.
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = ctx.source.permanent();
            if (self === undefined || !self.isSuspended) return false;
            return hasNonBlockerOpponentDigimon(ctx.game, source);
          },
          resolve: async (ctx) => {
            const candidates = nonBlockerOpponentDigimonIds(ctx.game, source);
            if (candidates.length === 0) return;
            const max = Math.min(1, candidates.length);
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max,
            });
            if (chosen.length > 0) ctx.fx.suspend(chosen);
          },
        }),
      ];
    }

    return [];
  },
};

/**
 * True when the opponent controls at least one battle-area Digimon without ＜Blocker＞
 * (documented behavior CanSelectPermanentCondition: IsPermanentExistsOnOpponentBattleAreaDigimon &&
 * !permanent.HasBlocker). Used as both the canActivate guard and the resolve source.
 */
function hasNonBlockerOpponentDigimon(game: GameAccess, source: CardSource): boolean {
  return nonBlockerOpponentDigimonIds(game, source).length > 0;
}

/**
 * PermanentIds of the opponent's battle-area Digimon that lack ＜Blocker＞ in their
 * printed text. The controller picks one of these
 * to suspend (Q936).
 */
function nonBlockerOpponentDigimonIds(game: GameAccess, source: CardSource): string[] {
  const opponentSeat = game.opponentOf(source.ownerSeat);
  const opponent = game.player(opponentSeat);
  const result: string[] = [];
  for (const permanent of opponent.battleArea) {
    if (permanent.inBreeding) continue;
    const top = permanent.topCard;
    if (top === undefined) continue;
    const def = game.definitionOf(top);
    if (!def.kinds.includes(CardKind.Digimon)) continue;
    // Exclude both live grants and permanents whose printed text declares ＜Blocker＞.
    // A UI target request must reflect the current game state: BT1-103 can grant Blocker
    // after deck construction, and that Digimon is no longer a legal Rosemon target.
    if (game.hasKeyword?.(permanent.permanentId, "Blocker")) continue;
    const text = `${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`.toLowerCase();
    const hasBlocker = text.includes("＜blocker") || text.includes("<blocker");
    if (!hasBlocker) {
      result.push(permanent.permanentId);
    }
  }
  return result;
}

registerCard(module);
export default module;
