import { describe, expect, it } from "vitest";
import { effectiveCopyLimit } from "@aegis/shared";
import { copyDeckPreset, DECKS, FAMOUS_DECKS, filterDeckToActivePool, parseDeckList, type DeckListing } from "./decks";

function copyLimitViolations(deck: DeckListing): string[] {
  const counts = new Map<string, number>();
  for (const cardId of [...deck.mainDeck, ...deck.eggDeck]) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }
  return [...counts]
    .filter(([cardId, count]) => count > effectiveCopyLimit(cardId))
    .map(([cardId, count]) => `${deck.id}: ${cardId} has ${count} copies`);
}

describe("active card pool deck filtering", () => {
  it("silently excludes inactive cards from imported lists", () => {
    const deck = parseDeckList("2 Agumon BT1-009\n2 Active later card BT21-005");

    expect(deck.mainDeck).toEqual(["BT1-009", "BT1-009"]);
    expect(deck.skipped).toBe(0);
  });

  it("removes inactive stored cards and an inactive cover", () => {
    const deck: DeckListing = {
      id: "saved",
      name: "Saved deck",
      color: "Red",
      blurb: "",
      mainDeck: ["BT1-009", "BT21-005"],
      eggDeck: ["BT1-001", "BT21-001"],
      coverCardId: "BT21-005",
    };

    expect(filterDeckToActivePool(deck)).toMatchObject({
      mainDeck: ["BT1-009"],
      eggDeck: ["BT1-001"],
      coverCardId: undefined,
    });
  });
});

describe("famous deck presets", () => {
  it("uses only the deck archetype as the displayed name", () => {
    expect(FAMOUS_DECKS.find((deck) => deck.id === "ex2-gallantmon-eto")?.name).toBe("Gallantmon");
    expect(FAMOUS_DECKS.every((deck) => !deck.name.includes(" — "))).toBe(true);
  });

  it("keeps every selectable example and famous deck within current copy limits", () => {
    const violations = [...DECKS, ...FAMOUS_DECKS].flatMap(copyLimitViolations);

    expect(violations).toEqual([]);
  });

  it("keeps every selectable example and famous deck structurally complete", () => {
    for (const deck of [...DECKS, ...FAMOUS_DECKS]) {
      expect({ deckId: deck.id, mainCount: deck.mainDeck.length }).toEqual({ deckId: deck.id, mainCount: 50 });
      expect(deck.eggDeck.length).toBeLessThanOrEqual(5);
    }
  });

  it("creates an editable copy with a personal unique id", () => {
    const preset: DeckListing = {
      id: "bt1-red-omnimon",
      name: "Red Aggro",
      color: "Red",
      blurb: "Preset",
      mainDeck: ["BT1-009"],
      eggDeck: ["BT1-001"],
    };

    const copy = copyDeckPreset(preset, [{ ...preset, id: "copy-bt1-red-omnimon" }]);

    expect(copy).toMatchObject({ id: "copy-bt1-red-omnimon-2", name: "Red Aggro (copy)" });
    expect(copy.mainDeck).not.toBe(preset.mainDeck);
    expect(copy.eggDeck).not.toBe(preset.eggDeck);
  });
});
