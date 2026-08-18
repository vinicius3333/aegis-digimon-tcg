import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-066 — Salamon (BT26, Purple Lv.3 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-066 as of this port
// (`node tools/kb/query.mjs card BT26-066` returned no knowledge-base entries — BT26 has
// no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.2 w/[TS] trait: Cost 0 — a digivolution-cost requirement, not an
//     effect clause; already carried by CardDefinition.evoCosts, not implemented here.
//   [Start of Your Main Phase] If your hand has 5 or fewer cards, 1 of your Digimon with
//     the [Titan] trait may digivolve into a Digimon card with the [Titan] trait in the
//     trash with the cost reduced by 2.
//   Inherited: [Your Turn] [Once Per Turn] When your hand is trashed from, this [Titan]
//     trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon card in the
//     trash with the cost reduced by 1.
//
// Clause mapping:
//   EffectTiming.OnStartMainPhase — "If your hand has 5 or fewer cards, 1 of your Digimon
//     with the [Titan] trait may digivolve into a Digimon card with the [Titan] trait in
//     the trash with the cost reduced by 2." Modeled on BT26-034's `turnTiming` +
//     `optional: true` shape for a "[Start of Your Main Phase] ... may digivolve" clause
//     (`when` gates `isOnBattleArea() && isOwnersTurn()`, matching every other BT26
//     OnStartMainPhase precedent — BT26-009/034/089/090/062 — over EX7-064's
//     un-turn-gated outlier). Unlike BT26-034 (base is always "this Digimon", target in
//     hand, free), here the base is chosen from among ALL of the controller's on-field
//     [Titan] trait Digimon (not necessarily this card) and the target is a [Titan] trait
//     Digimon card in the TRASH with the cost reduced by 2 — a trait-based alternate
//     digivolve path, so `digivolveFromInstance(..., { payCost: true, costDelta: -2,
//     ignoreRequirements: true })` per BT26-044/BT13-109's precedent for "digivolve into a
//     [trait] card ... with the cost reduced by N" (ignoring the printed evo chain, since
//     the effect grants its own alternate path).
//
//   EffectTiming.None, isInherited: true (staticModifier + subscribeSubTrigger) — "[Your
//     Turn] [Once Per Turn] When your hand is trashed from, this [Titan] trait Digimon may
//     digivolve into [Titamon] or a [Titan] trait Digimon card in the trash with the cost
//     reduced by 1." Modeled on BT13-008's inherited reactive shape (`isInherited: true`,
//     `when: isOnBattleArea() && isOwnersTurn()`, `maxPerTurn: 1`, subscribing a SubTrigger
//     from inside `resolve` against the HOST permanent — `ctx.source.permanent()` — rather
//     than this card's own permanent, since as digivolution material this card grants the
//     ability to whatever it ends up stacked under) combined with `whenHandTrashed`'s "your
//     hand is trashed from" idiom (ST16-13, BT26-059: `matches` reads
//     `subCtx.trigger?.handTrashedSeat === ownerSeat`). "This [Titan] trait Digimon" gates
//     the reaction on the HOST's current top card carrying the Titan trait (mirrors
//     BT26-044's `nameOrTraitQualifies` re-check at consult time, since the host may not be
//     this card itself). The digivolve target pool is [Titamon] by exact name OR any
//     [Titan] trait Digimon card in the trash, again via `digivolveFromInstance(...,
//     { payCost: true, costDelta: -1, ignoreRequirements: true })`.

const cardId = "BT26-066";
const TITAN_TRAIT = "Titan";
const TITAMON_NAME = "Titamon";

function hasTitanTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(TITAN_TRAIT);
}

/** Battle-area (non-breeding) Digimon controlled by `seat` that carry the [Titan] trait. */
function titanDigimonBattleAreaTargets(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) && hasTitanTrait(def);
  });
}

