import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, onDeletion, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-075 — ScourgeChiropmon // Despair Blast (BT26 Purple/Yellow DUAL Digimon/Option).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-075 as of this port
// (`node tools/kb/query.mjs card BT26-075` returned no knowledge-base entries — BT26 has
// no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// [Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3 — a digivolution-cost requirement, not
//   an effect clause; already carried by CardDefinition.evoCosts, not implemented here.
// ＜Execute＞ / ＜Ascension＞ — printed keywords, parsed automatically from effectText by
//   the engine's combat/keywords.ts (PRINTED_MATCHERS) for combat legality; still granted
//   explicitly below (mirrors BT26-033's ＜Raid＞/＜Alliance＞/＜Engage＞ staticModifier) so
//   the continuous ledger (hasKeyword) reflects them for other cards that read keywords.
// [Security] [On Deletion] By trashing the bottom face-down card from under any of your
//   Tamers, you may play 1 [Glowing Dawn] trait card with a play cost of 5 or less from
//   your trash without paying the cost.
//   The adjacent bracket tags with a single shared body (no separate sentence per tag) are
//   read as one effect that fires on EITHER trigger — the same shape as BT24-036/BT24-057/
//   P-165's "[On Play] [On Deletion] <shared body>" cards in cards.json (confirmed by
//   BT24-036's compiled IR emitting the identical action on both the OnPlay and OnDeletion
//   triggers). Implemented as two Effect registrations (EffectTiming.SecuritySkill via
//   `security`, EffectTiming.OnDestroyedAnyone via `onDeletion`) sharing one resolve
//   function.
//   The "By ~ing, you may ..." cost-effect construct reuses BT26-057's
//   `tamersWithFaceDownBottom` / `payByTrashingBottomFaceDownUnderTamer` idiom (ask once
//   whether to pay, then pay by trashing the chosen Tamer's bottom digivolution card).
//
// Option side [Despair Blast]:
// ＜Use Req. ([Glowing Dawn] trait)＞ — data-only: satisfied by the hand-authored
//   `optionColorRequirements` field on the card record (["Purple"] in cards.json), not an
//   executable action (see BT26-031/BT26-050/BT26-033/BT26-056/BT26-057 precedent and
//   commit 1298f75fa).
// [Main] Delete 1 of your opponent's Digimon with the lowest level.
//   "1 ... with the lowest level" is a superlative filter (ties broken by player choice),
//   not "all" — mirrors BT17-028's `lowestLevelOpponentDigimon` + `chooseTargets` idiom.

const cardId = "BT26-075";
const GLOWING_DAWN_TRAIT = "Glowing Dawn";

/** Any of `ownerSeat`'s Tamer permanents with a face-down card at the bottom of its stack. */
function tamersWithFaceDownBottom(ctx: EffectContext, ownerSeat: Seat): Permanent[] {
  const owner = ctx.game.player(ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    if (!ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer)) return false;
    const bottom = p.stack[0];
    return bottom !== undefined && !bottom.faceUp;
  });
}

/**
 * "By trashing the bottom face-down card from under any of your Tamers." Returns whether
 * the cost was actually paid.
 */
async function payByTrashingBottomFaceDownUnderTamer(ctx: EffectContext, ownerSeat: Seat): Promise<boolean> {
  const candidates = tamersWithFaceDownBottom(ctx, ownerSeat);
  if (candidates.length === 0) return false;

  let chosenTamer: Permanent;
  if (candidates.length === 1) {
    chosenTamer = candidates[0]!;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: candidates.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return false;
    chosenTamer = ctx.game.permanentById(chosen[0]!)!;
  }

  const bottomCard = chosenTamer.stack[0];
  if (bottomCard === undefined) return false;

  await ctx.fx.trashDigivolutionCards(chosenTamer.permanentId, [bottomCard.instanceId]);
  return true;
}

/** `ownerSeat`'s trash cards with the [Glowing Dawn] trait and a play cost of 5 or less. */
function glowingDawnTrashCandidates(ctx: EffectContext, ownerSeat: Seat): CardInstance[] {
  const owner = ctx.game.player(ownerSeat);
  return Array.from(owner.trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return (def.types ?? []).includes(GLOWING_DAWN_TRAIT) && (def.playCost ?? 0) <= 5;
  });
}

/** Shared [Security]/[On Deletion] body: pay the Tamer-trash cost, then play a candidate. */
async function resolvePlayGlowingDawnFromTrash(ctx: EffectContext, source: CardSource): Promise<void> {
  const wantToPay = await ctx.ask.optional(
    ctx,
    "Trash the bottom face-down card from under one of your Tamers, to play 1 [Glowing " +
      "Dawn] trait card with a play cost of 5 or less from your trash without paying the " +
      "cost?",
  );
  if (!wantToPay) return;

  const paid = await payByTrashingBottomFaceDownUnderTamer(ctx, source.ownerSeat);
  if (!paid) return;

  const candidates = glowingDawnTrashCandidates(ctx, source.ownerSeat);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  await ctx.fx.playInstances(chosen, { payCost: false });
}

/** Opponent's battle-area Digimon permanents (not in breeding). */
function opponentDigimonTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter(
    (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

/** Opponent's Digimon permanents with the lowest level among them. */
function lowestLevelOpponentDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const digimon = opponentDigimonTargets(ctx, source);
  if (digimon.length === 0) return [];
  const minLevel = Math.min(...digimon.map((p) => ctx.game.definitionOf(p.topCard!).level ?? 99));
  return digimon.filter((p) => (ctx.game.definitionOf(p.topCard!).level ?? 99) === minLevel);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        // Printed ＜Execute＞ / ＜Ascension＞ keywords.
        staticModifier({
          source,
          effectKey: `${cardId}/keywords`,
          description: "＜Execute＞ ＜Ascension＞",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;
            ctx.fx.grantKeyword(me.permanentId, "Execute", EffectDuration.Permanent);
            ctx.fx.grantKeyword(me.permanentId, "Ascension", EffectDuration.Permanent);
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-or-deletion-play-glowing-dawn`,
          description:
            "[Security] By trashing the bottom face-down card from under any of your " +
            "Tamers, you may play 1 [Glowing Dawn] trait card with a play cost of 5 or " +
            "less from your trash without paying the cost.",
          canActivate: (ctx) =>
            tamersWithFaceDownBottom(ctx, source.ownerSeat).length > 0 &&
            glowingDawnTrashCandidates(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => resolvePlayGlowingDawnFromTrash(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/security-or-deletion-play-glowing-dawn`,
          description:
            "[On Deletion] By trashing the bottom face-down card from under any of your " +
            "Tamers, you may play 1 [Glowing Dawn] trait card with a play cost of 5 or " +
            "less from your trash without paying the cost.",
          canActivate: (ctx) =>
            tamersWithFaceDownBottom(ctx, source.ownerSeat).length > 0 &&
            glowingDawnTrashCandidates(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => resolvePlayGlowingDawnFromTrash(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] Delete 1 of your opponent's Digimon with the lowest level.",
          canActivate: (ctx) => lowestLevelOpponentDigimon(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = lowestLevelOpponentDigimon(ctx, source);
            if (candidates.length === 0) return;

            let chosenId: string;
            if (candidates.length === 1) {
              chosenId = candidates[0]!.permanentId;
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: candidates.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              chosenId = chosen[0]!;
            }

            await ctx.fx.deletePermanent([chosenId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
