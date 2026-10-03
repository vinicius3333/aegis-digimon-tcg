import { describe, expect, it } from "vitest";
import { ALL_FAMOUS_DECKS, allCardIds } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { scheduledEpisode, TRAINING_DECK_VERSIONS, trainingDeck } from "./decks.js";
import { trainingMetadata } from "./metadata.js";
import "../../cards/index.js";

describe("complete BT26 and EX13 training scope", () => {
  it("pins every catalog recipe and retains all cards in each legal list", () => {
    const recipes = ALL_FAMOUS_DECKS.filter((deck) => ["BT26", "EX13"].includes(deck.block));
    expect([...TRAINING_DECK_VERSIONS].sort()).toEqual(recipes.map((deck) => deck.deckVersion).sort());
    expect(TRAINING_DECK_VERSIONS).toHaveLength(26);
    for (const source of recipes) expect(trainingDeck(source.deckVersion).deck).toEqual(source.decklist);
  });

  it("schedules every ordered pairing for each learner seat in a complete cycle", () => {
    const cycle = 2 * TRAINING_DECK_VERSIONS.length ** 2;
    const episodes = Array.from({ length: cycle }, (_, index) => scheduledEpisode(index));
    expect(
      new Set(episodes.slice(0, 52).map(({ versions, learnerSeat }) => `${versions[learnerSeat]}:${learnerSeat}`)).size,
    ).toBe(52);
    expect(new Set(episodes.map((episode) => JSON.stringify(episode))).size).toBe(cycle);
    for (const version of TRAINING_DECK_VERSIONS) {
      for (const learnerSeat of [0, 1]) {
        expect(
          episodes.filter(
            (episode) => episode.learnerSeat === learnerSeat && episode.versions[learnerSeat] === version,
          ),
        ).toHaveLength(26);
      }
    }
    expect(scheduledEpisode(cycle)).toEqual(scheduledEpisode(0));
  });

  it("includes every BT26/EX13 card and rejects residual or unhandled declarations", () => {
    const metadata = trainingMetadata();
    const setCards = allCardIds().filter((id) => /^(BT26|EX13)-/.test(id));
    expect(setCards.every((id) => metadata.cardIds.includes(id))).toBe(true);
    for (const id of metadata.cardIds) {
      const compiled = runtimeCompiledCard(id);
      expect({ id, coverage: compiled?.coverage, residual: compiled?.residual }).toEqual({
        id,
        coverage: "full",
        residual: [],
      });
      // Mind Link is absent in this scope; new producers require separate adapter evidence.
      expect({ id, mindLink: compiled?.mindLinkRequirement ?? [] }).toEqual({ id, mindLink: [] });
    }
    const families = [
      "dnaDigivolveRequirement",
      "appFusionRequirement",
      "linkRequirement",
      "digiXrosRequirement",
      "assemblyRequirement",
    ] as const;
    for (const family of families)
      expect(metadata.cardIds.some((id) => (runtimeCompiledCard(id)?.[family]?.length ?? 0) > 0)).toBe(true);
  });
});
