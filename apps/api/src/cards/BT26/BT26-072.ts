import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { requireOpponentAsk } from "../../engine/decisions/decisionApi.js";

// BT26-072 — Peckmon (BT26, Purple Lv.4 Digimon, Avian/DATA SQUAD).
//
// The committed KB contains Q7094-Q7097 (2026-08-18), confirming bottom placement,
// immutable face-down order, visibility, and face-up trash handling. The trash-vs-place-under
// alt-cost chooser mirrors
// BT26-026's chooseOption pattern (offer both live options via `ctx.ask.chooseOption`,
// falling back to a plain trash when only one option is available), and the
// opponent-Digimon-level-4-or-lower delete gate mirrors BT26-023's
// `opponentLevel4OrLowerDigimonIds` shape. The inherited "[On Deletion] Your opponent
// trashes 1 card in their hand" clause is now addressed to the opponent's own seat via
// `ctx.ask.opponent.selectCards` (decisionApi.ts) — the opponent, not the controller,
// picks which of their own hand cards is trashed, matching source documented behavior's
// EffectSourceCard.Owner-scoped prompt pattern applied to the actual deciding player.
//
// [Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2 — a digivolution-cost requirement, not
//   an effect clause; supplied by the committed generated digivolution requirements.
// ＜Blocker＞ — printed keyword, parsed automatically from effectText by the engine's
//   combat/keywords.ts (PRINTED_MATCHERS); needs no explicit grant (same as BT26-013).
// [On Play] [When Digivolving] By trashing 1 card in your hand or placing it face down
//   under any of your [Keenan Crier]s, delete 1 of your opponent's level 4 or lower
//   Digimon.
// Inherited: [On Deletion] Your opponent trashes 1 card in their hand.

const cardId = "BT26-072";
const KEENAN_CRIER = "Keenan Crier";

function opponentLevel4OrLowerDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return opponent.battleArea
    .filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && def.level !== undefined && def.level <= 4;
    })
    .map((p) => p.permanentId);
}

/** Battle-area [Keenan Crier] permanents this seat controls (excludes the breeding slot). */
function keenanCrierPermanentIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea
    .filter((p) => !p.inBreeding && p.topCard !== undefined && ctx.game.definitionOf(p.topCard).nameEn === KEENAN_CRIER)
    .map((p) => p.permanentId);
}

/**
 * "By trashing 1 card in your hand or placing it face down under any of your [Keenan
 * Crier]s, delete 1 of your opponent's level 4 or lower Digimon." The cost is a single
 * hand card (selected via `selectCards`, min:0 lets the controller decline the whole
 * effect), which then either goes to the trash or gets placed face down under a chosen
 * [Keenan Crier] — a live choice only when at least 1 [Keenan Crier] is in play,
 * otherwise trashing is the only option. Shared by the [On Play] and [When Digivolving]
 * clauses.
 */
async function resolveAltCostToDelete(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const handIds = Array.from(owner.hand).map((c) => c.instanceId);
  if (handIds.length === 0) return;

  const toUse = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 1, max: 1 });
  if (toUse.length === 0) return;

  const keenanCriers = keenanCrierPermanentIds(ctx, source);

  if (keenanCriers.length > 0) {
    const choices = ["Trash the card", "Place the card face down under a [Keenan Crier]"];
    const pick = await ctx.ask.chooseOption(ctx, choices);
    if (pick === 1) {
      let chosenTamer = keenanCriers[0]!;
      if (keenanCriers.length > 1) {
        const picked = await ctx.ask.chooseTargets(ctx, { candidates: keenanCriers, min: 1, max: 1 });
        if (picked.length === 0) return;
        chosenTamer = picked[0]!;
      }
      const placed = await ctx.fx.placeUnder(chosenTamer, toUse, { faceUp: false });
      if (placed.length !== 1) return;
    } else {
      const trashed = await ctx.fx.trash(toUse, { byEffectSeat: source.ownerSeat });
      if (!trashed.some((card) => card.instanceId === toUse[0])) return;
    }
  } else {
    const trashed = await ctx.fx.trash(toUse, { byEffectSeat: source.ownerSeat });
    if (!trashed.some((card) => card.instanceId === toUse[0])) return;
  }

  const targets = opponentLevel4OrLowerDigimonIds(ctx, source);
  if (targets.length === 0) return;

  let chosenId: string;
  if (targets.length === 1) {
    chosenId = targets[0]!;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
    if (chosen.length === 0) return;
    chosenId = chosen[0]!;
  }
  await ctx.fx.deletePermanent([chosenId], "byEffect");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] By trashing 1 card in your hand or placing it face down under any of
    // your [Keenan Crier]s, delete 1 of your opponent's level 4 or lower Digimon.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-alt-cost-delete`,
          description:
            "[On Play] By trashing 1 card in your hand or placing it face down under " +
            "any of your [Keenan Crier]s, delete 1 of your opponent's level 4 or lower " +
            "Digimon.",
          optional: true,
          canActivate: (ctx) =>
            ctx.game.player(source.ownerSeat).hand.length > 0 &&
            opponentLevel4OrLowerDigimonIds(ctx, source).length > 0,
          resolve: async (ctx) => resolveAltCostToDelete(ctx, source),
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-alt-cost-delete`,
          description:
            "[When Digivolving] By trashing 1 card in your hand or placing it face down " +
            "under any of your [Keenan Crier]s, delete 1 of your opponent's level 4 or " +
            "lower Digimon.",
          optional: true,
          canActivate: (ctx) =>
            ctx.game.player(source.ownerSeat).hand.length > 0 &&
            opponentLevel4OrLowerDigimonIds(ctx, source).length > 0,
          resolve: async (ctx) => resolveAltCostToDelete(ctx, source),
        }),
      ];
    }

    // Inherited: [On Deletion] Your opponent trashes 1 card in their hand.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/inherited-on-deletion-opponent-trash`,
          description: "[On Deletion] Your opponent trashes 1 card in their hand.",
          isInherited: true,
          optional: false,
          resolve: async (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const handIds = Array.from(opponent.hand).map((c) => c.instanceId);
            if (handIds.length === 0) return;

            // "Your opponent trashes 1 card in their hand" — the opponent chooses.
            const chosen = await requireOpponentAsk(ctx).selectCards(ctx, {
              candidates: handIds,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;
            await ctx.fx.trash(chosen);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
