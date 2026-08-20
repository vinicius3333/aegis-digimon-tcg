import { requireCardDefinition, CardKind, type CardColor } from "@aegis/shared";

/**
 * Two legal-shaped, color-coherent test decks so a match can actually be dealt and
 * played (the headless harness and a manual two-client smoke test use these). They
 * are deliberately simple mono-color BT1 starter-style decks — playable, not
 * tournament-tuned.
 *
 * Deck-construction rules enforced by {@link assertLegalDeck} (Comprehensive Rules
 * §1-4 "Deck"):
 *   - exactly {@link MAIN_DECK_SIZE} (50) main-deck cards (Lv.3+ Digimon, Tamers,
 *     Options),
 *   - up to {@link MAX_EGG_DECK_SIZE} (5) Digi-Egg (Lv.2) cards in the egg deck,
 *   - no more than a card's `maxCountInDeck` copies (usually 4),
 *   - no Digi-Egg in the main deck and nothing but Digi-Eggs in the egg deck.
 *
 * The built decks are validated at module load, so a typo in an id or an illegal
 * count fails loudly (in tests / boot) rather than at deal time.
 *
 * A decklist is the wire shape the room's join options carry
 * (`{ mainDeck: string[]; eggDeck: string[] }`): a flat list of card ids, one entry
 * per physical copy. Card ids are the hyphenated form used everywhere
 * (`CardDefinition.cardId`, e.g. "BT1-010").
 */

/** Exactly this many cards in a legal main deck (Comprehensive Rules §1-4). */
export const MAIN_DECK_SIZE = 50;
/** At most this many cards in the Digi-Egg deck (Comprehensive Rules §1-4). */
export const MAX_EGG_DECK_SIZE = 5;

/** A decklist in the room's join-options shape (flat card-id lists, one per copy). */
export interface Decklist {
  mainDeck: string[];
  eggDeck: string[];
}

/** A card id plus how many copies of it to include. */
interface CardEntry {
  cardId: string;
  count: number;
}

/** Expand `{ cardId, count }` entries into a flat list with one id per copy. */
function expand(entries: readonly CardEntry[]): string[] {
  const cards: string[] = [];
  for (const { cardId, count } of entries) {
    for (let copy = 0; copy < count; copy += 1) {
      cards.push(cardId);
    }
  }
  return cards;
}

// --- Red deck (mono-red BT1): 50 main + 5 eggs --------------------------------
// A simple curve: Lv.3 base Digimon to play, a Lv.4-6 digivolution line, a Tamer,
// and an Option. Every count is within its effective copy cap (4 by default; the
// banlist restricts BT1-090 Gravity Crush to 1 — see banlistRestrictions.ts).
const RED_MAIN: readonly CardEntry[] = [
  { cardId: "BT1-009", count: 4 }, // Monodramon    (Lv.3, cost 2, 3000 DP)
  { cardId: "BT1-010", count: 4 }, // Agumon        (Lv.3, cost 3, 2000 DP)
  { cardId: "BT1-011", count: 4 }, // Agumon Expert (Lv.3, cost 3, 1000 DP)
  { cardId: "BT1-012", count: 4 }, // Biyomon       (Lv.3, cost 3, 2000 DP)
  { cardId: "BT1-013", count: 4 }, // Muchomon      (Lv.3, cost 3, 5000 DP)
  { cardId: "BT1-014", count: 4 }, // Kokatorimon   (Lv.4, cost 3, 4000 DP)
  { cardId: "BT1-015", count: 4 }, // Greymon       (Lv.4, cost 4, 4000 DP)
  { cardId: "BT1-016", count: 4 }, // Tyrannomon    (Lv.4, cost 4, 4000 DP)
  { cardId: "BT1-020", count: 4 }, // Groundramon   (Lv.5, cost 5, 6000 DP)
  { cardId: "BT1-021", count: 4 }, // MetalGreymon  (Lv.5, cost 6, 7000 DP)
  { cardId: "BT1-025", count: 2 }, // WarGreymon    (Lv.6, cost 12, 11000 DP)
  { cardId: "BT1-017", count: 3 }, // Birdramon     (Lv.4, cost 4, 4000 DP)
  { cardId: "BT1-085", count: 4 }, // Tai Kamiya    (Tamer, cost 4)
  { cardId: "BT1-090", count: 1 }, // Gravity Crush (Option; banlist-restricted to 1)
];

const RED_EGGS: readonly CardEntry[] = [
  { cardId: "BT1-001", count: 3 }, // Yokomon   (Lv.2 DigiEgg)
  { cardId: "BT1-002", count: 2 }, // Bebydomon (Lv.2 DigiEgg)
];

