import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { beforePayCost, onPlay, whenDigivolving, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-059 — Plutomon (BT26, Black/Purple Lv.6 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-059 as of this port
// (`node tools/kb/query.mjs card BT26-059` returned no knowledge-base entries — BT26
// has no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.5 w/[TS] trait: Cost 4 — a digivolution-cost requirement, not an
//     effect clause; already carried by CardDefinition.evoCosts in cards.json, so it
//     needs no entry here.
//   When this card would be played, if your hand has fewer cards than your opponent's,
//     reduce the cost by 6.
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing 1 card in
//     your hand, if it's your turn, you may play 1 [Titan] trait Digimon card from your
//     trash with the cost reduced by 7. This effect can't play [Plutomon].
//   [All Turns] [Once Per Turn] When hands are trashed from, you may delete all of your
//     opponent's lowest level Digimon.
//
// Clause mapping:
//   EffectTiming.BeforePayCost — "When this card would be played, if your hand has
//     fewer cards than your opponent's, reduce the cost by 6." Modeled on BT16-065's
//     `beforePayCost` + `ctx.playCostDelta` shape (the hand-written mechanism for this
//     clause per card-module contract — `wouldBePlayed` replacement subscriptions are never
//     consulted by the play-cost step). Identical hand-size comparison to BT26-045's
//     "reduce the cost by 4" clause, just a different delta.
//
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving / EffectTiming.OnAllyAttack
//     (shared effectKey, one "Once Per Turn" budget spanning all three timings) — "By
//     trashing 1 card in your hand, if it's your turn, you may play 1 [Titan] trait
//     Digimon card from your trash with the cost reduced by 7. This effect can't play
//     [Plutomon]." Modeled on BT26-022's "by [cost], you may play 1 [X] card ... with
//     the cost reduced by N" shape (choose the target first, then pay the cost, then
//     play it via `ctx.fx.playInstances([id], { payCost: true, costDelta: 7 })`), with
//     the cost itself — "trashing 1 card in your hand" — being a `ctx.fx.trash` of a
//     hand card chosen via `ctx.ask.selectCards`, per ST16-13's "trash 1 card in your
//     hand" idiom. The "if it's your turn" condition gates `canActivate`/`resolve` via
//     `source.isOwnersTurn()`. The self-exclusion ("can't play [Plutomon]") filters the
//     trash-candidate pool by card id rather than by permanent, since the target is a
//     loose card, not yet a permanent.
//
//   EffectTiming.None (staticModifier, `maxPerTurn: 1`) — "[All Turns] [Once Per Turn]
//     When hands are trashed from, you may delete all of your opponent's lowest level
//     Digimon." Modeled on ST16-13's `staticModifier` + `subscribeSubTrigger("whenHandTrashed")`
//     shape for an "[All Turns]" hand-trash reaction. Unlike ST16-13's "your hand" gate
//     (`handTrashedSeat === source.ownerSeat`), the printed text says "hands" (plural,
//     no possessive) — distinct phrasing from every other "your hand"/"your opponent's
//     hand" card in cards.json — so this reacts to EITHER seat's hand being trashed
//     (`matches` omitted; `subscribeSubTrigger`'s absent `matches` fires for every event
//     of the type per EffectContext.ts's `SubTriggerInstall.matches` doc). `maxPerTurn: 1`
//     on the None-timing `staticModifier` host is not engine-enforced (GameEngine.ts:1429)
//     — the per-turn budget here is carried entirely by the "may" prompt being declinable
//     and by `ctx.fx.deletePermanent` naturally no-op'ing once no opponent Digimon remain;
//     there is no compiled per-turn ledger to lean on for a hand-written EffectTiming.None
//     host, matching ST16-13's identical comment-only caveat.

const cardId = "BT26-059";
const TITAN_TRAIT = "Titan";

function hasTitanTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(TITAN_TRAIT);
}

/** Loose trash cards eligible for the "play 1 [Titan] Digimon from trash" clause. */
function titanTrashCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.trash.filter((c) => {
    if (c.cardId === cardId) return false; // "This effect can't play [Plutomon]."
    const def = ctx.game.definitionOf(c);
    return isDigimon(def) && hasTitanTrait(def);
  });
}

/**
 * "By trashing 1 card in your hand, if it's your turn, you may play 1 [Titan] trait
 * Digimon card from your trash with the cost reduced by 7." Shared by [On Play],
 * [When Digivolving] and [When Attacking], all under one "Once Per Turn" budget.
 */
