import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { requireOpponentAsk } from "../../engine/decisions/decisionApi.js";

// BT26-068 — Devimon (BT26, Purple Lv.4 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-068 as of this port
// (`node tools/kb/query.mjs card BT26-068` returned no knowledge-base entries — BT26 has
// no Q&A yet). implemented from the printed card text only; revisit once BT26 rulings land
// (convention per apps/api/src/cards/BT26/BT26-098.ts).
//
// Printed text:
//   [Digivolve] Lv.3 w/[TS] trait: Cost 2 — a digivolution-cost requirement, not an
//     effect clause. The catalog's ordinary row happens to have the same cost but is
//     purple-only; the trait-based path is carried by generated-digivolve-overrides.json.
//   [On Play] [When Digivolving] If your hand has 5 or fewer cards, both players
//     ＜Draw 2＞.
//   [All Turns] [Once Per Turn] When effects add to your opponent's hand, by trashing
//     1 card in your hand, your opponent trashes 1 card in their hand.
// Inherited: [When Attacking] [Once Per Turn] ＜Draw 1＞ and trash 1 card in your hand.
//
// Clause mapping:
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared resolve) — "If your hand
//     has 5 or fewer cards, both players <Draw 2>." No "may" wording, so this is a
//     mandatory conditional draw, not a player choice — modeled as a plain hand-size
//     check gating `ctx.fx.draw` for both seats (own seat then `ctx.game.opponentOf`).
//
//   EffectTiming.OnAllyAttack (inherited) — "<Draw 1> and trash 1 card in your hand."
//     Modeled on BT26-067's identical inherited draw-then-trash-from-hand shape
//     (`ctx.fx.draw` then a mandatory `ctx.ask.selectCards` over the hand, `ctx.fx.trash`),
//     `isInherited: true` + `maxPerTurn: 1` per BT12-081's inherited-ability idiom.
//
//   EffectTiming.None (staticModifier) — "[All Turns] [Once Per Turn] When effects add
//     to your opponent's hand, by trashing 1 card in your hand, your opponent trashes 1
//     card in their hand." Modeled on BT26-059/ST16-13's "[All Turns][Once Per Turn]"
//     shape: a `staticModifier` installs a `whenEffectAddsToOpponentHand` SubTrigger
//     watcher on every continuous recompute. The `matches` gate mirrors the interpreter's
//     own `effectAddsToOpponentHandGate` (interpreter.ts) — react only when the seat an
//     effect just added cards to is THIS card's opponent, not its own controller. "By
//     trashing 1 card in your hand" has no "you may" in the printed text, but every other
//     "By [cost], [effect]" clause in this codebase (e.g. P-088's compiled IR) is
//     optional — paying a cost is always the player's choice — so the cost is offered via
//     `ctx.ask.optional` before it is paid. The opponent's card is chosen by the opponent
//     via `ctx.ask.opponent.selectCards` (decisionApi.ts) over their own hand — the
//     decision is addressed to the opponent's seat, not the controller's. Per
//     builders.ts, `staticModifier` scopes an omitted watcher key to the source instance
//     and effect key, then the SubTrigger turn ledger enforces the printed once-per-turn
//     independently for each copy. A declined or unpayable cost marks the activation as
//     declined so subtriggers.ts releases the reserved budget.

const cardId = "BT26-068";

/** "If your hand has 5 or fewer cards, both players <Draw 2>." On Play / When Digivolving. */
async function drawTwoEachIfHandSmall(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  if (owner.hand.length > 5) return;

  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  await ctx.fx.draw(source.ownerSeat, 2);
  await ctx.fx.draw(opponentSeat, 2);
}

/** "<Draw 1> and trash 1 card in your hand." Inherited [When Attacking][Once Per Turn]. */
async function drawAndTrashFromHand(ctx: EffectContext, source: CardSource): Promise<void> {
  await ctx.fx.draw(source.ownerSeat, 1);

  const owner = ctx.game.player(source.ownerSeat);
  if (owner.hand.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: owner.hand.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length > 0) {
    await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] If your hand has 5 or fewer cards, both players <Draw 2>.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw-two-each`,
          description: "[On Play] If your hand has 5 or fewer cards, both players <Draw 2>.",
          optional: false,
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).hand.length <= 5,
          resolve: async (ctx) => {
            await drawTwoEachIfHandSmall(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-draw-two-each`,
          description: "[When Digivolving] If your hand has 5 or fewer cards, both players <Draw 2>.",
          optional: false,
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).hand.length <= 5,
          resolve: async (ctx) => {
            await drawTwoEachIfHandSmall(ctx, source);
          },
        }),
      ];
    }

    // Inherited [When Attacking][Once Per Turn] <Draw 1> and trash 1 card in your hand.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-draw-and-trash`,
          description: "[When Attacking][Once Per Turn] <Draw 1> and trash 1 card in your hand.",
          isInherited: true,
          optional: false,
          maxPerTurn: 1,
          resolve: async (ctx) => {
            await drawAndTrashFromHand(ctx, source);
          },
        }),
      ];
    }

    // [All Turns][Once Per Turn] When effects add to your opponent's hand, by trashing
    // 1 card in your hand, your opponent trashes 1 card in their hand.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/opponent-hand-added-trade-trash`,
          description:
            "[All Turns][Once Per Turn] When effects add to your opponent's hand, by trashing " +
            "1 card in your hand, your opponent trashes 1 card in their hand.",
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenEffectAddsToOpponentHand",
              sourcePermanentId: self.permanentId,
              once: false,
              description:
                `${cardId}: when effects add to your opponent's hand, by trashing 1 card in ` +
                "your hand, your opponent trashes 1 card in their hand.",
              matches: (subCtx) => {
                const seat = subCtx.trigger?.effectAddedToHandSeat;
                return seat !== undefined && seat === subCtx.game.opponentOf(source.ownerSeat);
              },
              run: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                if (owner.hand.length === 0) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }

                const willPay = await subCtx.ask.optional(
                  subCtx,
                  "Trash 1 card from your hand to make your opponent trash 1 card from their hand?",
                );
                if (!willPay) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }

                const ownChosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: owner.hand.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (ownChosen.length === 0) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }
                const paid = await subCtx.fx.trash(ownChosen, { byEffectSeat: source.ownerSeat });
                if (!paid.some((card) => card.instanceId === ownChosen[0])) {
                  subCtx.oncePerTurnActivationDeclined = true;
                  return;
                }

                const opponentSeat = subCtx.game.opponentOf(source.ownerSeat);
                const opponent = subCtx.game.player(opponentSeat);
                if (opponent.hand.length === 0) return;

                // "Your opponent trashes 1 card in their hand" — the opponent chooses.
                const opponentChosen = await requireOpponentAsk(subCtx).selectCards(subCtx, {
                  candidates: opponent.hand.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (opponentChosen.length > 0) {
                  await subCtx.fx.trash(opponentChosen, { byEffectSeat: source.ownerSeat });
                }
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
