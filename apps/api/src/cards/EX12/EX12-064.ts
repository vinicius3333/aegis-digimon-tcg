import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX12-064 — Megadramon (EX12, Black Lv.5 Digimon).
 *
 *
 * Authoritative text:
 *   [On Play] / [When Digivolving] Delete 1 of your opponent's Digimon with a level of 4
 *     or lower. If this effect didn't delete a Digimon, de-digivolve 1 of your opponent's
 *     Digimon 1 time.
 *   [All Turns][Once Per Turn] When any of your [Machine], [Cyborg] or [ME] trait Digimon
 *     are played, you may activate 1 of this Digimon's [When Digivolving] effects.
 *   [Inherited][End of Attack][Once Per Turn] By unsuspending this Digimon, delete
 *     1 of your Digimon with the lowest play cost.
 *
 */
const cardId = "EX12-064";

const TRAITS_MACHINE_ME: readonly string[] = ["Machine", "Cyborg", "ME"];

function isLv4OrLowerOpponentDigimon(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  const oppSeat = ctx.game.opponentOf(ownerSeat);
  return ctx.game
    .player(oppSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      if (!isDigimon(def)) return false;
      return def.level !== undefined && def.level <= 4;
    })
    .map((p) => p.permanentId);
}

function opponentDigimonPermanentIds(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  const oppSeat = ctx.game.opponentOf(ownerSeat);
  return ctx.game
    .player(oppSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard));
    })
    .map((p) => p.permanentId);
}

async function resolveDeleteOrDeDigivolve(
  ctx: EffectContext,
  ownerSeat: 0 | 1,
): Promise<void> {
  const lv4Candidates = isLv4OrLowerOpponentDigimon(ctx, ownerSeat);
  if (lv4Candidates.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, { candidates: lv4Candidates, min: 1, max: 1 });
    const deleted = await ctx.fx.deletePermanent(chosen);
    if (deleted > 0) return;
  }
  // If this effect didn't delete a Digimon, de-digivolve 1 opponent Digimon 1 time.
  const oppDigimon = opponentDigimonPermanentIds(ctx, ownerSeat);
  if (oppDigimon.length === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates: oppDigimon, min: 1, max: 1 });
  for (const id of chosen) {
    ctx.fx.deDigivolve(id, 1);
  }
}

function ownLowestPlayCostDigimonPermIds(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  const owner = ctx.game.player(ownerSeat);
  const digimon = owner.battleArea.filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    return isDigimon(ctx.game.definitionOf(p.topCard));
  });
  if (digimon.length === 0) return [];
  const costs = digimon.map((p) => ctx.game.definitionOf(p.topCard!).playCost ?? 0);
  const min = Math.min(...costs);
  return digimon
    .filter((p) => (ctx.game.definitionOf(p.topCard!).playCost ?? 0) === min)
    .map((p) => p.permanentId);
}

function hasMatchingTrait(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  const traits = def.types as string[] | undefined;
  if (traits === undefined) return false;
  return TRAITS_MACHINE_ME.some((t) => traits.includes(t));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [On Play] Delete 1 opp Digimon Lv.4 or lower; if none deleted → de-digivolve 1.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-delete-or-dedigivolve`,
          description:
            "[On Play] Delete 1 of your opponent's Digimon with a level of 4 or lower. " +
            "If this effect didn't delete a Digimon, de-digivolve 1 of your opponent's Digimon 1 time.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await resolveDeleteOrDeDigivolve(ctx, ownerSeat);
          },
        }),
      ];
    }

    // [When Digivolving] Delete 1 opp Digimon Lv.4 or lower; if none deleted → de-digivolve 1.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-or-dedigivolve`,
          description:
            "[When Digivolving] Delete 1 of your opponent's Digimon with a level of 4 or lower. " +
            "If this effect didn't delete a Digimon, de-digivolve 1 of your opponent's Digimon 1 time.",
          optional: false,
          resolve: async (ctx) => {
            await resolveDeleteOrDeDigivolve(ctx, ownerSeat);
          },
        }),
      ];
    }

    // [All Turns][Once Per Turn] When any of your [Machine], [Cyborg] or [ME] trait Digimon
    // are played, you may activate 1 of this Digimon's [When Digivolving] effects.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-machine-played-watcher`,
          description:
            "[All Turns][Once Per Turn] When any of your [Machine], [Cyborg] or [ME] trait " +
            "Digimon are played, you may activate 1 of this Digimon's [When Digivolving] effects.",
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            if (subject.controllerSeat !== ownerSeat) return false;
            return hasMatchingTrait(ctx.game.definitionOf(subject.topCard));
          },
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            await ctx.fx.reactivateOnPlay?.(self.permanentId, {
              timings: [EffectTiming.WhenDigivolving],
              chooseOne: true,
              outsideTriggerWindow: true,
            });
          },
        }),
      ];
    }

    // [Inherited][End of Attack][Once Per Turn] By unsuspending this Digimon, delete
    // 1 of your Digimon with the lowest play cost.
    if (timing === EffectTiming.OnEndAttack) {
      return [
        {
          effectKey: `${cardId}/inherited-end-of-attack-delete-own-lowest`,
          description:
            "[Inherited][End of Attack][Once Per Turn] By unsuspending this Digimon, " +
            "delete 1 of your Digimon with the lowest play cost.",
          optional: true,
          isInherited: true,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: 1,
          canTrigger: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return false;
            if (!perm.isSuspended) return false;
            return ownLowestPlayCostDigimonPermIds(ctx, ownerSeat).length > 0;
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            // Cost: unsuspend this Digimon
            ctx.fx.unsuspend([perm.permanentId]);
            // Effect: delete 1 of your Digimon with the lowest play cost
            const candidates = ownLowestPlayCostDigimonPermIds(ctx, ownerSeat);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            await ctx.fx.deletePermanent(chosen);
          },
        },
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
