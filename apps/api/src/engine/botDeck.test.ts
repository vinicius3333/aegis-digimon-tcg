import { describe, it, expect } from "vitest";
import { ALL_FAMOUS_DECKS, isFamousDeckAvailable } from "@aegis/shared";
import { playableBotDeck } from "./botDeck.js";
import { validateDecklist } from "./deckValidation.js";
import { BOT_DECKS } from "./testDecks.js";

/**
 * Regression: `isFamousDeckAvailable` clears a preset that `validateDecklist` still
 * rejects — an unreleased card outside beta battle mode, or a banned pair. Seating one
 * threw out of `seatPlayer` and left the room with an empty opponent seat.
 */
describe("playableBotDeck", () => {
  it("never returns a deck the room would reject", () => {
    const rejected = ALL_FAMOUS_DECKS.map(
      (preset) => [preset.deckId, validateDecklist(playableBotDeck(preset.deckId, false))] as const,
    )
      .filter(([, verdict]) => !verdict.ok)
      .map(([deckId]) => deckId);
    expect(rejected).toEqual([]);
  });

  it("keeps a preset the room accepts", () => {
    const playable = ALL_FAMOUS_DECKS.find(
      (preset) => isFamousDeckAvailable(preset) && validateDecklist(preset.decklist).ok,
    );
    expect(playable).toBeDefined();
    expect(playableBotDeck(playable!.deckId, false).mainDeck).toEqual([...playable!.decklist.mainDeck]);
  });

  it("falls back to the built-in pool for an unplayable preset", () => {
    const unplayable = ALL_FAMOUS_DECKS.find(
      (preset) => isFamousDeckAvailable(preset) && !validateDecklist(preset.decklist).ok,
    );
    if (unplayable === undefined) return;
    expect(BOT_DECKS).toContain(playableBotDeck(unplayable.deckId, false));
  });

  it("still plays an unreleased preset inside beta battle mode", () => {
    const betaOnly = ALL_FAMOUS_DECKS.find(
      (preset) =>
        isFamousDeckAvailable(preset) &&
        !validateDecklist(preset.decklist).ok &&
        validateDecklist(preset.decklist, { betaBattleMode: true }).ok,
    );
    if (betaOnly === undefined) return;
    expect(playableBotDeck(betaOnly.deckId, true).mainDeck).toEqual([...betaOnly.decklist.mainDeck]);
  });
});
