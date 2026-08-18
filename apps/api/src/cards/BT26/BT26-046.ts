import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { beforePayCost, onPlay, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-046 — Gryphonmon (BT26, Green/Blue Lv.6 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-046 as of this port
// (`node tools/kb/query.mjs card BT26-046` returned no knowledge-base entries — BT26
// has no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.5 w/[TS] trait: Cost 3 — a digivolution-cost requirement, not an
//     effect clause; already carried by CardDefinition.evoCosts in cards.json, so it
//     needs no entry here.
//   When this card would be played, if there are 2 or more suspended Digimon, reduce
//     the cost by 4.
//   ＜Piercing＞
//   ＜Vortex＞ — auto-detected straight from `effectText` by
//     `combat/legality.ts`'s `hasVortex` (regex over the printed text); needs no
//     runtime grant here.
//   [On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. 1 of
//     their Digimon or Tamers can't unsuspend until their turn ends. Then, 1 of your
//     Digimon can't be deleted in battle until their turn ends.
//   [Rule] Trait: Has [Avian] Type — a data-layer trait annotation, not a runtime effect.
//
// Clause mapping:
//   EffectTiming.BeforePayCost — "When this card would be played, if there are 2 or
//     more suspended Digimon, reduce the cost by 4." A mandatory, automatic reduction
//     with no payment (matches the `VERIFIED_SELF_REDUCER_CARDS`/BT9-097/BT8-036 shape
//     for a condition-gated self-reducer, but hand-written per card-module contract since
//     BT26 has no compiled IR). The condition counts suspended Digimon across BOTH
//     seats' battle areas (BT25-059's identical clause compiles its `wouldBePlayed`
//     sourceFilter to `controllerDefault: "any"` — confirmed via its IR literal).
//     Mutates `ctx.playCostDelta`, which `GameEngine.fireBeforePayCost` reads at
//     pay-time (card-module contract; BT16-065's `beforePayCost` builder precedent).
//
//   EffectTiming.OnDetermineDoSecurityCheck — ＜Piercing＞. `hasPierce` is ledger-only
//     (ModifierLedger.pierceGrants; no printed-text fallback, unlike ＜Vortex＞), so the
//     innate keyword needs an explicit self-grant at the security-check window. Modeled
//     on BT20-027's `PierceSelfEffect` shape: `ctx.fx.grantPierce(self,
//     EffectDuration.UntilEndBattle)`.
//
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared body) — "Suspend 1 of
//     your opponent's Digimon or Tamers. 1 of their Digimon or Tamers can't unsuspend
//     until their turn ends. Then, 1 of your Digimon can't be deleted in battle until
//     their turn ends." The suspend+lock half mirrors BT26-042's `resolveSuspendAndLock`
//     shape exactly (two independently chosen opponent Digimon-or-Tamer targets: one
//     suspended, one restricted `"unsuspend"` for `UntilOpponentTurnEnd`). The trailing
//     "Then, 1 of your Digimon can't be deleted in battle" clause is new to this card:
//     modeled on BT23-021's `applyCannotBeDeletedInBattle` shape
//     (`ctx.fx.restrict(id, "beDeletedInBattle", EffectDuration.UntilOpponentTurnEnd)` —
//     the battle-scoped kind, read by `combat/controller.ts`'s
//     `hasRestriction(..., "beDeletedInBattle")` check. `"beDeleted"` is the separate
//     effect/rule-scoped kind gated in `primitives.deletePermanent`, and is the wrong
//     one for "in battle" wording.

const cardId = "BT26-046";

function isDigimonOrTamer(p: Permanent, ctx: EffectContext): boolean {
  if (p.inBreeding || p.topCard === undefined) return false;
  const def = ctx.game.definitionOf(p.topCard);
  return isDigimon(def) || def.kinds.includes(CardKind.Tamer);
}

/** Battle-area Digimon-or-Tamer permanents (not in breeding) controlled by `seat`. */
function digimonOrTamerTargets(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter((p) => isDigimonOrTamer(p, ctx));
}

/** Own battle-area Digimon permanents (not in breeding). */
function ownDigimonTargets(ctx: EffectContext, seat: Seat): Permanent[] {
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

/** Digimon permanents (either seat) currently suspended, for the BeforePayCost count. */
function suspendedDigimonCount(game: GameAccess): number {
  let count = 0;
  for (const seat of [0 as Seat, 1 as Seat]) {
    for (const perm of game.player(seat).battleArea) {
      if (perm.inBreeding || perm.topCard === undefined) continue;
      if (isDigimon(game.definitionOf(perm.topCard)) && perm.isSuspended) count += 1;
    }
  }
  return count;
}

/**
 * "Suspend 1 of your opponent's Digimon or Tamers. 1 of their Digimon or Tamers can't
 * unsuspend until their turn ends. Then, 1 of your Digimon can't be deleted in battle
 * until their turn ends." Shared by [On Play] and [When Digivolving].
 */
async function resolveSuspendLockAndProtect(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);

  const suspendTargetId = await chooseOne(ctx, digimonOrTamerTargets(ctx, opponentSeat));
  if (suspendTargetId !== undefined) {
    await ctx.fx.suspend([suspendTargetId]);
  }

  const lockTargetId = await chooseOne(ctx, digimonOrTamerTargets(ctx, opponentSeat));
  if (lockTargetId !== undefined) {
    ctx.fx.restrict(lockTargetId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
  }

  const protectTargetId = await chooseOne(ctx, ownDigimonTargets(ctx, source.ownerSeat));
  if (protectTargetId !== undefined) {
    ctx.fx.restrict(protectTargetId, "beDeletedInBattle", EffectDuration.UntilOpponentTurnEnd);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // "When this card would be played, if there are 2 or more suspended Digimon,
    // reduce the cost by 4." Mandatory, no payment — applies automatically.
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-suspended-count`,
          description:
            "When this card would be played, if there are 2 or more suspended Digimon, " +
            "reduce the cost by 4.",
          resolve: async (ctx) => {
            if (suspendedDigimonCount(ctx.game) >= 2) {
              ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 4;
            }
          },
        }),
      ];
    }

    // ＜Piercing＞ (PierceSelfEffect) — ledger-only, needs an explicit self-grant.
    if (timing === EffectTiming.OnDetermineDoSecurityCheck) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/piercing`,
          description: "＜Piercing＞",
          optional: false,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEndBattle);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-lock-protect`,
          description:
            "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. " +
            "1 of their Digimon or Tamers can't unsuspend until their turn ends. Then, 1 of " +
            "your Digimon can't be deleted in battle until their turn ends.",
          optional: false,
          canActivate: (ctx) =>
            digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0 ||
            ownDigimonTargets(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            await resolveSuspendLockAndProtect(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/on-play-suspend-lock-protect`,
          description:
            "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. " +
            "1 of their Digimon or Tamers can't unsuspend until their turn ends. Then, 1 of " +
            "your Digimon can't be deleted in battle until their turn ends.",
          optional: false,
          canActivate: (ctx) =>
            digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0 ||
            ownDigimonTargets(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            await resolveSuspendLockAndProtect(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
