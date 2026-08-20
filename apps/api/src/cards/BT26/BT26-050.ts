import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { cardHasTrait, permanentHasTrait } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-050 — Rosemon: Burst Mode // Aguichant Lèvres (BT26 Green/Red DUAL Digimon/Option).
// Verified against Q7052-Q7055: either player's cards may be suspended; the two cards locked
// need not be the cards suspended; Burst Digivolve retains its end-of-turn trash processing;
// and the controller chooses the order of the simultaneous [When Digivolving] effects.
//
// [Digivolve] Lv.6 w/[DATA SQUAD] trait: Cost 5 [Burst Digivolve] [Rosemon]: Cost 0 by
//   returning 1 [Yoshino Fujieda] to the hand.
//   (Both digivolve headers are handled centrally by ALTERNATE_DIGIVOLUTION_OVERRIDES —
//   ignored here per the card implementation notes.)
// [When Digivolving] You may suspend 2 Digimon or Tamers. Then, 2 of your opponent's
//   Digimon or Tamers can't unsuspend until their turn ends.
// [When Digivolving] [When Attacking] By returning 1 other suspended Digimon to the bottom
//   of the deck, trash your opponent's top security card.
//
// Q7052/Q7053 confirm the first clause's "You may suspend 2 Digimon or Tamers" and "2 of
// your opponent's Digimon or Tamers can't unsuspend" are printed as two separate target
// counts (the first is unqualified by controller; only the second says "of your
// opponent's"), so this port treats them as two independent 2-target selections gated by a
// single up-front optional ask; the two selections need not contain the same permanents.
// The suspend-cost target pool for the second clause ("1 other suspended Digimon") is left
// unqualified by controller (either side), mirroring this codebase's own compiler default
// for an unqualified targeted-cost Digimon reference (see EX8-074's "by suspending 2
// Digimon" -> controllerDefault: "any").
//
// Option side [Aguichant Lèvres]:
// ＜Use Req. ([DATA SQUAD] trait)＞ — executable color-requirement waiver while such a card is
// in the controller's battle area.
// [Main] Suspend 2 of your opponent's Digimon or Tamers. Then, until their turn ends, none
//   of their suspended Digimon or Tamers can digivolve or unsuspend.

const cardId = "BT26-050";

function isDigimonOrTamer(p: Permanent, ctx: EffectContext): boolean {
  if (p.inBreeding || p.topCard === undefined) return false;
  const def = ctx.game.definitionOf(p.topCard);
  return isDigimon(def) || def.kinds.includes(CardKind.Tamer);
}

/** Battle-area Digimon-or-Tamer permanents (not in breeding) controlled by `seat`. */
function digimonOrTamerTargets(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter((p) => isDigimonOrTamer(p, ctx));
}

/** Same as above, restricted to currently-suspended permanents. */
function suspendedDigimonOrTamerTargets(ctx: EffectContext, seat: Seat): Permanent[] {
  return digimonOrTamerTargets(ctx, seat).filter((p) => p.isSuspended);
}

/** Any suspended Digimon on the field (either side), excluding `source`'s own permanent. */
function otherSuspendedDigimonTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const selfId = source.permanent()?.permanentId;
  const all: Permanent[] = [];
  for (const seat of [source.ownerSeat, ctx.game.opponentOf(source.ownerSeat)]) {
    for (const p of ctx.game.player(seat).battleArea) {
      if (p.inBreeding || p.topCard === undefined) continue;
      if (p.permanentId === selfId) continue;
      if (!p.isSuspended) continue;
      if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
      all.push(p);
    }
  }
  return all;
}

function ownerHasDataSquadCardInPlay(ctx: EffectContext, source: CardSource): boolean {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).some((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    return permanentHasTrait(ctx.game, permanent, "DATA SQUAD");
  });
}

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

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-data-squad`,
          description: "＜Use Req. ([DATA SQUAD] trait)＞ Ignore this card's color requirements.",
          when: (ctx) => ownerHasDataSquadCardInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/wd-suspend-lock`,
          description:
            "[When Digivolving] You may suspend 2 Digimon or Tamers. Then, 2 of your " +
            "opponent's Digimon or Tamers can't unsuspend until their turn ends.",
          optional: true,
          canActivate: (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            return (
              digimonOrTamerTargets(ctx, source.ownerSeat).length > 0 || digimonOrTamerTargets(ctx, opp).length > 0
            );
          },
          resolve: async (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);

            const suspendCandidates = [
              ...digimonOrTamerTargets(ctx, source.ownerSeat),
              ...digimonOrTamerTargets(ctx, opp),
            ];
            const toSuspend = await pickUpTo2(ctx, suspendCandidates);
            if (toSuspend.length > 0) await ctx.fx.suspend(toSuspend);

            const lockCandidates = digimonOrTamerTargets(ctx, opp);
            const toLock = await pickUpTo2(ctx, lockCandidates);
            for (const permanentId of toLock) {
              ctx.fx.restrict(permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/wd-wa-return-for-security`,
          description:
            "[When Digivolving] [When Attacking] By returning 1 other suspended Digimon to " +
            "the bottom of the deck, trash your opponent's top security card.",
          canActivate: (ctx) => otherSuspendedDigimonTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            await returnSuspendedDigimonForSecurity(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/wd-wa-return-for-security`,
          description:
            "[When Digivolving] [When Attacking] By returning 1 other suspended Digimon to " +
            "the bottom of the deck, trash your opponent's top security card.",
          canActivate: (ctx) => otherSuspendedDigimonTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            await returnSuspendedDigimonForSecurity(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Suspend 2 of your opponent's Digimon or Tamers. Then, until their turn " +
            "ends, none of their suspended Digimon or Tamers can digivolve or unsuspend.",
          canActivate: (ctx) => digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0,
          resolve: async (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            const toSuspend = await pickUpTo2(ctx, digimonOrTamerTargets(ctx, opp));
            if (toSuspend.length > 0) await ctx.fx.suspend(toSuspend);

            for (const p of suspendedDigimonOrTamerTargets(ctx, opp)) {
              ctx.fx.restrict(p.permanentId, "digivolve", EffectDuration.UntilOpponentTurnEnd);
              ctx.fx.restrict(p.permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    return [];
  },
};

/**
 * Shared "By returning 1 other suspended Digimon to the bottom of the deck, trash your
 * opponent's top security card" body for the combined [When Digivolving][When Attacking]
 * clause (identical resolve for both timings).
 */
async function returnSuspendedDigimonForSecurity(ctx: EffectContext, source: CardSource): Promise<void> {
  const eligible = otherSuspendedDigimonTargets(ctx, source);
  if (eligible.length === 0) return;
  const wantToPay = await ctx.ask.optional(
    ctx,
    "Return 1 other suspended Digimon to the bottom of the deck to trash your opponent's top security card?",
  );
  if (!wantToPay) return;
  let chosen = eligible[0]!;
  if (eligible.length > 1) {
    const picked = await ctx.ask.chooseTargets(ctx, {
      candidates: eligible.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    const match = eligible.find((p) => p.permanentId === picked[0]);
    if (match === undefined) return;
    chosen = match;
  }
  if (chosen.topCard === undefined) return;
  const returned = await ctx.fx.returnToDeck([chosen.topCard.instanceId], { toTop: false });
  if (returned.length === 0) return;
  await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
}

registerCard(module);
export default module;
