import { describe, expect, it } from "vitest";
import { ALL_FAMOUS_DECKS } from "@aegis/shared";
import { runBotMatch } from "./matchHarness.js";

describe("bot match client projections", () => {
  it.each([262603, 262613])(
    "keeps later draws private after recovery in a BT26 Abbadomon mirror (seed %i)",
    async (seed) => {
      const source = ALL_FAMOUS_DECKS.find((deck) => deck.deckVersion === "bt26-dgo-2026-09-05-2-abbadomon@1");
      expect(source).toBeDefined();
      const deck = { mainDeck: [...source!.decklist.mainDeck], eggDeck: [...source!.decklist.eggDeck] };
      const result = await runBotMatch({
        seed,
        seats: [
          { deck, profile: "balanced" },
          { deck, profile: "balanced" },
        ],
        verifyProjections: true,
        captureEvents: true,
      });
      expect(result.errors).toEqual([]);
      expect(result.rejections).toEqual([]);
      expect(result.timedOut).toBe(false);
      // Keep this seed honest if deck data or the heuristic policy changes: a
      // recovered card must be discarded again before a later draw is checked.
      const moves = result.events!.filter((event) => event.kind === "cardsMoved");
      expect(
        moves.some((recovery, recoveryIndex) => {
          if (recovery.from !== "various" || recovery.to !== "hand") return false;
          const discardIndex = moves.findIndex(
            (move, index) =>
              index > recoveryIndex &&
              move.to === "trash" &&
              move.instanceIds.some((id) => recovery.instanceIds.includes(id)),
          );
          return (
            discardIndex >= 0 &&
            moves.slice(discardIndex + 1).some((move) => move.from === "deck" && move.to === "hand")
          );
        }),
      ).toBe(true);
    },
  );

  it("keeps both client views private through a seeded real match", async () => {
    const result = await runBotMatch({
      seed: 20260922,
      seats: [{ profile: "balanced" }, { profile: "balanced" }],
      turnLimit: 2,
      verifyProjections: true,
      captureEvents: true,
    });

    expect(result.projectionChecks).toBeGreaterThan(1);
    expect(result.errors).toEqual([]);
    expect(result.events?.length).toBeGreaterThan(0);
  });
});
