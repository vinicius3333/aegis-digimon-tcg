import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { cardHasTrait, permanentHasTrait } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-080 — Bacchusmon (BT26, Purple/Green Lv.6 dual Digimon/Option, Shaman/Olympos XII/
// Iliad/TS).
//
// Verified against the official Q&A (`node tools/kb/query.mjs card BT26-080`, Q7112-Q7114):
// "orientation" is the suspended/unsuspended state (Q7112); the [When Digivolving] cost may
// suspend EITHER player's Digimon (Q7113); the [Main] effect may unsuspend either player's
// Digimon (Q7114). All three are what the candidate lists below allow.
//
// Digimon side:
// [Digivolve] Play cost 12 [Bacchusmon]: Cost 2 — an ALTERNATE digivolution-cost requirement,
//   carried by generated-digivolve-overrides.json in BT26-032's `basePlayCost` shape (three
//   printings share the name; only the play-cost-12 one qualifies).
// ＜Security A. +1＞ ＜Succession ([Bacchusmon])＞ — printed keywords, parsed from effectText
//   by the engine; no module clause (BT26-013's convention).
// [When Digivolving] By suspending 1 Digimon, this Digimon may attack without suspending.
// [When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with the same
//   orientation as this Digimon.
//
// Option side [Reversal of the Dead]:
// ＜Use Req. ([TS] trait)＞ — a hand-resident color-requirement waiver. This direct module
//   replaces the compiled module, so the clause must be retained explicitly here; otherwise a
//   controller with a [TS] card but no Purple source is incorrectly barred from using this side.
// [Main] You may unsuspend 1 Digimon. Then, delete all of your opponent's unsuspended Digimon
//   with the lowest DP.
//
// "By suspending 1 Digimon" is a cost, so the clause is optional and needs an unsuspended
// Digimon on the board to pay with; the attack itself is `forceAttack(self,
// { withoutSuspending: true })` (BT12-083's mapping of the same printed phrase).
// The shared attack-legality seam honors `withoutSuspending` even when Bacchusmon is already
// suspended, so Q7113's legal choice to suspend this Digimon itself can still produce the attack.
// "the same orientation as this Digimon" compares `isSuspended` against this permanent's own
// state at resolution time. The Option's "delete all ... with the lowest DP" reuses
// BT26-033's shape: compute the minimum over the eligible set, then delete every tie.

const cardId = "BT26-080";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;

function digimonOf(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter(
    (permanent) =>
      !permanent.inBreeding && permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
  );
}

function allDigimon(ctx: EffectContext): Permanent[] {
  return [...digimonOf(ctx, 0 as Seat), ...digimonOf(ctx, 1 as Seat)];
}

function ownerHasTsCardInPlay(ctx: EffectContext, source: CardSource): boolean {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).some((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    return permanentHasTrait(ctx.game, permanent, "TS");
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-ts`,
          description: "＜Use Req. ([TS] trait)＞ Ignore this card's color requirements.",
          when: (ctx) => ownerHasTsCardInPlay(ctx, source),
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
          effectKey: `${cardId}/when-digivolving-attack-without-suspending`,
          description: "[When Digivolving] By suspending 1 Digimon, this Digimon may attack without suspending.",
          optional: true,
          canActivate: (ctx) => allDigimon(ctx).some((permanent) => !permanent.isSuspended),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            const costCandidates = allDigimon(ctx)
              .filter((permanent) => !permanent.isSuspended)
              .map((permanent) => permanent.permanentId);
            if (costCandidates.length === 0) return;

            // The effect itself is optional. Once its activation is accepted, "By suspending"
            // is the mandatory cost, so the target decision cannot be declined a second time.
            const toSuspend = await ctx.ask.chooseTargets(ctx, { candidates: costCandidates, min: 1, max: 1 });
            if (toSuspend.length === 0) return;

            await ctx.fx.suspend(toSuspend);
            await ctx.fx.forceAttack(self.permanentId, { withoutSuspending: true });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-delete-same-orientation`,
          description:
            "[When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with the " +
            "same orientation as this Digimon.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            const targets = digimonOf(ctx, ctx.game.opponentOf(source.ownerSeat))
              .filter((permanent) => (permanent.isSuspended === true) === (self.isSuspended === true))
              .map((permanent) => permanent.permanentId);
            if (targets.length === 0) return;

            const chosen =
              targets.length === 1
                ? targets
                : await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
            if (chosen.length === 0) return;

            await ctx.fx.deletePermanent(chosen);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-unsuspend-then-delete-lowest-dp`,
          description:
            "[Main] You may unsuspend 1 Digimon. Then, delete all of your opponent's " +
            "unsuspended Digimon with the lowest DP.",
          resolve: async (ctx) => {
            const suspendedDigimon = allDigimon(ctx)
              .filter((permanent) => permanent.isSuspended)
              .map((permanent) => permanent.permanentId);
            if (suspendedDigimon.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: suspendedDigimon, min: 0, max: 1 });
              if (chosen.length > 0) await ctx.fx.unsuspend(chosen);
            }

            const targets = digimonOf(ctx, ctx.game.opponentOf(source.ownerSeat)).filter(
              (permanent) => !permanent.isSuspended,
            );
            if (targets.length === 0) return;

            const lowestDp = Math.min(...targets.map((permanent) => permanent.currentDP));
            await ctx.fx.deletePermanent(
              targets.filter((permanent) => permanent.currentDP === lowestDp).map((p) => p.permanentId),
            );
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