async function resolveTrashHandToPlayTitanFromTrash(ctx: EffectContext, source: CardSource): Promise<void> {
  if (!source.isOwnersTurn()) return;

  const owner = ctx.game.player(source.ownerSeat);
  if (owner.hand.length === 0) return;

  const trashCandidates = titanTrashCandidates(ctx, source);
  if (trashCandidates.length === 0) return;

  let targetId: string;
  if (trashCandidates.length === 1) {
    targetId = trashCandidates[0]!.instanceId;
  } else {
    const chosenTarget = await ctx.ask.selectCards(ctx, {
      candidates: trashCandidates.map((c) => c.instanceId),
      min: 1,
      max: 1,
    });
    if (chosenTarget.length === 0) return;
    targetId = chosenTarget[0]!;
  }

  const chosenCost = await ctx.ask.selectCards(ctx, {
    candidates: owner.hand.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosenCost.length === 0) return;

  await ctx.fx.trash(chosenCost);
  await ctx.fx.playInstances([targetId], { payCost: true, costDelta: 7 });
}

/** Opponent's battle-area Digimon at the lowest printed level among them. */
function opponentLowestLevelDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const digimon = Array.from(opponent.battleArea).filter(
    (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
  if (digimon.length === 0) return [];
  const minLevel = Math.min(...digimon.map((p) => ctx.game.definitionOf(p.topCard!).level ?? Infinity));
  return digimon.filter((p) => (ctx.game.definitionOf(p.topCard!).level ?? Infinity) === minLevel);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // When this card would be played, if your hand has fewer cards than your
    // opponent's, reduce the cost by 6.
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-fewer-hand-cards`,
          description:
            "When this card would be played, if your hand has fewer cards than your " +
            "opponent's, reduce the cost by 6.",
          resolve: async (ctx) => {
            const ownerHandCount = ctx.game.player(source.ownerSeat).hand.length;
            const opponentHandCount = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).hand.length;
            if (ownerHandCount < opponentHandCount) {
              ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 6;
            }
          },
        }),
      ];
    }

    // [On Play] [Once Per Turn] By trashing 1 card in your hand, if it's your turn, you
    // may play 1 [Titan] trait Digimon card from your trash with the cost reduced by 7.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/trash-hand-play-titan-from-trash`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing 1 " +
            "card in your hand, if it's your turn, you may play 1 [Titan] trait Digimon " +
            "card from your trash with the cost reduced by 7. This effect can't play " +
            "[Plutomon].",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) =>
            source.isOwnersTurn() &&
            ctx.game.player(source.ownerSeat).hand.length > 0 &&
            titanTrashCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveTrashHandToPlayTitanFromTrash(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause, same "Once Per Turn" budget as [On Play].
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/trash-hand-play-titan-from-trash`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing 1 " +
            "card in your hand, if it's your turn, you may play 1 [Titan] trait Digimon " +
            "card from your trash with the cost reduced by 7. This effect can't play " +
            "[Plutomon].",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) =>
            source.isOwnersTurn() &&
            ctx.game.player(source.ownerSeat).hand.length > 0 &&
            titanTrashCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveTrashHandToPlayTitanFromTrash(ctx, source);
          },
        }),
      ];
    }

    // [When Attacking] Same clause, same "Once Per Turn" budget as [On Play].
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/trash-hand-play-titan-from-trash`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing 1 " +
            "card in your hand, if it's your turn, you may play 1 [Titan] trait Digimon " +
            "card from your trash with the cost reduced by 7. This effect can't play " +
            "[Plutomon].",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) =>
            source.isOwnersTurn() &&
            ctx.game.player(source.ownerSeat).hand.length > 0 &&
            titanTrashCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveTrashHandToPlayTitanFromTrash(ctx, source);
          },
        }),
      ];
    }

    // [All Turns] [Once Per Turn] When hands are trashed from, you may delete all of
    // your opponent's lowest level Digimon.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/hand-trashed-delete-lowest-level`,
          description:
            "[All Turns] [Once Per Turn] When hands are trashed from, you may delete " +
            "all of your opponent's lowest level Digimon.",
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/hand-trashed-delete-lowest-level`,
              description: `${cardId}: when hands are trashed from, may delete opponent's lowest level Digimon.`,
              run: async (subCtx) => {
                const targets = opponentLowestLevelDigimon(subCtx, source);
                if (targets.length === 0) return;

                const willDelete = await subCtx.ask.optional(
                  subCtx,
                  "Delete all of your opponent's lowest level Digimon?",
                );
                if (!willDelete) return;

                await subCtx.fx.deletePermanent(targets.map((p) => p.permanentId));
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
