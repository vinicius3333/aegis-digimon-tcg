import { describe, expect, it } from "vitest";
import { runBotMatch } from "../matchHarness.js";
import { mainActionReady } from "../training/actions.js";
import { createTrainingPolicy } from "../training/policy.js";
import { chooseHeuristic, SEED_HEURISTIC } from "./heuristic.js";
import { randomDeck } from "./randomDecks.js";
import { runEvolutionMatch } from "./evolutionMatch.js";

describe("heuristic evaluation on composed random decks", () => {
  it("reconstructs real-engine search rollouts without replay drift or policy fallbacks", async () => {
    const result = await runEvolutionMatch({
      seed: 42,
      learnerSeat: 0,
      decks: [randomDeck(1).deck, randomDeck(2).deck],
      program: SEED_HEURISTIC,
      mcts: { simulations: 2, seed: 619 },
      turnLimit: 60,
    });
    expect(result.valid).toBe(true);
    expect(result.searches.length).toBeGreaterThan(0);
    expect(result.searches.every((search) => search.completed === 2 && search.invalid === 0)).toBe(true);
    expect(
      result.result.seats.every((seat) => seat.inferenceFallbacks.error === 0 && seat.inferenceFallbacks.timeout === 0),
    ).toBe(true);
  }, 20000);
  it.each([0, 1] as const)(
    "finishes a real game with learner seat %s and no hidden projection leak",
    async (learnerSeat) => {
      const seats = [1, 2].map((seed, index) => ({
        deck: randomDeck(seed).deck,
        ...(index !== learnerSeat
          ? {}
          : {
              policyFactory: (engine: Parameters<typeof createTrainingPolicy>[0], seat: 0 | 1) =>
                createTrainingPolicy(engine, seat, (window) => chooseHeuristic(SEED_HEURISTIC, window)),
              canChooseMainAction: mainActionReady,
              maxMainPhaseActions: Number.POSITIVE_INFINITY,
            }),
      }));
      const result = await runBotMatch({
        seed: 42,
        seats: [seats[0]!, seats[1]!],
        turnLimit: 60,
        captureEvents: true,
        verifyProjections: true,
      });
      expect(result.timedOut).toBe(false);
      expect(result.reason).toBe("security");
      expect(result.errors).toEqual([]);
      expect(result.rejections).toEqual([]);
      expect(result.events!.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(result.projectionChecks).toBeGreaterThan(10);
    },
  );
});
