import { describe, expect, it, vi } from "vitest";
import { type MatchResult, runBotMatch } from "./matchHarness.js";
import { createMatchups, runBattleFuzz, type FuzzDeck } from "./battleFuzzer.js";

const deck = { mainDeck: [], eggDeck: [] };
const decks: FuzzDeck[] = [
  { id: "a", deck },
  { id: "b", deck },
];

function result(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    seed: 1,
    winnerSeat: 0,
    reason: "security",
    turnCount: 4,
    timedOut: false,
    rejections: [],
    errors: [],
    seats: [
      {
        label: "a",
        attacksDeclared: 0,
        securityCardsTaken: 0,
        digimonPlayed: 0,
        digivolutions: 0,
        turnsTaken: 1,
        decisionLatenciesMs: [],
      },
      {
        label: "b",
        attacksDeclared: 0,
        securityCardsTaken: 0,
        digimonPlayed: 0,
        digivolutions: 0,
        turnsTaken: 1,
        decisionLatenciesMs: [],
      },
    ],
    events: [
      { kind: "matchStarted", firstSeat: 0 },
      { kind: "gameOver", result: { outcome: "win", winnerSeat: 0 }, reason: "security" },
    ],
    ...overrides,
  };
}

describe("battle fuzzer", () => {
  it("builds complete ordered and unordered matchup matrices", () => {
    expect(createMatchups(decks, true).map(([a, b]) => `${a.id}-${b.id}`)).toEqual(["a-a", "a-b", "b-a", "b-b"]);
    expect(createMatchups(decks, false).map(([a, b]) => `${a.id}-${b.id}`)).toEqual(["a-a", "a-b", "b-b"]);
  });

  it("uses deterministic seeds and reports a replayable presentation failure", async () => {
    const runMatch = vi
      .fn<typeof runBotMatch>()
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce(
        result({
          events: [
            {
              kind: "effectTriggered",
              seat: 0,
              sourceCardId: "EX12-046",
              effectKey: "when-digivolving",
              description: "Do something",
            },
          ],
        }),
      );

    const report = await runBattleFuzz({ decks, maximumMatchups: 1, seedsPerMatchup: 2, baseSeed: 100, runMatch });

    expect(runMatch.mock.calls.map(([options]) => options.seed)).toEqual([100, 8_019]);
    expect(report.matchCount).toBe(2);
    expect(report.failures).toEqual([
      expect.objectContaining({
        decks: ["a", "a"],
        seed: 8_019,
        presentationAnomalies: [expect.objectContaining({ kind: "effect-not-resolved" })],
      }),
    ]);
  });
});
