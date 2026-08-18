import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-049 — Rosemon (BT26, Green Lv.6 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-049 as of this port
// (`node tools/kb/query.mjs card BT26-049` returned no knowledge-base entries — BT26
// has no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] [Lilamon]/Lv.5 w/[DATA SQUAD] trait: Cost 3 — a digivolution-cost
//     requirement, not an effect clause; already carried by CardDefinition.evoCosts in
//     cards.json, so it needs no entry here.
//   [When Digivolving] [When Attacking] [Once Per Turn] Suspend 2 of your opponent's
//     Digimon or Tamers.
//   [All Turns] [Once Per Turn] When any of your opponent's Digimon or Tamers suspend,
//     or effects trash cards from under your Tamers, you may play or use 1 play cost or
//     use cost 3 or lower [DATA SQUAD] trait card from your hand without paying the
//     cost. For each suspended Digimon or Tamer, add 1 to the cost maximum.
//
// Clause mapping:
//   EffectTiming.WhenDigivolving / EffectTiming.OnAllyAttack (shared effectKey,
//     "Once Per Turn" budget spanning both timings) — "Suspend 2 of your opponent's
//     Digimon or Tamers." Modeled on BT26-042's shared-effectKey + `maxPerTurn: 1` idiom
//     for a single "Once Per Turn" budget spanning multiple trigger timings, and on
//     BT26-050's `isDigimonOrTamer` / `digimonOrTamerTargets` / `pickUpTo2` target-pool
//     shape for an unqualified "Suspend N ..." count. No "you may" in the text, so
//     `optional: false`; the resolve body still no-ops gracefully when the opponent has
//     no eligible permanent.
//
//   EffectTiming.None ([All Turns], continuous) — "When any of your opponent's Digimon
//     or Tamers suspend, or effects trash cards from under your Tamers, you may play or
//     use 1 play cost or use cost 3 or lower [DATA SQUAD] trait card from your hand
//     without paying the cost. For each suspended Digimon or Tamer, add 1 to the cost
//     maximum." Modeled on BT26-048's/BT26-089's `staticModifier` + two independent
//     `subscribeSubTrigger` installs for an "[All Turns]" reactive ability watching two
//     disjoint engine events:
//       - `whenSuspended`, filtered to a subject that is one of the OPPONENT's Digimon
//         or Tamers (any suspend cause — combat or effect, per the printed text's plain
//         "suspend" with no "by an effect" qualifier).
//       - `whenDigivolutionTrashed`, filtered to a subject that is one of the OWNER's
//         Tamer permanents (a Tamer's under-stack cards ARE its "digivolution cards" in
//         engine terms — BT26-089's own "[Start of Your Main Phase] ... place 1 ...
//         face down under this Tamer" treats a Tamer's under-stack the same way).
//     The play-or-use body and the "cost 3 or lower, +1 per opponent's suspended Digimon
//     or Tamer" cap are modeled on BT26-012's/BT26-006's Option-vs-non-Option branch
//     (`useOptionFromHand` for an Option, `playInstances({ payCost: false })` otherwise)
//     — the maximum-cost count is read from the LIVE board at resolution time (mirrors
//     BT21-079's/BT23-057's "for each of your other Digimon, add N to the maximum" idiom
//     — a recomputed board count, not a per-event tally).
//   `maxPerTurn: 1` on the outer staticModifier documents the printed "[Once Per Turn]"
//     the same way EX6-059/EX7-062 do for a `None`-timing reactive install: the engine's
//     own comment (GameEngine.recomputeContinuousEffects: "maxPerTurn is irrelevant —
//     uncounted") means this label does not itself gate the two subscriptions' `run`
//     bodies, so — same as those precedents — the "Once Per Turn" cap on the free
//     play-or-use is not separately enforced by this port; this is an accepted gap
//     shared with every existing card of this exact shape, not a new one.
const cardId = "BT26-049";
const DATA_SQUAD_TRAIT = "DATA SQUAD";
const BASE_COST_CAP = 3;

function isDigimonOrTamer(p: Permanent, ctx: EffectContext): boolean {
  if (p.inBreeding || p.topCard === undefined) return false;
  const def = ctx.game.definitionOf(p.topCard);
  return isDigimon(def) || def.kinds.includes(CardKind.Tamer);
}

/** Battle-area Digimon-or-Tamer permanents (not in breeding) controlled by `seat`. */
function digimonOrTamerTargets(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter((p) => isDigimonOrTamer(p, ctx));
}

/** Choose up to 2 targets from `candidates` (fewer if fewer are available). */
async function pickUpTo2(ctx: EffectContext, candidates: Permanent[]): Promise<string[]> {
  if (candidates.length === 0) return [];
  const want = Math.min(2, candidates.length);
  if (candidates.length <= want) return candidates.map((p) => p.permanentId);
  return ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: want,
    max: want,
  });
}

function hasDataSquadTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(DATA_SQUAD_TRAIT);
}

/**
 * "[When Digivolving] [When Attacking] [Once Per Turn] Suspend 2 of your opponent's
 * Digimon or Tamers." Shared by both timings.
 */