// --- Blue deck (mono-blue BT1): 50 main + 5 eggs ------------------------------
const BLUE_MAIN: readonly CardEntry[] = [
  { cardId: "BT1-027", count: 4 }, // Armadillomon (Lv.3, cost 2, 4000 DP)
  { cardId: "BT1-028", count: 4 }, // Elecmon      (Lv.3, cost 2, 3000 DP)
  { cardId: "BT1-029", count: 4 }, // Gabumon      (Lv.3, cost 3, 1000 DP)
  { cardId: "BT1-030", count: 4 }, // Gomamon      (Lv.3, cost 3, 3000 DP)
  { cardId: "BT1-031", count: 4 }, // Monmon       (Lv.3, cost 4, 1000 DP)
  { cardId: "BT1-032", count: 4 }, // Frigimon     (Lv.4, cost 4, 4000 DP)
  { cardId: "BT1-033", count: 4 }, // Dolphmon     (Lv.4, cost 4, 4000 DP)
  { cardId: "BT1-034", count: 4 }, // Ikkakumon    (Lv.4, cost 5, 5000 DP)
  { cardId: "BT1-038", count: 4 }, // Monzaemon    (Lv.5, cost 5, 6000 DP)
  { cardId: "BT1-039", count: 4 }, // Cerberusmon  (Lv.5, cost 6, 6000 DP)
  { cardId: "BT1-043", count: 2 }, // SaberLeomon  (Lv.6, cost 11, 10000 DP)
  { cardId: "BT1-086", count: 4 }, // Matt Ishida  (Tamer, cost 4)
  { cardId: "BT1-096", count: 4 }, // Mad Dog Fire (Option, cost 1)
];

const BLUE_EGGS: readonly CardEntry[] = [
  { cardId: "BT1-003", count: 3 }, // Upamon   (Lv.2 DigiEgg)
  { cardId: "BT1-004", count: 2 }, // Wanyamon (Lv.2 DigiEgg)
];

/**
 * Validate that a decklist is legal-shaped: exactly 50 main-deck cards, at most 5
 * egg cards, every id is a known card, no card exceeds its `maxCountInDeck`, and the
 * egg deck holds only Lv.2 Digi-Eggs while the main deck holds none. Throws on the
 * first violation (so a malformed test deck fails at load, not at deal time).
 */
export function assertLegalDeck(deck: Decklist): void {
  if (deck.mainDeck.length !== MAIN_DECK_SIZE) {
    throw new Error(`Main deck must be exactly ${MAIN_DECK_SIZE} cards, got ${deck.mainDeck.length}`);
  }
  if (deck.eggDeck.length > MAX_EGG_DECK_SIZE) {
    throw new Error(`Egg deck must be at most ${MAX_EGG_DECK_SIZE} cards, got ${deck.eggDeck.length}`);
  }

  const counts = new Map<string, number>();
  for (const cardId of [...deck.mainDeck, ...deck.eggDeck]) {
    const def = requireCardDefinition(cardId); // throws on an unknown id
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    const seen = counts.get(cardId)!;
    if (seen > def.maxCountInDeck) {
      throw new Error(`Too many copies of ${cardId}: ${seen} > maxCountInDeck ${def.maxCountInDeck}`);
    }
  }

  for (const cardId of deck.mainDeck) {
    if (isDigiEgg(cardId)) {
      throw new Error(`Digi-Egg ${cardId} belongs in the egg deck, not the main deck`);
    }
  }
  for (const cardId of deck.eggDeck) {
    if (!isDigiEgg(cardId)) {
      throw new Error(`Non-Digi-Egg ${cardId} cannot go in the egg deck`);
    }
  }
}

function isDigiEgg(cardId: string): boolean {
  return requireCardDefinition(cardId).kinds.includes(CardKind.DigiEgg);
}

/**
 * Split a flat card-id list (one entry per copy, eggs and main mixed) into a
 * {@link Decklist} by routing every Digi-Egg (Lv.2) to the egg deck and everything
 * else to the main deck. Lets a decklist be pasted as a single array without
 * hand-separating the eggs.
 */
function fromFlat(ids: readonly string[]): Decklist {
  const mainDeck: string[] = [];
  const eggDeck: string[] = [];
  for (const id of ids) {
    if (isDigiEgg(id)) eggDeck.push(id);
    else mainDeck.push(id);
  }
  return { mainDeck, eggDeck };
}

/** Primary color of a deck (for logging / quick identification). */
export function deckColor(deck: Decklist): CardColor | undefined {
  const first = deck.mainDeck[0];
  return first !== undefined ? requireCardDefinition(first).colors[0] : undefined;
}

/** A legal mono-red BT1 test deck. */
export const RED_DECK: Decklist = {
  mainDeck: expand(RED_MAIN),
  eggDeck: expand(RED_EGGS),
};

/** A legal mono-blue BT1 test deck. */
export const BLUE_DECK: Decklist = {
  mainDeck: expand(BLUE_MAIN),
  eggDeck: expand(BLUE_EGGS),
};

