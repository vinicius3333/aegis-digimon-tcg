import type { EffectContext } from "../EffectContext.js";
import type { CardInstance } from "@aegis/shared";

type VisibleCard = { instanceId: string; cardId: string };

/**
 * The identities the player may see among cards about to be placed. A face-down card in a
 * stack, under a Tamer, or in security stays unnamed. Hand cards also carry `faceUp: false`,
 * but their owner sees them, so the flag alone cannot decide.
 */
export function knownCards(ctx: EffectContext, cards: { instanceId: string; cardId: string }[]): VisibleCard[] {
  const hiddenIds = new Set<string>();
  for (const seat of [0, 1] as const) {
    const player = ctx.game.player(seat);
    const permanents = [...Array.from(player.battleArea ?? []), ...(player.breeding ? [player.breeding] : [])];
    for (const card of permanents.flatMap((permanent) => Array.from(permanent.stack ?? []))) {
      if (card.faceUp === false) hiddenIds.add(card.instanceId);
    }
    for (const card of Array.from(player.security ?? [])) if (card.faceUp !== true) hiddenIds.add(card.instanceId);
  }
  return cards
    .filter(({ instanceId }) => !hiddenIds.has(instanceId))
    .map(({ instanceId, cardId }) => ({ instanceId, cardId }));
}

/**
 * Cards that enter one end of a digivolution stack together move at the same time, and the
 * player who activated the effect chooses their order (Comprehensive Rules §3-1-3-3,
 * §3-1-3-4; Q2264, Q4606). Returns the ids with order position 1 first: the card that ends
 * nearest the chosen end.
 *
 * No prompt when the order cannot matter (one card, or every card shares a card number), or
 * when the player may not see a card: `visibleCards` must name every card, so a blind or
 * face-down pick keeps its selection order instead of disclosing identities.
 */
export async function orderForStackEnd(
  ctx: EffectContext,
  instanceIds: string[],
  visibleCards: VisibleCard[],
  atTop: boolean,
): Promise<string[]> {
  if (instanceIds.length < 2 || ctx.ask.orderCards === undefined) return instanceIds;
  const cardIdOf = new Map(visibleCards.map((card) => [card.instanceId, card.cardId]));
  const cardIds = instanceIds.map((instanceId) => cardIdOf.get(instanceId));
  if (cardIds.some((cardId) => !cardId)) return instanceIds;
  if (new Set(cardIds).size < 2) return instanceIds;
  return ctx.ask.orderCards(ctx, {
    candidates: instanceIds,
    visibleCards: instanceIds.map((instanceId) => ({ instanceId, cardId: cardIdOf.get(instanceId)! })),
    destination: atTop ? "stackTop" : "stackBottom",
  });
}

/** {@link orderForStackEnd} for whole permanents, which the player orders by their top cards. */
export async function orderPermanentsForStackEnd(
  ctx: EffectContext,
  permanentIds: string[],
  atTop: boolean,
): Promise<string[]> {
  const topCards = permanentIds.map((permanentId) => ctx.game.permanentById(permanentId)?.topCard);
  if (topCards.some((card) => card === undefined)) return permanentIds;
  const permanentIdByTopCard = new Map(topCards.map((card, index) => [card!.instanceId, permanentIds[index]!]));
  const visibleTopCards = topCards.map((card) => ({ instanceId: card!.instanceId, cardId: card!.cardId }));
  const ordered = await orderForStackEnd(ctx, [...permanentIdByTopCard.keys()], visibleTopCards, atTop);
  return ordered.map((instanceId) => permanentIdByTopCard.get(instanceId)!);
}

/** Place a group of loose cards at one end of `hostId`'s digivolution cards in a single move. */
export async function placeAtStackEnd(
  ctx: EffectContext,
  hostId: string,
  instanceIds: string[],
  visibleCards: VisibleCard[],
  placement: { atTop: boolean; faceUp: boolean },
): Promise<CardInstance[]> {
  const ordered = await orderForStackEnd(ctx, instanceIds, visibleCards, placement.atTop);
  // The primitive inserts one card at a time at that end, so the last card it inserts
  // lands nearest the end.
  return ctx.fx.placeUnder(hostId, [...ordered].reverse(), { belowTop: placement.atTop, faceUp: placement.faceUp });
}

/**
 * "As this Digimon's top or bottom digivolution cards": one top-or-bottom choice covers
 * the whole group, then the group enters the stack as in {@link placeAtStackEnd}.
 */
export async function placeAtChosenStackEnd(
  ctx: EffectContext,
  hostId: string,
  instanceIds: string[],
  visibleCards: VisibleCard[],
  faceUp: boolean,
): Promise<CardInstance[]> {
  const atTop = (await ctx.ask.chooseOption(ctx, ["top", "bottom"])) === 0;
  return placeAtStackEnd(ctx, hostId, instanceIds, visibleCards, { atTop, faceUp });
}
