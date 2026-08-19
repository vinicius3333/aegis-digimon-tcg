import { CardKind, EffectTiming, type Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { turnTiming, security, beforePayCost } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT25-090";

/**
 * BT25-090 — Tomoro Tenma (BT25 Tamer).
 *
 * [Start of Your Turn] Set memory to 3.
 * [All Turns] When any Digimon suspends, by suspending this Tamer, may place
 *   top 2 deck cards face-down under this Tamer.
 * [Your Turn] [Once Per Turn] BeforePayCost: when using [Glowing Dawn] trait
 *   Option cards (HasUseCost, not HasPlayCost), by trashing bottom face-down card
 * [Security] Play this card.
 */

function tamerWithFaceDownUnder(game: GameAccess, ownerSeat: Seat): string[] {
  const player = game.player(ownerSeat);
  return player.battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = game.definitionOf(p.topCard);
      if (!def.kinds.includes(CardKind.Tamer)) return false;
      return p.stack.some((card) => card.faceUp !== true);
    })
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] Set memory to 3
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-set-memory-3`,
          description: "[Start of Your Turn] Set your memory to 3.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    // [All Turns] When any Digimon suspends, by suspending, may place top 2 deck under
    if (timing === EffectTiming.OnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-suspend-place-under`,
          description:
            "[All Turns] When any Digimon suspends, by suspending this Tamer, " +
            "you may place the top 2 cards of your deck face down under this Tamer.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            return perm !== undefined && !perm.isSuspended && !perm.inBreeding;
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;

            const owner = ctx.game.player(ctx.source.ownerSeat);
            if (owner.deck.length >= 1) {
              const topIds = owner.deck.slice(0, Math.min(2, owner.deck.length)).map((c) => c.instanceId);
              ctx.fx.placeUnder(selfPerm.permanentId, topIds, { belowTop: false });
            }
          },
        }),
      ];
    }

    // [Your Turn] [Once Per Turn] BeforePayCost: reduce USE cost of [Glowing Dawn] Options by 1
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-reduce-use-cost-glowing-dawn-option`,
          description:
            "[Your Turn] [Once Per Turn] When you would use [Glowing Dawn] trait Option cards, " +
            "by trashing the bottom face-down card from under any of your Tamers, reduce the cost by 1.",
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            const def = ctx.source.definition;
            if (def === undefined) return false;
            const traits = def.types ?? [];
            const hasGlowingDawn = traits.includes("Glowing Dawn") || traits.includes("GlowingDawn");
            // Options only
            const isOption = def.kinds.includes(CardKind.Option);
            const inHand = ctx.source.permanent() === undefined;
            return hasGlowingDawn && isOption && inHand && def.playCost >= 0;
          },
          canActivate: (ctx) => {
            return tamerWithFaceDownUnder(ctx.game, ctx.source.ownerSeat).length > 0;
          },
          resolve: async (ctx) => {
            const tamerIds = tamerWithFaceDownUnder(ctx.game, ctx.source.ownerSeat);
            if (tamerIds.length === 0) return;

            const wantToPay = await ctx.ask.optional(
              ctx,
              "Trash 1 face-down card from under a Tamer to reduce use cost by 1?",
            );
            if (!wantToPay) return;

            const chosenTamer = await ctx.ask.chooseTargets(ctx, {
              candidates: tamerIds,
              min: 1,
              max: 1,
            });
            if (chosenTamer.length === 0) return;

            const tamerPerm = ctx.game.permanentById(chosenTamer[0]!);
            if (tamerPerm === undefined || tamerPerm.stack.length === 0) return;

            const bottomCard = tamerPerm.stack.find((card) => card.faceUp !== true);
            if (bottomCard === undefined) return;

            await ctx.fx.trashDigivolutionCards(chosenTamer[0]!, [bottomCard.instanceId]);

            // Reduce play cost by 1 (use-cost reduction for Options also goes through memory)
            ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 1;
          },
        }),
      ];
    }

    // [Security] Play this card
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