/** `seat`'s trash cards that are [Titan] trait Digimon. */
function titanTrashCandidates(ctx: EffectContext, seat: Seat): CardInstance[] {
  return Array.from(ctx.game.player(seat).trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isDigimon(def) && hasTitanTrait(def);
  });
}

/** `seat`'s trash cards that are [Titamon] by name or any [Titan] trait Digimon. */
function titamonOrTitanTrashCandidates(ctx: EffectContext, seat: Seat): CardInstance[] {
  return Array.from(ctx.game.player(seat).trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    if (!isDigimon(def)) return false;
    return def.nameEn === TITAMON_NAME || hasTitanTrait(def);
  });
}

async function chooseOnePermanent(ctx: EffectContext, candidates: Permanent[]): Promise<string | undefined> {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0]!.permanentId;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  return chosen[0];
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as Seat;

    // [Start of Your Main Phase] If your hand has 5 or fewer cards, 1 of your Digimon
    // with the [Titan] trait may digivolve into a Digimon card with the [Titan] trait
    // in the trash with the cost reduced by 2.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-titan-alt-digivolve`,
          description:
            "[Start of Your Main Phase] If your hand has 5 or fewer cards, 1 of your " +
            "Digimon with the [Titan] trait may digivolve into a Digimon card with the " +
            "[Titan] trait in the trash with the cost reduced by 2.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) =>
            ctx.game.player(ownerSeat).hand.length <= 5 &&
            titanDigimonBattleAreaTargets(ctx, ownerSeat).length > 0 &&
            titanTrashCandidates(ctx, ownerSeat).length > 0,
          resolve: async (ctx) => {
            const baseTargets = titanDigimonBattleAreaTargets(ctx, ownerSeat);
            if (baseTargets.length === 0) return;

            const trashCandidates = titanTrashCandidates(ctx, ownerSeat);
            if (trashCandidates.length === 0) return;

            const baseId = await chooseOnePermanent(ctx, baseTargets);
            if (baseId === undefined) return;

            const chosenTrash = await ctx.ask.selectCards(ctx, {
              candidates: trashCandidates.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (chosenTrash.length === 0) return;

            await ctx.fx.digivolveFromInstance(baseId, chosenTrash[0]!, {
              payCost: true,
              costDelta: -2,
              ignoreRequirements: true,
            });
          },
        }),
      ];
    }

    // Inherited: [Your Turn] [Once Per Turn] When your hand is trashed from, this
    // [Titan] trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon
    // card in the trash with the cost reduced by 1.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-hand-trashed-alt-digivolve`,
          description:
            "[Your Turn] [Once Per Turn] (inherited) When your hand is trashed from, " +
            "this [Titan] trait Digimon may digivolve into [Titamon] or a [Titan] trait " +
            "Digimon card in the trash with the cost reduced by 1.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;

            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${cardId}/inherited-hand-trashed-alt-digivolve`,
              description: `${cardId}: your hand is trashed from -> this [Titan] Digimon may alt-digivolve.`,
              matches: (subCtx) => subCtx.trigger?.handTrashedSeat === ownerSeat,
              run: async (subCtx) => {
                const currentHost = subCtx.game.permanentById(hostId);
                if (currentHost === undefined || currentHost.inBreeding || currentHost.topCard === undefined) {
                  return;
                }
                if (!hasTitanTrait(subCtx.game.definitionOf(currentHost.topCard))) return;

                const candidates = titamonOrTitanTrashCandidates(subCtx, ownerSeat);
                if (candidates.length === 0) return;

                const wantToActivate = await subCtx.ask.optional(
                  subCtx,
                  "Digivolve this Digimon into [Titamon] or a [Titan] trait Digimon card " +
                    "in the trash, with the cost reduced by 1?",
                );
                if (!wantToActivate) return;

                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length === 0) return;

                await subCtx.fx.digivolveFromInstance(hostId, chosen[0]!, {
                  payCost: true,
                  costDelta: -1,
                  ignoreRequirements: true,
                });
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
