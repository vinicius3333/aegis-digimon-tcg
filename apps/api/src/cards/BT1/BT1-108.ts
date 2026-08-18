import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT1-108 Horn Buster (BT1, Red Option).
// declarative effect record carried "add this card its owner's hand" as an inert parser fallback, so the
// [Security] effect resolved without returning the card to hand (card went to trash
// instead). The hand-written module implements the returnToHand call.
//
// Authoritative text (no errata; printed text stands):
//   [Main] 1 of your Digimon gets +3000 DP for the turn.
//   [Security] Suspend 1 of your opponent's Digimon. Then add this card to its owner's hand.
//
//   EffectTiming.OptionSkill → EffectTiming.OnPlay   ([Main] activated by playing the Option)
//   EffectTiming.SecuritySkill → EffectTiming.SecuritySkill ([Security] fired on security check)

const cardId = "BT1-108";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-dp-boost`,
          description: "[Main] 1 of your Digimon gets +3000 DP for the turn.",
          optional: false,
          canActivate: (ctx) => ownDigimonIds(ctx.game, source).length > 0,
          resolve: async (ctx) => {
            const candidates = ownDigimonIds(ctx.game, source);
            if (candidates.length === 0) return;
            const [picked] = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (picked !== undefined) {
              ctx.fx.modifyDP(picked, 3000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-suspend-return`,
          description:
            "[Security] Suspend 1 of your opponent's Digimon. Then add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            const candidates = opponentDigimonIds(ctx.game, source);
            if (candidates.length > 0) {
              const [picked] = await ctx.ask.chooseTargets(ctx, {
                candidates,
                min: 1,
                max: 1,
              });
              if (picked !== undefined) {
                await ctx.fx.suspend([picked]);
              }
            }
            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

/**
 * PermanentIds of the controller's battle-area Digimon.
 */
function ownDigimonIds(game: GameAccess, source: CardSource): string[] {
  const owner = game.player(source.ownerSeat);
  const result: string[] = [];
  for (const permanent of owner.battleArea) {
    if (permanent.inBreeding) continue;
    const top = permanent.topCard;
    if (top === undefined) continue;
    if (game.definitionOf(top).kinds.includes(CardKind.Digimon)) {
      result.push(permanent.permanentId);
    }
  }
  return result;
}

/**
 * PermanentIds of the opponent's battle-area Digimon.
 */
function opponentDigimonIds(game: GameAccess, source: CardSource): string[] {
  const opponentSeat = game.opponentOf(source.ownerSeat);
  const opponent = game.player(opponentSeat);
  const result: string[] = [];
  for (const permanent of opponent.battleArea) {
    if (permanent.inBreeding) continue;
    const top = permanent.topCard;
    if (top === undefined) continue;
    if (game.definitionOf(top).kinds.includes(CardKind.Digimon)) {
      result.push(permanent.permanentId);
    }
  }
  return result;
}

registerCard(module);
export default module;