// Fail loudly at module load if either built deck is illegal.
assertLegalDeck(RED_DECK);
assertLegalDeck(BLUE_DECK);

/** The two test decks, seat 0 / seat 1. */
export const TEST_DECKS: readonly Decklist[] = [RED_DECK, BLUE_DECK];

// --- Bot decks: modern, themed 50+egg lists the bot picks from at random --------
// Pasted as flat lists (eggs + main mixed); fromFlat() routes Lv.2 Digi-Eggs to the
// egg deck. Each list is exactly 50 main + 4 eggs and validated at module load.

const BOT_DECK_1: Decklist = fromFlat([
  "BT15-006",
  "BT15-006",
  "BT15-006",
  "BT15-006",
  "BT3-077",
  "BT3-077",
  "EX10-040",
  "EX10-040",
  "EX10-040",
  "EX10-040",
  "EX9-058",
  "BT16-082",
  "BT16-082",
  "BT19-069",
  "BT19-069",
  "BT18-013",
  "BT19-070",
  "BT19-070",
  "BT19-070",
  "BT18-015",
  "BT18-015",
  "BT18-015",
  "BT18-073",
  "BT18-073",
  "BT18-073",
  "BT19-065",
  "BT19-065",
  "BT19-065",
  "BT19-075",
  "BT19-075",
  "BT19-075",
  "BT18-019",
  "BT18-019",
  "BT18-019",
  "BT18-019",
  "P-220",
  "P-220",
  "P-220",
  "P-220",
  "BT19-101",
  "EX11-055",
  "EX11-055",
  "EX11-055",
  "EX11-055",
  "EX1-066",
  "EX1-066",
  "EX1-066",
  "EX1-066",
  "P-193",
  "P-193",
  "P-193",
  "P-193",
  "P-205",
  "P-205",
]);

const BOT_DECK_2: Decklist = fromFlat([
  "BT21-001",
  "BT21-001",
  "BT21-001",
  "BT21-001",
  "BT21-008",
  "BT21-008",
  "BT21-008",
  "BT21-008",
  "BT24-008",
  "BT24-008",
  "BT24-008",
  "EX11-008",
  "EX11-008",
  "EX11-008",
  "BT21-017",
  "BT21-017",
  "BT21-017",
  "BT21-017",
  "BT24-011",
  "BT24-011",
  "P-189",
  "P-189",
  "P-189",
  "BT21-024",
  "BT21-025",
  "BT24-016",
  "BT24-016",
  "BT24-016",
  "BT24-016",
  "BT24-017",
  "EX11-012",
  "EX11-012",
  "EX11-012",
  "EX11-012",
  "BT24-018",
  "BT24-018",
  "BT24-018",
  "BT21-081",
  "BT21-081",
  "BT24-082",
  "BT24-082",
  "EX11-054",
  "LM-055",
  "BT21-093",
  "BT21-093",
  "BT8-097",
  "BT8-097",
  "LM-027",
  "LM-027",
  "P-035",
  "P-035",
  "P-103",
  "P-103",
  "P-103",
]);

const BOT_DECK_3: Decklist = fromFlat([
  "BT10-003",
  "BT10-003",
  "BT10-003",
  "BT10-003",
  "BT19-057",
  "BT19-057",
  "BT19-057",
  "BT19-057",
  "BT19-008",
  "BT19-008",
  "BT19-008",
  "BT19-008",
  "BT10-029",
  "BT10-029",
  "BT19-061",
  "BT19-061",
  "BT19-061",
  "BT19-061",
  "BT19-035",
  "BT19-035",
  "BT19-051",
  "BT19-051",
  "BT19-051",
  "BT21-021",
  "BT21-021",
  "BT21-021",
  "BT21-021",
  "BT19-038",
  "BT19-038",
  "BT19-038",
  "AD1-013",
  "AD1-013",
  "AD1-013",
  "AD1-006",
  "AD1-006",
  "AD1-006",
  "AD1-006",
  "BT19-014",
  "BT19-014",
  "P-224",
  "P-224",
  "P-224",
  "BT10-087",
  "BT10-087",
  "BT10-087",
  "BT10-087",
  "BT19-079",
  "BT11-095",
  "BT21-083",
  "BT21-083",
  "BT21-083",
  "BT21-083",
  "BT8-095",
  "BT8-095",
]);

/** Decks the bot draws from at random when it joins a match. */
export const BOT_DECKS: readonly Decklist[] = [BOT_DECK_1, BOT_DECK_2, BOT_DECK_3];

for (const deck of BOT_DECKS) assertLegalDeck(deck);

/** Pick one of the {@link BOT_DECKS} at random for the bot to play. */
export function randomBotDeck(): Decklist {
  return BOT_DECKS[Math.floor(Math.random() * BOT_DECKS.length)]!;
}
