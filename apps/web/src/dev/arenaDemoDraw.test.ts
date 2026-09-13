// @vitest-environment jsdom
import { CATALOG_DECKS, CardKind, getCardDefinition } from "@aegis/shared";
import { beforeEach, expect, it } from "vitest";
import { createArenaDemoState } from "./ArenaDemo";

beforeEach(() => window.history.replaceState(null, "", "/dev/arena?hand=20&opponentHand=20"));

function remainingOwnDeck() {
  const state = createArenaDemoState();
  const own = state.players[0]!;
  const recipe = CATALOG_DECKS.find((deck) => deck.deckId === "bt26-dgo-2026-08-28-7-chronomon")!;
  const remaining = [...recipe.decklist.mainDeck];
  const cards = [
    ...Array.from(own.battleArea).flatMap((permanent) => [permanent.topCard, ...permanent.stack, ...permanent.linked]),
    own.breeding!.topCard,
    ...own.breeding!.stack,
    ...own.trash,
    ...own.hand,
  ];
  for (const card of cards) {
    if (getCardDefinition(card.cardId)!.kinds.includes(CardKind.DigiEgg)) continue;
    const index = remaining.indexOf(card.cardId);
    expect(index).toBeGreaterThanOrEqual(0);
    remaining.splice(index, 1);
  }
  remaining.splice(0, own.securityCount);
  return remaining;
}

it("draws the actual ordered recipe top, extends a 20-card hand and keeps opponent cards private", () => {
  const baseline = createArenaDemoState();
  const next = createArenaDemoState([1, 1]);
  expect(next.players[0]!.hand.at(-1)?.cardId).toBe(remainingOwnDeck()[0]);
  expect(next.players[0]!.hand.at(-1)?.instanceId).toBe("draw-0-0");
  expect(next.players[0]!.hand).toHaveLength(21);
  for (const seat of [0, 1]) {
    expect(next.players[seat]!.handCount).toBe(baseline.players[seat]!.handCount + 1);
    expect(next.players[seat]!.deckCount).toBe(baseline.players[seat]!.deckCount - 1);
    expect(next.players[seat]!.securityCount).toBe(5);
  }
  expect(next.players[1]!.hand).toHaveLength(0);
});

it("exhausts each finite recipe without duplicated instances or drawing beyond its remaining cards", () => {
  const baseline = createArenaDemoState();
  const exhausted = createArenaDemoState([1000, 1000]);
  const own = exhausted.players[0]!;
  expect(
    Array.from(own.hand)
      .slice(20)
      .map((card) => card.cardId),
  ).toEqual(remainingOwnDeck());
  expect(new Set(own.hand.map((card) => card.instanceId)).size).toBe(own.hand.length);
  for (const seat of [0, 1]) {
    expect(exhausted.players[seat]!.deckCount).toBe(0);
    expect(exhausted.players[seat]!.handCount).toBe(20 + baseline.players[seat]!.deckCount);
  }
  expect(exhausted.players[1]!.hand).toHaveLength(0);
});