async function resolveSuspendTwoOpponentTargets(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const toSuspend = await pickUpTo2(ctx, digimonOrTamerTargets(ctx, opponentSeat));
  if (toSuspend.length > 0) await ctx.fx.suspend(toSuspend);
}

/**
 * The printed cost cap: 3, plus 1 for each of the opponent's currently-suspended Digimon
 * or Tamers (a live board count at resolution time, not a per-event tally).
 */
function currentCostCap(ctx: EffectContext, source: CardSource): number {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const suspendedCount = digimonOrTamerTargets(ctx, opponentSeat).filter((p) => p.isSuspended).length;
  return BASE_COST_CAP + suspendedCount;
}

function dataSquadFreeCandidates(ctx: EffectContext, source: CardSource, maxCost: number): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.hand).filter((c) => {
    const def = ctx.game.definitionOf(c);
    if (!hasDataSquadTrait(def)) return false;
    return (def.playCost ?? 99) <= maxCost;
  });
}

/**
 * "you may play or use 1 play cost or use cost 3 or lower [DATA SQUAD] trait card from
 * your hand without paying the cost. For each suspended Digimon or Tamer, add 1 to the
 * cost maximum." Shared by both `whenSuspended` and `whenDigivolutionTrashed` watchers.
 */
async function resolveFreePlayOrUseDataSquad(ctx: EffectContext, source: CardSource): Promise<void> {
  const maxCost = currentCostCap(ctx, source);
  const candidates = dataSquadFreeCandidates(ctx, source, maxCost);
  if (candidates.length === 0) return;

  const yes = await ctx.ask.optional(
    ctx,
    `Play or use 1 [DATA SQUAD] trait card with a play/use cost of ${maxCost} or less from your hand without paying the cost?`,
  );
  if (!yes) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length === 0) return;

  const chosenCard = candidates.find((c) => c.instanceId === chosen[0]!);
  if (chosenCard === undefined) return;
  const def = ctx.game.definitionOf(chosenCard);

  if (def.kinds.includes(CardKind.Option)) {
    await ctx.fx.useOptionFromHand(ctx, chosenCard.instanceId, def.playCost);
  } else {
    await ctx.fx.playInstances([chosenCard.instanceId], { payCost: false });
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/wd-wa-suspend-2`,
          description:
            "[When Digivolving] [When Attacking] [Once Per Turn] Suspend 2 of your " +
            "opponent's Digimon or Tamers.",
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0,
          resolve: async (ctx) => resolveSuspendTwoOpponentTargets(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/wd-wa-suspend-2`,
          description:
            "[When Digivolving] [When Attacking] [Once Per Turn] Suspend 2 of your " +
            "opponent's Digimon or Tamers.",
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0,
          resolve: async (ctx) => resolveSuspendTwoOpponentTargets(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-free-play-or-use`,
          description:
            "[All Turns] [Once Per Turn] When any of your opponent's Digimon or Tamers " +
            "suspend, or effects trash cards from under your Tamers, you may play or use " +
            "1 play cost or use cost 3 or lower [DATA SQUAD] trait card from your hand " +
            "without paying the cost. For each suspended Digimon or Tamer, add 1 to the " +
            "cost maximum.",
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;

            // Any of the opponent's Digimon or Tamers suspend (combat or effect).
            ctx.fx.subscribeSubTrigger({
              event: "whenSuspended",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/all-turns-free-play-or-use`,
              description:
                `${cardId}: opponent's Digimon or Tamer suspended -> play or use 1 ` +
                "[DATA SQUAD] card from hand without paying the cost.",
              matches: (subCtx) => {
                const suspendedId = subCtx.trigger?.suspendedPermanentId;
                if (suspendedId === undefined) return false;
                const suspended = subCtx.game.permanentById(suspendedId);
                if (suspended === undefined) return false;
                if (suspended.controllerSeat !== subCtx.game.opponentOf(source.ownerSeat)) return false;
                return isDigimonOrTamer(suspended, subCtx);
              },
              run: async (subCtx) => resolveFreePlayOrUseDataSquad(subCtx, source),
            });

            // Effects trash cards from under the owner's Tamers (a Tamer's under-stack
            // cards are its "digivolution cards" in engine terms).
            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/all-turns-free-play-or-use`,
              description:
                `${cardId}: cards trashed from under one of your Tamers -> play or use 1 ` +
                "[DATA SQUAD] card from hand without paying the cost.",
              matches: (subCtx) => {
                const hostId = subCtx.trigger?.subjectPermanentId;
                if (hostId === undefined) return false;
                const host = subCtx.game.permanentById(hostId);
                if (host === undefined) return false;
                if (host.controllerSeat !== source.ownerSeat) return false;
                if (host.topCard === undefined) return false;
                return subCtx.game.definitionOf(host.topCard).kinds.includes(CardKind.Tamer);
              },
              run: async (subCtx) => resolveFreePlayOrUseDataSquad(subCtx, source),
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
