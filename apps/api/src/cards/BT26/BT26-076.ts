import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, staticModifier, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-076 — Crowmon (BT26, Purple Lv.5 Digimon, Mysterious Bird/DATA SQUAD).
//
// Q7104 confirms that in "a level 4 or lower Digimon card with [CS] trait or yellow/black"
// style wording, the level restriction applies to either side of the OR. This card's
// opponent target is explicitly a level 4 or lower Digimon, so its filter already matches
// the ruling.
//
// Printed text:
//   [Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3 — a digivolution-cost requirement, not
//     an effect clause; already carried by CardDefinition.evoCosts in cards.json, so it
//     needs no entry here.
//   [When Digivolving] Delete 1 of your opponent's level 4 or lower Digimon. Then, by
//     trashing the bottom face-down card from under any of your Tamers, they trash 1
//     card in their hand.
//   [Your Turn] [Once Per Turn] When your opponent's hand is trashed from or effects
//     trash cards from under your Tamers, this Digimon may digivolve into [Ravemon] or a
//     [DATA SQUAD] trait Digimon card in the trash with the cost reduced by 1.
//   Inherited: [On Deletion] You may play 1 play cost 5 or lower card with [Avian] or
//     [Bird] in any of its traits or the [DATA SQUAD] trait from your trash without
//     paying the cost.
//
// Clause mapping:
//   EffectTiming.WhenDigivolving — "Delete 1 of your opponent's level 4 or lower
//     Digimon. Then, by trashing the bottom face-down card from under any of your
//     Tamers, they trash 1 card in their hand." The delete has no "may" — it fires
//     unconditionally against the opponent's level-4-or-lower pool (mirrors BT26-069's
//     unconditional delete). "Then, by ~ing, ..." is a SEPARATE, independently-payable
//     cost-effect for the follow-up (unlike BT26-072's single alt-cost-to-delete): the
//     cost itself ("the bottom face-down card from under any of your Tamers") reuses
//     BT26-057's `tamersWithFaceDownBottom` / `payByTrashingBottomFaceDownUnderTamer`
//     idiom verbatim, gated by `ctx.ask.optional` per that same precedent (an unpaid cost
//     skips the effect). "They trash 1 card in their hand" is the opponent's hand, but
//     `decisionApi.ts` always prompts `ctx.source.ownerSeat` (documented engine gap) — so
//     per BT26-072's identical "[On Deletion] Your opponent trashes 1 card in their hand"
//     precedent, THIS card's controller picks which of the opponent's hand cards is
//     trashed (`selectCards` over the opponent's hand, min:1). Divergence noted, not
//     worked around.
//
//   EffectTiming.None (staticModifier) — "[Your Turn] [Once Per Turn] When your
//     opponent's hand is trashed from or effects trash cards from under your Tamers,
//     this Digimon may digivolve into [Ravemon] or a [DATA SQUAD] trait Digimon card in
//     the trash with the cost reduced by 1." Two independently-firing `subscribeSubTrigger`
//     installs sharing one `run` body, mirroring BT26-057's "attack targets change OR
//     effects trash cards from under your Tamers" two-subscription shape:
//       - `whenHandTrashed` gated to `handTrashedSeat === opponent seat` (BT26-069's own-
//         hand gate, inverted to the opponent).
//       - `whenDigivolutionTrashed` gated on the trashed stack's host being a Tamer THIS
//         seat controls (BT26-057's `isControlledTamer`, reused verbatim).
//     Both share the "[Your Turn]" gate (`source.isOwnersTurn()`) and the "may digivolve"
//     prompt (BT26-069's shape). `maxPerTurn: 1` on this None-timing host is documentation
//     only — unenforced by the engine (GameEngine.ts:1429) — matching BT26-069/BT26-057's
//     identical caveat.
//
//   EffectTiming.OnDestroyedAnyone (onDeletion, `isInherited: true`) — "[On Deletion] You
//     may play 1 play cost 5 or lower card with [Avian] or [Bird] in any of its traits or
//     the [DATA SQUAD] trait from your trash without paying the cost." Modeled on
//     BT26-098's security clause's "you may play 1 X from trash without paying the cost"
//     idiom (`selectCards` min:0 over the filtered trash pool, then
//     `ctx.fx.playInstances([...], { payCost: false })`).

const cardId = "BT26-076";
const DATA_SQUAD_TRAIT = "DATA SQUAD";

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

/** Opponent's battle-area Digimon at level 4 or lower. */
function opponentLevel4OrLowerDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return opponent.battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && (def.level ?? Number.POSITIVE_INFINITY) <= 4;
    })
    .map((p) => p.permanentId);
}

/** Whether `permanentId` is a Tamer that `ownerSeat` controls. */
function isControlledTamer(ctx: EffectContext, permanentId: string | undefined, ownerSeat: Seat): boolean {
  if (permanentId === undefined) return false;
  const subject = ctx.game.permanentById(permanentId);
  if (subject === undefined || subject.topCard === undefined) return false;
  if (subject.controllerSeat !== ownerSeat) return false;
  return ctx.game.definitionOf(subject.topCard).kinds.includes(CardKind.Tamer);
}

/** Trash Digimon eligible for the "digivolve into [Ravemon] or a [DATA SQUAD] card" clause. */
function ravemonOrDataSquadTrashCandidates(ctx: EffectContext, ownerSeat: Seat) {
  const owner = ctx.game.player(ownerSeat);
  return owner.trash.filter((c) => {
    const def = ctx.game.definitionOf(c);
    if (!isDigimon(def)) return false;
    return def.nameEn === "Ravemon" || (def.types ?? []).includes(DATA_SQUAD_TRAIT);
  });
}

