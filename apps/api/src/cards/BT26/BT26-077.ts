import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, whenAttacking, onDeletion, turnTiming } from "../../engine/effects/builders.js";
import { runEffect } from "../../engine/effects/interpreter/dispatch.js";
import { executeActivatedEffect } from "../../engine/effects/interpreter/registration/keywords.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-077 — Reapermon (BT26, Purple/Black Mega Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-077 as of this port
// (`node tools/kb/query.mjs card BT26-077` returned no knowledge-base entries — BT26
// has no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.5 w/[DM] trait: Cost 3 — a digivolution-cost requirement, not an
//     effect clause. The catalog only carries the ordinary Purple/Black Lv.5 cost-4
//     rows, so this requires an ALTERNATE_DIGIVOLUTION_OVERRIDES entry in shared data.
//   ＜Security A. +1＞ / ＜Fragment (2)＞ — intrinsic keyword readers parse these from
//     effectText. ＜Execute＞ additionally synthesizes its optional end-of-your-turn attack
//     and pending end-of-attack deletion below, reusing the interpreter's canonical body.
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 play
//     cost of 6 or lower [Ver.3] trait Digimon card from your trash without paying the
//     cost. For each of this Digimon's face-down digivolution cards, add 1 to the play
//     cost maximum.
//   [On Deletion] Delete 1 of your opponent's Digimon or Tamers with the highest play
//     cost.
//
// Clause mapping:
//   EffectTiming.OnPlay / WhenDigivolving / OnAllyAttack (shared body, Once Per Turn) —
//     all three timings share one effectKey so `maxPerTurn: 1` is a single counter
//     across them, mirroring EX8-063's dual-timing shared-counter shape (extended here
//     to three timings). The play-cost ceiling (base 6) is raised by 1 per face-down
//     digivolution card on this Digimon, computed inline at resolve time — the same
//     "recompute the ceiling, no persistent modifier" idiom as EX6-059's
//     "reduce this effect's play cost maximum by 1" and BT26-043's face-down-card
//     counting (`stack.filter((c) => c.faceUp !== true).length`).
//   EffectTiming.OnDestroyedAnyone ([On Deletion]) — "Delete 1 of your opponent's
//     Digimon or Tamers with the highest play cost" mirrors BT11-107's
//     `opponentHighestPlayCost` security clause, widened from Digimon-only to
//     Digimon-or-Tamer. The `onDeletion` builder's base guard already restricts firing
//     to this permanent's own deletion (`ctx.trigger.deletedInstanceIds` contains this
//     instance), matching the printed "[On Deletion]" (this card's own, not inherited).

const cardId = "BT26-077";

const SHARED_EFFECT_KEY = `${cardId}/play-ver3-from-trash`;
const BASE_PLAY_COST_CEILING = 6;
const EXECUTE_EFFECT = executeActivatedEffect();

function hasVer3Trait(def: CardDefinition): boolean {
  return (def.types as string[] | undefined)?.includes("Ver.3") ?? false;
}

function faceDownDigivolutionCount(ctx: EffectContext, permanentId: string): number {
  const permanent = ctx.game.permanentById(permanentId);
  return permanent?.stack.filter((c) => c.faceUp !== true).length ?? 0;
}

async function resolveSharedEffect(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = source.permanent();
  if (self === undefined) return;

  const ceiling = BASE_PLAY_COST_CEILING + faceDownDigivolutionCount(ctx, self.permanentId);
  const ownerSeat = source.ownerSeat;
  const candidates = Array.from(ctx.game.player(ownerSeat).trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isDigimon(def) && hasVer3Trait(def) && (def.playCost ?? Infinity) <= ceiling;
  });
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length > 0) {
    await ctx.fx.playInstances(chosen, { payCost: false });
  }
}

function canResolveSharedEffect(ctx: EffectContext, source: CardSource): boolean {
  const self = source.permanent();
  if (self === undefined) return false;
  const ceiling = BASE_PLAY_COST_CEILING + faceDownDigivolutionCount(ctx, self.permanentId);
  return Array.from(ctx.game.player(source.ownerSeat).trash).some((card) => {
    const definition = ctx.game.definitionOf(card);
    return isDigimon(definition) && hasVer3Trait(definition) && (definition.playCost ?? Infinity) <= ceiling;
  });
}

function isDigimonOrTamer(p: Permanent, ctx: EffectContext): boolean {
  if (p.inBreeding || p.topCard === undefined) return false;
  const def = ctx.game.definitionOf(p.topCard);
  return isDigimon(def) || isTamer(def);
}

function opponentHighestPlayCostDigimonOrTamer(ctx: EffectContext, source: CardSource): string[] {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const targets = ctx.game.player(opponentSeat).battleArea.filter((p) => isDigimonOrTamer(p, ctx));
  if (targets.length === 0) return [];
  const maxCost = Math.max(
    ...targets.map((p) => ctx.game.definitionOf(p.topCard!).playCost ?? 0),
  );
  return targets
    .filter((p) => (ctx.game.definitionOf(p.topCard!).playCost ?? 0) === maxCost)
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/execute`,
          description:
            "＜Execute＞ [End of Your Turn] This Digimon may attack. At the end of the attack, delete this Digimon.",
          optional: false,
          when: () => source.isOwnersTurn(),
          resolve: (ctx) => runEffect(ctx, EXECUTE_EFFECT),
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: SHARED_EFFECT_KEY,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may " +
            "play 1 play cost of 6 or lower [Ver.3] trait Digimon card from your trash " +
            "without paying the cost. For each of this Digimon's face-down digivolution " +
            "cards, add 1 to the play cost maximum.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => canResolveSharedEffect(ctx, source),
          resolve: (ctx) => resolveSharedEffect(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: SHARED_EFFECT_KEY,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may " +
            "play 1 play cost of 6 or lower [Ver.3] trait Digimon card from your trash " +
            "without paying the cost. For each of this Digimon's face-down digivolution " +
            "cards, add 1 to the play cost maximum.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => canResolveSharedEffect(ctx, source),
          resolve: (ctx) => resolveSharedEffect(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: SHARED_EFFECT_KEY,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may " +
            "play 1 play cost of 6 or lower [Ver.3] trait Digimon card from your trash " +
            "without paying the cost. For each of this Digimon's face-down digivolution " +
            "cards, add 1 to the play cost maximum.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => canResolveSharedEffect(ctx, source),
          resolve: (ctx) => resolveSharedEffect(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-delete-highest-cost`,
          description:
            "[On Deletion] Delete 1 of your opponent's Digimon or Tamers with the " +
            "highest play cost.",
          optional: false,
          canActivate: (ctx) => opponentHighestPlayCostDigimonOrTamer(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = opponentHighestPlayCostDigimonOrTamer(ctx, source);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.deletePermanent(chosen, "byEffect");
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
