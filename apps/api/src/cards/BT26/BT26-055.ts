import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, activated, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-055 — Giromon (BT26, Black Lv.5 Digimon).
//
// Verified against committed Q7058: only one Counter effect may be activated per attack.
//
// Printed text:
//   [Digivolve] Lv.4 w/[DM] trait: Cost 3 — a digivolution-cost requirement, not an
//     effect clause; carried by the generated alternate digivolution requirements.
//   ＜Fragment (2)＞ — printed keyword, parsed automatically for combat legality from
//     effectText by the engine's combat/keywords.ts (PRINTED_MATCHERS + fragmentCountOf,
//     which re-reads the "(2)" straight off the printed text). combat/controller.ts's
//     own ＜Fragment＞ prevention step gates on `continuous.hasKeyword`, the explicit
//     grant LEDGER, not the printed-text auto-detect (that reader only feeds
//     resolveKeywords, the client-facing display list) — so it still needs an explicit
//     grant below, same convention as BT26-033's ＜Raid＞/＜Alliance＞/＜Engage＞
//     staticModifier (mirrors BT26-011).
//   [On Play] [When Digivolving] [Counter] [Once Per Turn] You may place 1 card in your
//     hand face down as this Digimon's bottom digivolution card. Then, you may delete 1
//     of your Digimon with the [Ver.3] trait and all of your opponent's Digimon with the
//     lowest play cost.
//   Inherited: [All Turns] [Once Per Turn] When this Digimon would leave the battle
//     area, trash your opponent's top security card.
//
// Clause mapping:
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving / EffectTiming.OnCounterTiming
//   (shared body, "Once Per Turn" shared across all three via one effectKey — mirrors
//   BT26-016's shared-budget convention for a multi-timing ability): "[Counter]"
//   routes to EffectTiming.OnCounterTiming, the engine's dedicated §11-3 response window,
//   so this clause is exposed as a counter response on the permanent and remains distinct
//   from the turn player's OnDeclaration abilities.
//     "You may place 1 card in your hand face down as this Digimon's bottom
//     digivolution card." — an independent optional action (no "if you did" ties it to
//     what follows). `ctx.fx.placeUnder` always sets the placed instance face-down
//     (primitives.ts's `placeUnder`), so a plain bottom placement (no `belowTop`)
//     already matches "face down as this Digimon's bottom digivolution card" with no
//     extra flag needed.
//     "Then, you may delete 1 of your Digimon with the [Ver.3] trait and all of your
//     opponent's Digimon with the lowest play cost." — one "you may" governing a single
//     compound delete: accepting deletes BOTH target groups together (not two
//     independent decisions, unlike BT26-016's "you may X. Then, Y."). Own-side pick
//     mirrors BT26-044's `chooseOne` idiom (auto-pick when exactly 1 candidate, ask when
//     more); the "lowest play cost" opponent-side computation mirrors BT13-108's
//     Security-skill "delete lowest play cost" scan, generalized from "1" to "all"
//     tied-for-lowest. This card's own [Ver.3] trait (per cards.json types) makes it a
//     legal target of its own "1 of your Digimon with the [Ver.3] trait" pick.
//
//   EffectTiming.None, isInherited: true — "[All Turns] [Once Per Turn] When this
//     Digimon would leave the battle area, trash your opponent's top security card."
//     No "it doesn't leave" wording — this is a REACTION at the leave instant, not a
//     prevention, so it is modeled with `subscribeSubTrigger({event: "whenLeavesPlay"})`
//     (fired from GameEngine.ts/combat/controller.ts/primitives.ts on delete-or-bounce),
//     gated to THIS permanent via the `deletedPermanentId` payload field, mirroring
//     BT26-044/BT26-057/BT19-071's reactive-`staticModifier`+`subscribeSubTrigger` idiom.
//     The installing static effect's `maxPerTurn` is documentation only; the persistent
//     watcher enforces the printed cap through a stable, source-instance-scoped
//     `oncePerTurnKey`. Source scoping makes separate Giromon copies independent.

const cardId = "BT26-055";
const VER3_TRAIT = "Ver.3";

function hasTrait(def: CardDefinition, trait: string): boolean {
  return (def.types ?? []).includes(trait);
}

