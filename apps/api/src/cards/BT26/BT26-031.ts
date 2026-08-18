import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking, activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-031 — Murasamemon // Gonozan: Murashigure (BT26 Yellow/Blue DUAL Digimon/Option).
// No errata or Q&A on file for this card (tools/kb/query.mjs card BT26-031 returns no KB
// entries — BT26 is unreleased at scrape time), so this port is provisional against the
// printed text alone and should be revisited once rulings land.
//
// [Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3
// [When Digivolving] By trashing the top security card of 1 player with the most security
//   cards, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.
// [When Digivolving] [When Attacking] [Once Per Turn] By trashing the bottom face-down card
//   from under any of your Tamers, ＜Recovery +1＞
//
// Option side [Gonozan: Murashigure]:
// ＜Use Req. ([Glowing Dawn] trait)＞ — data-only: the color-gate waiver for a DUAL card's
// Option side is the hand-authored `optionColorRequirements` field on the card record
// (already ["Yellow"] in cards.json), not an executable action. Per commit 1298f75fa, the
// compiler itself strips this header before segmentation for the same reason — there is
// nothing to run at resolution time.
// [Main] 1 of your opponent's Digimon gets -8000 DP until their turn ends. By trashing your
//   top security card, it further gets -5000 DP.
//
// The Lv.4 [Glowing Dawn] alternate digivolution path above is NOT wired into digivolve
// legality: `digivolutionRequirementsFor` (packages/shared/src/effects/data.ts) reads only
// `effects.json` (compiler output, which this port never runs) and the hand-authored
// `ALTERNATE_DIGIVOLUTION_OVERRIDES` map in that same file — neither of which this card
// module can reach. BT25-104, the one existing hand-written DUAL card with an alternate
// path, has the identical gap (no effects.json entry, no override), so this matches
// established (if imperfect) precedent rather than introducing a new one. The card's base
// evolution paths (Yellow/Blue Lv.4, cost 4 each) already work via cards.json `evoCosts`.

const cardId = "BT26-031";

/** Battle-area Tamers this seat controls whose digivolution stack has >=1 face-down card. */
function tamersWithBottomFaceDown(
  ctx: EffectContext,
  seat: Seat,
): { permanentId: string; instanceId: string }[] {
  const owner = ctx.game.player(seat);
  const results: { permanentId: string; instanceId: string }[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding || p.topCard === undefined) continue;
    if (!ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer)) continue;
    // `stack` is ordered bottom (index 0) -> top (last); scan from the bottom for the
    // first face-down card.
    const bottomFaceDown = p.stack.find((card) => !card.faceUp);
    if (bottomFaceDown !== undefined) {
      results.push({ permanentId: p.permanentId, instanceId: bottomFaceDown.instanceId });
    }
  }
  return results;
}

/** Opponent battle-area Digimon-or-Tamer permanents (not in breeding), for target selection. */
function opponentDigimonOrTamerTargets(ctx: EffectContext, opponentSeat: Seat): Permanent[] {
  return Array.from(ctx.game.player(opponentSeat).battleArea).filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) || def.kinds.includes(CardKind.Tamer);
  });
}

/**
 * Shared "By trashing the bottom face-down card from under any of your Tamers,
 * ＜Recovery +1＞" body for the combined [When Digivolving][When Attacking][Once Per Turn]
 * clause (identical resolve for both timings; the once-per-turn budget is shared via the
 * common effectKey passed by each caller).
 */
async function recoverByTrashingTamerCard(ctx: EffectContext, source: CardSource): Promise<void> {
  const eligible = tamersWithBottomFaceDown(ctx, source.ownerSeat);
  if (eligible.length === 0) return;
  const wantToPay = await ctx.ask.optional(
    ctx,
    "Trash the bottom face-down card from under a Tamer for ＜Recovery +1＞?",
  );
  if (!wantToPay) return;
  let chosen = eligible[0]!;
  if (eligible.length > 1) {
    const picked = await ctx.ask.chooseTargets(ctx, {
      candidates: eligible.map((e) => e.permanentId),
      min: 1,
      max: 1,
    });
    const match = eligible.find((e) => e.permanentId === picked[0]);
    if (match === undefined) return;
    chosen = match;
  }
  const trashed = await ctx.fx.trashDigivolutionCards(chosen.permanentId, [chosen.instanceId]);
  if (trashed.length === 0) return;
  await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-lock`,
          description:
            "[When Digivolving] By trashing the top security card of 1 player with the most " +
            "security cards, 1 of your opponent's Digimon or Tamers can't suspend until their " +
            "turn ends.",
          canActivate: (ctx) => {
            const mine = ctx.source.ownerSeat;
            const opp = ctx.game.opponentOf(mine);
            return ctx.game.player(mine).security.length > 0 || ctx.game.player(opp).security.length > 0;
          },
          resolve: async (ctx) => {
            const mine = ctx.source.ownerSeat;
            const opp = ctx.game.opponentOf(mine);
            // Eligibility/tie-break/decline is the reusable "trash the top security card of 1
            // player with the most security cards" verb (KB Q6167 chooser) — see
            // trashTopSecurityOfPlayerWithMostSecurity in engine/effects/primitives.ts.
            const { trashed } = await ctx.fx.trashTopSecurityOfPlayerWithMostSecurity(mine);
            if (trashed.length === 0) return;

            const targets = opponentDigimonOrTamerTargets(ctx, opp).map((p) => p.permanentId);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
            if (chosen.length === 0) return;
            ctx.fx.restrict(chosen[0]!, "suspend", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/wd-wa-recovery`,
          description:
            "[When Digivolving] [When Attacking] [Once Per Turn] By trashing the bottom " +
            "face-down card from under any of your Tamers, ＜Recovery +1＞",
          maxPerTurn: 1,
          canActivate: (ctx) => tamersWithBottomFaceDown(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            await recoverByTrashingTamerCard(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/wd-wa-recovery`,
          description:
            "[When Digivolving] [When Attacking] [Once Per Turn] By trashing the bottom " +
            "face-down card from under any of your Tamers, ＜Recovery +1＞",
          maxPerTurn: 1,
          canActivate: (ctx) => tamersWithBottomFaceDown(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            await recoverByTrashingTamerCard(ctx, source);
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
            "[Main] 1 of your opponent's Digimon gets -8000 DP until their turn ends. By " +
            "trashing your top security card, it further gets -5000 DP.",
          canActivate: (ctx) => opponentDigimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat))
            .some((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard))),
          resolve: async (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            const targets = Array.from(ctx.game.player(opp).battleArea)
              .filter((p) => p.topCard !== undefined && !p.inBreeding && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
            if (chosen.length === 0) return;
            const targetId = chosen[0]!;
            ctx.fx.modifyDP(targetId, -8000, EffectDuration.UntilOpponentTurnEnd);

            const mine = source.ownerSeat;
            if (ctx.game.player(mine).security.length === 0) return;
            const wantToPay = await ctx.ask.optional(
              ctx,
              "Trash your top security card for an additional -5000 DP?",
            );
            if (!wantToPay) return;
            const trashed = await ctx.fx.trashFromSecurity(mine, 1, { fromTop: true });
            if (trashed.length === 0) return;
            ctx.fx.modifyDP(targetId, -5000, EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
