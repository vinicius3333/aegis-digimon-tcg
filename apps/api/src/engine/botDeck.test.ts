import { describe, it, expect, vi } from "vitest";
import { ALL_FAMOUS_DECKS, isFamousDeckAvailable } from "@aegis/shared";
import { playableBotDeck } from "./botDeck.js";
import { validateDecklist } from "./deckValidation.js";

/**
 * Regression: `isFamousDeckAvailable` clears a preset that `validateDecklist` still
 * rejects — an unreleased card outside beta battle mode, or a banned pair. Seating one
 * threw out of `seatPlayer` and left the room with an empty opponent seat.
 */
describe("playableBotDeck", () => {
  it("draws random practice opponents from the legal preset catalog", () => {
    const candidates = ALL_FAMOUS_DECKS.filter(
      (preset) => isFamousDeckAvailable(preset) && validateDecklist(preset.decklist).ok,
    );
    expect(candidates.length).toBeGreaterThan(3);
    const random = vi.spyOn(Math, "random");
    try {
      random.mockReturnValue(0);
      expect(playableBotDeck(undefined, false).mainDeck).toEqual([...candidates[0]!.decklist.mainDeck]);
      random.mockReturnValue(0.999999);
      expect(playableBotDeck("not-a-deck-id", false).mainDeck).toEqual([...candidates.at(-1)!.decklist.mainDeck]);
    } finally {
      random.mockRestore();
    }
  });

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

  it("draws from the legal catalog for an unplayable preset", () => {
    const unplayable = ALL_FAMOUS_DECKS.find(
      (preset) => isFamousDeckAvailable(preset) && !validateDecklist(preset.decklist).ok,
    );
    if (unplayable === undefined) return;
    expect(validateDecklist(playableBotDeck(unplayable.deckId, false)).ok).toBe(true);
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