/** Battle-area Digimon permanents (not in breeding) controlled by `seat`. */
function battleAreaDigimon(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter(
    (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

async function chooseOne(ctx: EffectContext, candidates: Permanent[]): Promise<string | undefined> {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0]!.permanentId;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  return chosen[0];
}

/**
 * Shared [On Play]/[When Digivolving]/[Counter] body: an optional face-down placement
 * as this Digimon's bottom digivolution card, then an independent optional compound
 * delete (1 of the controller's [Ver.3] trait Digimon + all of the opponent's lowest
 * play-cost Digimon).
 */
async function resolvePlaceThenMaybeDelete(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = source.permanent();
  if (self === undefined) return;

  // "You may place 1 card in your hand face down as this Digimon's bottom
  // digivolution card."
  const owner = ctx.game.player(source.ownerSeat);
  const handCandidates = Array.from(owner.hand).map((c) => c.instanceId);
  if (handCandidates.length > 0) {
    const wantToPlace = await ctx.ask.optional(
      ctx,
      "Place 1 card from your hand face down as this Digimon's bottom digivolution card?",
    );
    if (wantToPlace) {
      const chosen = await ctx.ask.selectCards(ctx, { candidates: handCandidates, min: 1, max: 1 });
      if (chosen.length > 0) await ctx.fx.placeUnder(self.permanentId, chosen);
    }
  }

  // "Then, you may delete 1 of your Digimon with the [Ver.3] trait and all of your
  // opponent's Digimon with the lowest play cost."
  const ownVer3 = battleAreaDigimon(ctx, source.ownerSeat).filter((p) =>
    hasTrait(ctx.game.definitionOf(p.topCard!), VER3_TRAIT),
  );
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponentTargets = battleAreaDigimon(ctx, opponentSeat);
  if (ownVer3.length === 0 && opponentTargets.length === 0) return;

  const wantToDelete = await ctx.ask.optional(
    ctx,
    "Delete 1 of your Digimon with the [Ver.3] trait and all of your opponent's Digimon " +
      "with the lowest play cost?",
  );
  if (!wantToDelete) return;

  const ownChoice = await chooseOne(ctx, ownVer3);
  if (ownChoice !== undefined) await ctx.fx.deletePermanent([ownChoice], "byEffect");

  const costedOpponentTargets = opponentTargets.filter(
    (permanent) => ctx.game.definitionOf(permanent.topCard!).playCost !== undefined,
  );
  if (costedOpponentTargets.length > 0) {
    const lowestCost = Math.min(...costedOpponentTargets.map((p) => ctx.game.definitionOf(p.topCard!).playCost!));
    const toDelete = costedOpponentTargets
      .filter((p) => ctx.game.definitionOf(p.topCard!).playCost === lowestCost)
      .map((p) => p.permanentId);
    if (toDelete.length > 0) await ctx.fx.deletePermanent(toDelete, "byEffect");
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/place-then-delete`,
          description:
            "[On Play] [When Digivolving] [Counter] [Once Per Turn] You may place 1 card " +
            "in your hand face down as this Digimon's bottom digivolution card. Then, you " +
            "may delete 1 of your Digimon with the [Ver.3] trait and all of your " +
            "opponent's Digimon with the lowest play cost.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await resolvePlaceThenMaybeDelete(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/place-then-delete`,
          description:
            "[On Play] [When Digivolving] [Counter] [Once Per Turn] You may place 1 card " +
            "in your hand face down as this Digimon's bottom digivolution card. Then, you " +
            "may delete 1 of your Digimon with the [Ver.3] trait and all of your " +
            "opponent's Digimon with the lowest play cost.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await resolvePlaceThenMaybeDelete(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnCounterTiming) {
      return [
        activated({
          source,
          effectKey: `${cardId}/place-then-delete`,
          description:
            "[On Play] [When Digivolving] [Counter] [Once Per Turn] You may place 1 card " +
            "in your hand face down as this Digimon's bottom digivolution card. Then, you " +
            "may delete 1 of your Digimon with the [Ver.3] trait and all of your " +
            "opponent's Digimon with the lowest play cost.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await resolvePlaceThenMaybeDelete(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        // Printed ＜Fragment (2)＞ keyword — explicit ledger grant (see header note; the
        // count is re-read from the printed text by fragmentCountOf, not passed here).
        staticModifier({
          source,
          effectKey: `${cardId}/fragment-keyword`,
          description: "＜Fragment (2)＞",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;
            ctx.fx.grantKeyword(me.permanentId, "Fragment", EffectDuration.Permanent);
          },
        }),
        // Inherited: [All Turns] [Once Per Turn] When this Digimon would leave the
        // battle area, trash your opponent's top security card.
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-leave-trash-security`,
          description:
            "[All Turns] (inherited) [Once Per Turn] When this Digimon would leave the " +
            "battle area, trash your opponent's top security card.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const selfId = self.permanentId;

            ctx.fx.subscribeSubTrigger({
              event: "whenLeavesPlay",
              sourcePermanentId: selfId,
              once: false,
              oncePerTurnKey: `${source.instanceId}/${cardId}/inherited-leave-trash-security`,
              description:
                "[All Turns] [Once Per Turn] Trash your opponent's top security card when " +
                "this Digimon leaves the battle area.",
              matches: (subCtx) => subCtx.trigger?.deletedPermanentId === selfId,
              run: async (subCtx) => {
                await subCtx.fx.trashFromSecurity(subCtx.game.opponentOf(source.ownerSeat), 1, {
                  fromTop: true,
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
