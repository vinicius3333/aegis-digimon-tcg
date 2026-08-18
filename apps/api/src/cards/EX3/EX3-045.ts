import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX3-045 — Hydramon (EX3, Green Lv.6 Digimon).
 *
 *
 * Authoritative text (errata 2022-11-11):
 *   [When Digivolving] You may suspend 1 Digimon.
 *   [All Turns][Once Per Turn] When an opponent's Digimon becomes suspended, for each other
 *     suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their traits you have
 *     in play, gain 1 memory.
 *   [End of Your Turn][Once Per Turn] If you have 2 or more suspended Digimon with
 *     [Vegetation], [Plant], or [Fairy] in one of their traits, return 1 of your opponent's
 *     suspended Digimon to the bottom of its owner's deck.
 *
 *   EffectTiming.OnEnterFieldAnyone (WhenDigivolving): Select 1 Digimon to suspend (optional).
 *   EffectTiming.OnTappedAnyone (whenSuspended): count = suspended owner Digimon with
 *     HasPlantTraits or HasFairyTraits, excluding self; gainMemory(count). Once per turn.
 *   EffectTiming.OnEndTurn (EndOfYourTurn): if owner has ≥2 suspended Plant/Fairy/Vegetation
 *     Digimon, return 1 opponent suspended Digimon to deck bottom. Once per turn.
 *
 * Errata extends "in their traits" — all three are checked.
 */
const cardId = "EX3-045";

const VEGETATION_TRAITS = ["Vegetation", "Plant", "Fairy"];

function hasVegetationTrait(def: CardDefinition): boolean {
  const traits = def.types as string[] | undefined;
  if (traits === undefined) return false;
  return VEGETATION_TRAITS.some((t) => traits.includes(t));
}

function suspendedVegetationDigimon(ctx: EffectContext, ownerSeat: 0 | 1, excludePermId?: string): number {
  return ctx.game.player(ownerSeat).battleArea.filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    if (excludePermId !== undefined && p.permanentId === excludePermId) return false;
    if (!p.isSuspended) return false;
    const def = ctx.game.definitionOf(p.topCard);
    if (!isDigimon(def)) return false;
    return hasVegetationTrait(def);
  }).length;
}

function opponentSuspendedDigimonPermIds(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  const oppSeat = ctx.game.opponentOf(ownerSeat);
  return ctx.game
    .player(oppSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      if (!p.isSuspended) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard));
    })
    .map((p) => p.permanentId);
}

function unsuspendedBattleAreaDigimon(ctx: EffectContext): string[] {
  const result: string[] = [];
  for (const seat of [0, 1] as const) {
    for (const p of ctx.game.player(seat).battleArea) {
      if (p.inBreeding || p.topCard === undefined) continue;
      if (p.isSuspended) continue;
      if (isDigimon(ctx.game.definitionOf(p.topCard))) result.push(p.permanentId);
    }
  }
  return result;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [When Digivolving] You may suspend 1 Digimon.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-1`,
          description: "[When Digivolving] You may suspend 1 Digimon.",
          optional: true,
          canActivate: (ctx) => {
            return unsuspendedBattleAreaDigimon(ctx).length > 0;
          },
          resolve: async (ctx) => {
            const candidates = unsuspendedBattleAreaDigimon(ctx);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            await ctx.fx.suspend(chosen);
          },
        }),
      ];
    }

    // [All Turns][Once Per Turn] When an opponent's Digimon becomes suspended, gain 1 memory
    // for each other suspended Digimon with [Vegetation], [Plant], or [Fairy] you have in play.
    if (timing === EffectTiming.OnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-opponent-suspended-gain-memory`,
          description:
            "[All Turns][Once Per Turn] When an opponent's Digimon becomes suspended, for each " +
            "other suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their " +
            "traits you have in play, gain 1 memory.",
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            // The suspended permanent must be an opponent's Digimon
            const suspendedId = ctx.trigger.suspendedPermanentId;
            if (suspendedId === undefined) return false;
            const perm = ctx.game.permanentById(suspendedId);
            if (perm === undefined || perm.topCard === undefined) return false;
            if (perm.controllerSeat === ownerSeat) return false;
            return isDigimon(ctx.game.definitionOf(perm.topCard));
          },
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            const count = suspendedVegetationDigimon(ctx, ownerSeat, selfPerm?.permanentId);
            if (count > 0) {
              // [All Turns]: an opponent's Digimon can become suspended on either turn.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, count);
            }
          },
        }),
      ];
    }

    // [End of Your Turn][Once Per Turn] If you have 2+ suspended Vegetation/Plant/Fairy Digimon,
    // return 1 of your opponent's suspended Digimon to the bottom of its owner's deck.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-your-turn-bounce-opp-suspended`,
          description:
            "[End of Your Turn][Once Per Turn] If you have 2 or more suspended Digimon with " +
            "[Vegetation], [Plant], or [Fairy] in one of their traits, return 1 of your opponent's " +
            "suspended Digimon to the bottom of its owner's deck.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            return suspendedVegetationDigimon(ctx, ownerSeat) >= 2;
          },
          resolve: async (ctx) => {
            const candidates = opponentSuspendedDigimonPermIds(ctx, ownerSeat);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;
            // Return permanent's top card to deck bottom
            for (const permId of chosen) {
              const perm = ctx.game.permanentById(permId);
              if (perm === undefined || perm.topCard === undefined) continue;
              await ctx.fx.returnToDeck([perm.topCard.instanceId], { toTop: false });
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
