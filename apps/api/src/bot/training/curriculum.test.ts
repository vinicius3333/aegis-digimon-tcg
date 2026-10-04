import { createHash } from "node:crypto";
import { allCardIds } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertLegalDeck } from "../../engine/testDecks.js";
import { CURRICULUM_DECK_VERSIONS, curriculumManifest, episodeDeck } from "./curriculum.js";
import { TRAINING_DECK_VERSIONS, trainingDeck } from "./decks.js";
import { trainingMetadata } from "./metadata.js";
import "../../cards/index.js";

describe("complementary BT26 / EX13 learning recipes", () => {
  it("gives all 181 set cards legal recipes without adding unknown encoder cards", () => {
    const metadata = trainingMetadata();
    const recipes = CURRICULUM_DECK_VERSIONS.map(episodeDeck);
    expect(recipes).toHaveLength(42);
    expect(new Set(recipes.map(({ version }) => version)).size).toBe(42);
    const observed = new Set<string>();
    for (const { deck, sha256 } of recipes) {
      expect(() => assertLegalDeck(deck)).not.toThrow();
      expect(deck.mainDeck).toHaveLength(50);
      expect(sha256).toBe(createHash("sha256").update(JSON.stringify(deck)).digest("hex"));
      for (const id of [...deck.mainDeck, ...deck.eggDeck]) {
        expect(metadata.cardIds).toContain(id);
        observed.add(id);
      }
    }
    const setCards = allCardIds().filter((id) => /^(BT26|EX13)-/.test(id));
    expect(setCards).toHaveLength(181);
    expect(setCards.filter((id) => !observed.has(id))).toEqual([]);
  });

  it("keeps the 26 catalog recipes and checkpoint deck schema unchanged", () => {
    expect(CURRICULUM_DECK_VERSIONS.slice(0, 26)).toEqual(TRAINING_DECK_VERSIONS);
    for (const version of TRAINING_DECK_VERSIONS) expect(episodeDeck(version)).toEqual(trainingDeck(version));
    const manifest = curriculumManifest("test-runtime");
    expect(manifest.engineSha256).toBe("test-runtime");
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.decks.slice(0, 26)).toEqual(trainingMetadata().decks);
  });

  it("returns independent lists and rejects an unpinned recipe version", () => {
    const version = "curriculum-data-squad-rosemon@1";
    const original = episodeDeck(version);
    const mutated = episodeDeck(version);
    mutated.deck.mainDeck.pop();
    mutated.deck.eggDeck.pop();
    expect(episodeDeck(version)).toEqual(original);
    expect(() => episodeDeck("curriculum-data-squad-rosemon@2")).toThrow("outside");
    expect(() => trainingDeck(version)).toThrow("outside");
  });
});