/**
 * "This Digimon may digivolve into [Ravemon] or a [DATA SQUAD] trait Digimon card in the
 * trash with the cost reduced by 1." Shared by both `subscribeSubTrigger` installs.
 */
async function mayDigivolveFromTrash(ctx: EffectContext, source: CardSource, hostPermanentId: string): Promise<void> {
  if (!source.isOwnersTurn()) return; // [Your Turn]

  const candidates = ravemonOrDataSquadTrashCandidates(ctx, source.ownerSeat);
  if (candidates.length === 0) return;

  const willDigivolve = await ctx.ask.optional(
    ctx,
    "Digivolve into [Ravemon] or a [DATA SQUAD] trait Digimon card in the trash, cost reduced by 1?",
  );
  if (!willDigivolve) return;

  let chosenId: string;
  if (candidates.length === 1) {
    chosenId = candidates[0]!.instanceId;
  } else {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((c) => c.instanceId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return;
    chosenId = chosen[0]!;
  }

  await ctx.fx.digivolveFromInstance(hostPermanentId, chosenId, {
    payCost: true,
    costDelta: -1,
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Delete 1 of your opponent's level 4 or lower Digimon. Then, by
    // trashing the bottom face-down card from under any of your Tamers, they trash 1
    // card in their hand.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-then-tamer-trash-cost`,
          description:
            "[When Digivolving] Delete 1 of your opponent's level 4 or lower Digimon. " +
            "Then, by trashing the bottom face-down card from under any of your Tamers, " +
            "they trash 1 card in their hand.",
          optional: false,
          resolve: async (ctx) => {
            const deleteTargets = opponentLevel4OrLowerDigimonIds(ctx, source);
            if (deleteTargets.length > 0) {
              let chosenId: string;
              if (deleteTargets.length === 1) {
                chosenId = deleteTargets[0]!;
              } else {
                const chosen = await ctx.ask.chooseTargets(ctx, {
                  candidates: deleteTargets,
                  min: 1,
                  max: 1,
                });
                chosenId = chosen[0] ?? "";
              }
              if (chosenId !== "") {
                await ctx.fx.deletePermanent([chosenId], "byEffect");
              }
            }

            const wantToPay = await ctx.ask.optional(
              ctx,
              "Trash the bottom face-down card from under one of your Tamers, so your " +
                "opponent trashes 1 card in their hand?",
            );
            if (!wantToPay) return;

            const paid = await payByTrashingBottomFaceDownUnderTamer(ctx, source.ownerSeat);
            if (!paid) return;

            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const opponentHandIds = Array.from(opponent.hand).map((c) => c.instanceId);
            if (opponentHandIds.length === 0) return;

            const chosenCard = await ctx.ask.selectCards(ctx, { candidates: opponentHandIds, min: 1, max: 1 });
            if (chosenCard.length === 0) return;
            await ctx.fx.trash(chosenCard);
          },
        }),
      ];
    }

    // [Your Turn] [Once Per Turn] When your opponent's hand is trashed from or effects
    // trash cards from under your Tamers, this Digimon may digivolve into [Ravemon] or a
    // [DATA SQUAD] trait Digimon card in the trash with the cost reduced by 1.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/opponent-hand-or-tamer-trash-may-digivolve`,
          description:
            "[Your Turn] [Once Per Turn] When your opponent's hand is trashed from or " +
            "effects trash cards from under your Tamers, this Digimon may digivolve into " +
            "[Ravemon] or a [DATA SQUAD] trait Digimon card in the trash with the cost " +
            "reduced by 1.",
          maxPerTurn: 1, // documents the intent; enforced via the watchers' oncePerTurnKey below.
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostPermanentId = host.permanentId;

            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: hostPermanentId,
              once: false,
              oncePerTurnKey: `${cardId}/opponent-hand-or-tamer-trash-may-digivolve`,
              description: `${cardId}: when your opponent's hand is trashed from, may digivolve from trash.`,
              matches: (subCtx) => subCtx.trigger?.handTrashedSeat === subCtx.game.opponentOf(source.ownerSeat),
              run: async (subCtx) => {
                await mayDigivolveFromTrash(subCtx, source, hostPermanentId);
              },
            });

            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: hostPermanentId,
              once: false,
              oncePerTurnKey: `${cardId}/opponent-hand-or-tamer-trash-may-digivolve`,
              description: `${cardId}: when effects trash cards from under your Tamers, may digivolve from trash.`,
              matches: (subCtx) => isControlledTamer(subCtx, subCtx.trigger?.subjectPermanentId, source.ownerSeat),
              run: async (subCtx) => {
                await mayDigivolveFromTrash(subCtx, source, hostPermanentId);
              },
            });
          },
        }),
      ];
    }

    // Inherited: [On Deletion] You may play 1 play cost 5 or lower card with [Avian] or
    // [Bird] in any of its traits or the [DATA SQUAD] trait from your trash without
    // paying the cost.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/inherited-on-deletion-play-avian-bird-or-data-squad`,
          description:
            "[On Deletion] You may play 1 play cost 5 or lower card with [Avian] or " +
            "[Bird] in any of its traits or the [DATA SQUAD] trait from your trash " +
            "without paying the cost.",
          isInherited: true,
          optional: true,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.trash).filter((c) => {
              const def = ctx.game.definitionOf(c);
              if ((def.playCost ?? Number.POSITIVE_INFINITY) > 5) return false;
              const types = def.types ?? [];
              return types.includes("Avian") || types.includes("Bird") || types.includes(DATA_SQUAD_TRAIT);
            });
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
