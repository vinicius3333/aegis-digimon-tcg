import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-042 — Okuwamon (BT26, Green Lv.5 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-042 as of this port
// (`node tools/kb/query.mjs card BT26-042` returned no knowledge-base entries — BT26
// has no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.4 w/[TS] trait: Cost 3 — a digivolution-cost requirement, not an
//     effect clause; already carried by CardDefinition.evoCosts in cards.json, so it
//     needs no entry here.
//   [On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then,
//     1 of their Digimon or Tamers can't unsuspend until their turn ends.
//   [On Play] [When Attacking] [Once Per Turn] Until your opponent's turn ends, 1 of
//     your [Insectoid] or [Titan] trait Digimon gains ＜Piercing＞ and +3000 DP.
//   Inherited: [All Turns] [Once Per Turn] When this Digimon deletes your opponent's
//     Digimon in battle, trash their top security card.
//
// Clause mapping:
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared body, mandatory) —
//     "Suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or
//     Tamers can't unsuspend until their turn ends." Modeled on BT26-050's first
//     [When Digivolving] clause shape (Digimon-or-Tamer target pool via
//     `def.kinds.includes(CardKind.Tamer)`, `ctx.fx.suspend`, then
//     `ctx.fx.restrict(id, "unsuspend", EffectDuration.UntilOpponentTurnEnd)`), narrowed
//     to a single target for each half and to the opponent-only suspend pool this card
//     prints. No "you may" in the text, so `optional: false`; the resolve body still no-ops
//     gracefully when the opponent has no eligible permanent.
//
//   EffectTiming.OnPlay / EffectTiming.OnAllyAttack (shared effectKey, "Once Per Turn"
//     budget shared across both timings) — "Until your opponent's turn ends, 1 of your
//     [Insectoid] or [Titan] trait Digimon gains ＜Piercing＞ and +3000 DP." Modeled on
//     BT26-016's shared-effectKey + `maxPerTurn: 1` idiom for a single "Once Per Turn"
//     budget spanning multiple trigger timings, and on BT26-008's `grantPierce` +
//     `modifyDP` pairing for a keyword-plus-DP grant. Duration is
//     `EffectDuration.UntilOpponentTurnEnd` (the printed "until your opponent's turn
//     ends"), not the `UntilEachTurnEnd` used by BT26-008's own-turn "for the turn" grant.
//
//   EffectTiming.OnBattleDeleteOpponent (inherited, "Once Per Turn") — "When this
//     Digimon deletes your opponent's Digimon in battle, trash their top security
//     card." Modeled on BT16-061's inherited OnBattleDeleteOpponent clause shape
//     (raw Effect literal with `isInherited: true`, `maxPerTurn: 1`, `canTrigger`
//     gating on `ctx.trigger?.attackerPermanentId === self.permanentId`), swapping the
//     resolve body for `ctx.fx.trashFromSecurity(opponentSeat, 1, { fromTop: true })`
//     (BT26-050's "trash your opponent's top security card" primitive).

const cardId = "BT26-042";

const INSECTOID_TRAIT = "Insectoid";
const TITAN_TRAIT = "Titan";

function isDigimonOrTamer(p: Permanent, ctx: EffectContext): boolean {
  if (p.inBreeding || p.topCard === undefined) return false;
  const def = ctx.game.definitionOf(p.topCard);
  return isDigimon(def) || def.kinds.includes(CardKind.Tamer);
}

/** Battle-area Digimon-or-Tamer permanents (not in breeding) controlled by `seat`. */
function digimonOrTamerTargets(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter((p) => isDigimonOrTamer(p, ctx));
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
 * "Suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or Tamers
 * can't unsuspend until their turn ends." Shared by [On Play] and [When Digivolving].
 */
async function resolveSuspendAndLock(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);

  const suspendTargetId = await chooseOne(ctx, digimonOrTamerTargets(ctx, opponentSeat));
  if (suspendTargetId !== undefined) {
    await ctx.fx.suspend([suspendTargetId]);
  }

  const lockTargetId = await chooseOne(ctx, digimonOrTamerTargets(ctx, opponentSeat));
  if (lockTargetId !== undefined) {
    ctx.fx.restrict(lockTargetId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
  }
}

function hasInsectoidOrTitanTrait(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return types.includes(INSECTOID_TRAIT) || types.includes(TITAN_TRAIT);
}

function insectoidOrTitanTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter(
    (p) =>
      p.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(p.topCard)) &&
      hasInsectoidOrTitanTrait(ctx.game.definitionOf(p.topCard)),
  );
}

/**
 * "Until your opponent's turn ends, 1 of your [Insectoid] or [Titan] trait Digimon
 * gains ＜Piercing＞ and +3000 DP." Shared by [On Play] and [When Attacking], both
 * gated by the same "Once Per Turn" budget (shared effectKey).
 */
async function resolveGrantPiercingAndDp(ctx: EffectContext, source: CardSource): Promise<void> {
  const targetId = await chooseOne(ctx, insectoidOrTitanTargets(ctx, source));
  if (targetId === undefined) return;
  ctx.fx.grantPierce(targetId, EffectDuration.UntilOpponentTurnEnd);
  ctx.fx.modifyDP(targetId, 3000, EffectDuration.UntilOpponentTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-lock`,
          description:
            "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. " +
            "Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.",
          optional: false,
          canActivate: (ctx) =>
            digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0,
          resolve: async (ctx) => {
            await resolveSuspendAndLock(ctx, source);
          },
        }),
        onPlay({
          source,
          effectKey: `${cardId}/piercing-dp-grant`,
          description:
            "[On Play] [When Attacking] [Once Per Turn] Until your opponent's turn ends, 1 " +
            "of your [Insectoid] or [Titan] trait Digimon gains ＜Piercing＞ and +3000 DP.",
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => insectoidOrTitanTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveGrantPiercingAndDp(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/on-play-suspend-lock`,
          description:
            "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. " +
            "Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.",
          optional: false,
          canActivate: (ctx) =>
            digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0,
          resolve: async (ctx) => {
            await resolveSuspendAndLock(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/piercing-dp-grant`,
          description:
            "[On Play] [When Attacking] [Once Per Turn] Until your opponent's turn ends, 1 " +
            "of your [Insectoid] or [Titan] trait Digimon gains ＜Piercing＞ and +3000 DP.",
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => insectoidOrTitanTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveGrantPiercingAndDp(ctx, source);
          },
        }),
      ];
    }

    // Inherited: [All Turns] [Once Per Turn] When this Digimon deletes your
    // opponent's Digimon in battle, trash their top security card.
    if (timing === EffectTiming.OnBattleDeleteOpponent) {
      return [
        {
          effectKey: `${cardId}/deletes-in-battle-trash-security`,
          description:
            "[All Turns] (inherited) [Once Per Turn] When this Digimon deletes your " +
            "opponent's Digimon in battle, trash their top security card.",
          optional: false,
          isInherited: true,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: 1,
          canTrigger: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = ctx.source.permanent();
            if (self === undefined) return false;
            return ctx.trigger?.attackerPermanentId === self.permanentId;
          },
          canActivate: () => true,
          resolve: async (ctx) => {
            await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 1, {
              fromTop: true,
            });
          },
        },
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
