import { describe, expect, it } from "vitest";
import { ALL_FAMOUS_DECKS } from "@aegis/shared/decks/index";
import catalog from "#api/bot/evolution/programs/certified-pilots.json" with { type: "json" };
import { defaultBotProgram } from "#api/bot/defaultBotProgram";
import { parseHeuristic } from "#api/bot/evolution/heuristic";

describe("default pilot routing", () => {
  it("keeps unknown custom decks on the certified generic program", () => {
    const fallback = defaultBotProgram({});
    expect(fallback.specialized).toBe(false);
    expect(defaultBotProgram({ deck: { mainDeck: ["BT1-001"], eggDeck: [] } })).toEqual(fallback);
    expect(fallback.program.rules.find((rule) => rule.feature === "sourceDp")?.weight).toBe(0.2);
  });

  for (const [version, candidate] of Object.entries(catalog.pilots)) {
    it(`uses ${version} only for its exact card multiset`, () => {
      const preset = ALL_FAMOUS_DECKS.find((deck) => deck.deckVersion === version)!;
      const deck = preset.decklist;
      const selected = defaultBotProgram({ deck });
      expect(selected.specialized).toBe(true);
      expect(selected.program).toEqual(parseHeuristic(candidate));
      expect(selected.program.rules.some((rule) => rule.weight !== 0 && rule.when?.sourceCardIds?.length)).toBe(true);
      expect(
        defaultBotProgram({ deck: { mainDeck: [...deck.mainDeck].reverse(), eggDeck: [...deck.eggDeck].reverse() } }),
      ).toEqual(selected);
      expect(defaultBotProgram({ deck: { mainDeck: deck.mainDeck.slice(1), eggDeck: deck.eggDeck } }).specialized).toBe(
        false,
      );
    });
  }
});
