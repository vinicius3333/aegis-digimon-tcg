import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-060 — Chronomon: Destroy Mode (BT26, Black/Red Lv.7 Digimon, Shaman/Iliad/TS).
//
// Verified against the official Q&A (`node tools/kb/query.mjs card BT26-060`, Q7079-Q7087).
//
// [Digivolve] Lv.6 w/[Chronomon] in text/[Giant Slayer]: Cost 5 — a digivolution-cost
//   requirement, not an effect clause. It is an ALTERNATE path (not the printed evo chain in
//   cards.json), so it is carried by the committed alternate-requirement table in
//   packages/shared/src/effects/generated-digivolve-overrides.json as two entries: a Lv.6
//   base whose text contains "Chronomon", or a base named [Giant Slayer] (BT26-085, which
//   prints no level at all and so cannot be folded into the level-gated entry).
// ＜Security A. +1＞ ＜Reboot＞ ＜Blocker＞ ＜Succession (Lv.6 w/[Chronomon] in name)＞ —
//   printed keywords, parsed from effectText by the engine; no module clause (BT26-013's
//   convention).
// [On Play] [When Digivolving] Return the top 5 stacked cards of 3 of your opponent's Digimon
//   to the top of the deck.
// [All Turns] [Once Per Turn] When your effects add to decks, you may delete 1 of your
//   opponent's Digimon.
//
// Clause 1: one resolver over both windows (BT26-025's idiom). Q7079 makes the shape
//   explicit: choose 3 of the opponent's Digimon, then return the top 5 cards of EACH chosen
//   stack. A permanent's `stack` is ordered bottom (index 0) -> top (last) —
//   BT26-031/BT26-033's documented convention — so "the top 5 stacked cards" is the last five
//   entries. Q7081: a shorter stack simply gives up every stacked card it has; the permanent's
//   own TOP card is never a "stacked card", and `stack` already excludes it, so no extra guard
//   is needed. Q7080: the ACTIVATING player chooses the order the cards reach the deck, so the
//   returned batch is passed through `ask.orderCards` (destination "deckTop") when the
//   decision surface offers it; top-first is the fallback order when it does not (the method
//   is optional on SeatScopedDecisionApi and absent from lightweight fakes).
// Clause 2: BT26-001's `whenEffectAddsToDeck` watcher idiom, with the explicit
//   `oncePerTurnKey` a persistent effect needs for its printed [Once Per Turn] (the enclosing
//   `staticModifier`'s `maxPerTurn` is not the engine's gate for an installed watcher).
//   `[All Turns]` means no `isOwnersTurn` gate. Q7084/Q7085 confirm the event's breadth (any
//   area other than the deck, top or bottom, even when the same effect also removed cards).
//
//   RESIDUAL — "YOUR effects": Q7086 is explicit that this triggers when one of your effects
//   adds cards to your OPPONENT's deck, which is exactly what clause 1 above does. The engine
//   fires `whenEffectAddsToDeck` with only `effectAddedToDeckSeat`, the RECIPIENT deck's owner
//   (primitives.ts's `returnToDeck`) — the resolving effect's controller is tracked internally
//   (`effectSeatStack`) but is not exposed on the event or to card modules. So this watcher
//   cannot enforce "your effects" and instead accepts a deck-add on EITHER side. That is a
//   deliberate over-trigger: BT26-001's own-seat gate would silently break this card's printed
//   combo, which Q7086 says must work. Narrow it once the event carries the effect controller.

const cardId = "BT26-060";

const MAX_TARGETS = 3;
const STACKED_CARDS_RETURNED = 5;

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;

function opponentDigimon(ctx: EffectContext, ownerSeat: Seat): string[] {
  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  return Array.from(ctx.game.player(opponentSeat).battleArea)
    .filter(
      (permanent) =>
        !permanent.inBreeding && permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    )
    .map((permanent) => permanent.permanentId);
}

/** Opponent Digimon that actually have digivolution cards to return. */
function stackedOpponentDigimon(ctx: EffectContext, ownerSeat: Seat): string[] {
  return opponentDigimon(ctx, ownerSeat).filter((permanentId) => {
    const permanent = ctx.game.permanentById(permanentId);
    return permanent !== undefined && permanent.stack.length > 0;
  });
}

/**
 * "Return the top 5 stacked cards of 3 of your opponent's Digimon to the top of the deck."
 * — shared by the [On Play] and [When Digivolving] windows.
 */
async function returnTopStackedCards(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = stackedOpponentDigimon(ctx, source.ownerSeat);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length <= MAX_TARGETS
      ? candidates
      : await ctx.ask.chooseTargets(ctx, { candidates, min: MAX_TARGETS, max: MAX_TARGETS });

  for (const permanentId of chosen) {
    const permanent = ctx.game.permanentById(permanentId);
    if (permanent === undefined || permanent.stack.length === 0) continue;
    const topFirst = Array.from(permanent.stack).reverse().slice(0, STACKED_CARDS_RETURNED);
    const instanceIds = topFirst.map((card) => card.instanceId);

    const ordered =
      instanceIds.length > 1 && ctx.ask.orderCards !== undefined
        ? await ctx.ask.orderCards(ctx, {
            candidates: instanceIds,
            visibleCards: topFirst.map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
            destination: "deckTop",
          })
        : instanceIds;

    await ctx.fx.returnToDeck(ordered.length === instanceIds.length ? ordered : instanceIds, { toTop: true });
  }
}

const RETURN_CLAUSE = "Return the top 5 stacked cards of 3 of your opponent's Digimon to the top of the deck.";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/return-opponent-stacked-cards`,
          description: `[On Play] ${RETURN_CLAUSE}`,
          resolve: async (ctx) => {
            await returnTopStackedCards(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/return-opponent-stacked-cards`,
          description: `[When Digivolving] ${RETURN_CLAUSE}`,
          resolve: async (ctx) => {
            await returnTopStackedCards(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/delete-on-effect-adds-to-deck`,
          description:
            "[All Turns] [Once Per Turn] When your effects add to decks, you may delete 1 of " +
            "your opponent's Digimon.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenEffectAddsToDeck",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/delete-on-effect-adds-to-deck`,
              description: `${cardId}: an effect of yours adds cards to a deck -> may delete 1 opponent Digimon.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                // Either deck qualifies — see the "YOUR effects" residual above (KB Q7086).
                return subCtx.trigger?.effectAddedToDeckSeat !== undefined;
              },
              run: async (subCtx) => {
                const targets = opponentDigimon(subCtx, ownerSeat);
                if (targets.length === 0) return;

                const chosen = await subCtx.ask.chooseTargets(subCtx, { candidates: targets, min: 0, max: 1 });
                if (chosen.length === 0) return;

                await subCtx.fx.deletePermanent(chosen);
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
