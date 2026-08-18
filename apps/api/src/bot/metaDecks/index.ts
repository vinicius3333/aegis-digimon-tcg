import { CARD_POOL_CUTOFF_DATE, VALIDATED_FAMOUS_DECKS, releaseDateForCard } from "@aegis/shared";
import type { CardPoolCutoffDate } from "../../engine/deckValidation.js";
import type { BlockLabel, MetaDeck } from "./types.js";

/**
 * Versioned, legal, block-aware bot decks for tournament play.
 *
 * ## What a "block" is here
 *
 * `tournaments.block` is free-form text (`AccountStore.Tournament`), and the
 * convention the biweekly block cycle established is the product label of the set
 * that opened the format — "BT10", "BT11". A block therefore names a format era,
 * and its release date bounds the card pool that era could legally play.
 *
 * ## What every shipped deck guarantees
 *
 * 1. **Card pool** — every card exists in `cards.json` and was released on or
 *    before its block's release date.
 * 2. **Implemented effects** — every card that prints an effect has a registered
 *    effect module (`apps/api/src/cards/<SET>/<ID>.ts`). A bot never plays a card
 *    the engine does not implement.
 * 3. **Deck-building rules** — the list passes `validateDecklist`, the same gate a
 *    human deck goes through: exactly 50 main-deck cards, at most 5 Digi-Eggs,
 *    eggs and main deck not mixed, per-card copy caps, no banned pairs.
 * 4. **Banlist** — copy caps come from `data/kb/banlist.json` resolved
 *    at *today's* date, because that is what the server enforces. A list that was
 *    legal in its own era is trimmed to today's restrictions, never to the
 *    historical ones.
 *
 * `metaDecks.test.ts` re-checks all four for every shipped deck, so a KB refresh
 * or card-pool change fails CI instead of shipping an illegal bot deck.
 *
 * ## Sources and substitution policy
 *
 * Lists are reconstructions of decks that actually topped events in their format
 * window (see each deck's `source`). Where the reference list cannot be reproduced
 * legally under the four guarantees above, the deck records the delta in
 * `approximation`. Two substitutions recur:
 *
 * - **Banlist trim** — a card the era ran at 4 is capped at 1 (or 0) by the
 *   current banlist; the freed slots go to the nearest functional analogue already
 *   in the list's colors.
 * - **Card-pool trim** — a reference list printed after the block's release date is
 *   replaced by the closest card available at that date.
 *
 * ## Known limitation: what the current bot can actually play
 *
 * These lists are faithful to the meta, not tuned to `BotPlayer`. The bot enumerates
 * Digimon, Tamer and Option plays alongside digivolution (`candidates.ts`), but it
 * never uses DigiXros, and it evaluates a play by the board state it produces rather
 * than by a plan — so a card whose value is a combo two turns away is undervalued
 * even when it is legally played. Decks whose power comes from digivolution lines and
 * raw DP therefore still play closer to their real strength than combo decks do.
 * Narrowing that gap belongs in `BotPlayer`, not in these lists.
 *
 * ## API
 *
 * `metaDecksForBlock(block)` is what the tournament system calls. Each deck carries
 * a stable `deckVersion` (`<deckId>@<revision>`) so a bot result stays traceable to
 * the exact 55 cards played.
 */

/** Every shipped bot deck, oldest block first. */
export const ALL_META_DECKS: readonly MetaDeck[] = VALIDATED_FAMOUS_DECKS;

/**
 * The English release date that bounds a block's card pool, or undefined for a
 * label that names no known product. Non-promo sets take their date from the
 * product table, so any id in the set resolves it — the id itself only matters for
 * promos, which are never block labels.
 */
export function blockReleaseDate(block: BlockLabel): CardPoolCutoffDate | undefined {
  return releaseDateForCard({ cardId: `${block}-001`, set: block });
}

const decksByBlock = new Map<BlockLabel, readonly MetaDeck[]>();
for (const deck of ALL_META_DECKS) {
  decksByBlock.set(deck.block, [...(decksByBlock.get(deck.block) ?? []), deck]);
}
// Every lookup hands back the same array, so freeze it: a consumer that sorted or
// spliced the result in place would otherwise reorder the decks for every later caller.
for (const [block, decks] of decksByBlock) decksByBlock.set(block, Object.freeze(decks));

/** Blocks with decks of their own, oldest first. */
export const COVERED_BLOCKS: readonly BlockLabel[] = Object.freeze(
  [...decksByBlock.keys()].sort((a, b) => (blockReleaseDate(a) ?? "").localeCompare(blockReleaseDate(b) ?? "")),
);

export interface MetaDeckLookupOptions {
  /**
   * The card-pool boundary the server will validate against. Defaults to the
   * operational pool, so a block published ahead of the pool still yields decks the
   * server accepts rather than decks it rejects at deal time.
   */
  cardPoolCutoffDate?: CardPoolCutoffDate;
}

/**
 * The bot decks to play in a tournament of this block.
 *
 * Exact block match wins. Otherwise — an unknown label, a block with no deck of its
 * own, or a block published ahead of the card pool — the newest covered block that
 * still fits the pool ceiling is used, because an older deck is legal in a newer
 * format while the reverse is not. Returns an empty list only when no covered block
 * fits at all (a block older than the oldest covered one).
 *
 * Two consequences the tournament wiring has to handle:
 *
 * - **Any unrecognized label resolves to the newest covered block**, including the
 *   empty string and a typo. There is no "unknown block" signal here, so validate the
 *   label before calling this lookup if a mistyped block should be an error rather than BT10 decks.
 * - **`"ST1"`, `"ST2"`, `"ST3"` and `"P"` return an empty list** — they are real
 *   products that predate the oldest covered block, so nothing legal fits. Callers
 *   must handle an empty result rather than assume a deck always comes back.
 *
 * The returned array is frozen and shared; copy it before sorting or filtering in place.
 */
export function metaDecksForBlock(
  block: BlockLabel,
  { cardPoolCutoffDate = CARD_POOL_CUTOFF_DATE }: MetaDeckLookupOptions = {},
): readonly MetaDeck[] {
  const requested = blockReleaseDate(block);
  const ceiling = requested === undefined || requested > cardPoolCutoffDate ? cardPoolCutoffDate : requested;

  const exact = requested !== undefined && requested <= ceiling ? decksByBlock.get(block) : undefined;
  if (exact !== undefined && exact.length > 0) return exact;

  for (let index = COVERED_BLOCKS.length - 1; index >= 0; index -= 1) {
    const candidate = COVERED_BLOCKS[index]!;
    const date = blockReleaseDate(candidate);
    if (date !== undefined && date <= ceiling) return decksByBlock.get(candidate)!;
  }
  return [];
}

/** A shipped deck by its `deckVersion`, for replaying a recorded bot match. */
export function metaDeckByVersion(deckVersion: string): MetaDeck | undefined {
  return ALL_META_DECKS.find((deck) => deck.deckVersion === deckVersion);
}

export * from "./types.js";
