import { describe, expect, it } from "vitest";
import type { Intent } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import { runBotMatch, type MatchResult } from "../matchHarness.js";
import { createEvaluationPolicy, type BotPolicy } from "../policy.js";
import { trainingDeck, TRAINING_DECK_VERSIONS } from "./decks.js";

function delayed<Args extends unknown[]>(choose: (...args: Args) => Intent): (...args: Args) => Promise<Intent> {
  return async (...args) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 2));
    return choose(...args);
  };
}

function asynchronousPolicy(seed: number): BotPolicy<Promise<Intent>> {
  const policy = createEvaluationPolicy({ seed });
  return {
    ...policy,
    chooseMainAction: delayed(policy.chooseMainAction),
    chooseBreedingAction: delayed(policy.chooseBreedingAction),
    chooseBlockResponse: delayed(policy.chooseBlockResponse),
    chooseCounterResponse: delayed(policy.chooseCounterResponse),
    chooseAllianceResponse: delayed(policy.chooseAllianceResponse),
    chooseEvadeResponse: delayed(policy.chooseEvadeResponse),
    chooseBarrierResponse: delayed(policy.chooseBarrierResponse),
    answerDecision: delayed(policy.answerDecision),
  };
}

function outcomes(result: MatchResult) {
  return {
    winnerSeat: result.winnerSeat,
    reason: result.reason,
    turnCount: result.turnCount,
    seats: result.seats.map(({ decisionLatenciesMs: _latency, ...stats }) => stats),
  };
}

describe("asynchronous policies in BT26 engine matches", () => {
  it.each([0, 1] as const)("preserves seeded outcomes with deck ordering %i", async (firstDeck) => {
    const seed = 720000 + firstDeck;
    const decks = [
      trainingDeck(TRAINING_DECK_VERSIONS[firstDeck]).deck,
      trainingDeck(TRAINING_DECK_VERSIONS[1 - firstDeck]!).deck,
    ] as const;
    const synchronous = await runBotMatch({
      seed,
      seats: [
        { deck: decks[0], policy: createEvaluationPolicy({ seed }) },
        { deck: decks[1], policy: createEvaluationPolicy({ seed: seed + 7919 }) },
      ],
    });
    const asynchronous = await runBotMatch({
      seed,
      seats: [
        { deck: decks[0], policy: asynchronousPolicy(seed) },
        { deck: decks[1], policy: asynchronousPolicy(seed + 7919) },
      ],
    });
    for (const result of [synchronous, asynchronous]) {
      expect(result.errors).toEqual([]);
      expect(result.rejections).toEqual([]);
      expect(result.timedOut).toBe(false);
      expect(result.winnerSeat).toBeDefined();
      expect(result.seats.map((seat) => seat.inferenceFallbacks)).toEqual([
        { timeout: 0, error: 0 },
        { timeout: 0, error: 0 },
      ]);
    }
    expect(outcomes(asynchronous)).toEqual(outcomes(synchronous));
    const latencies = asynchronous.seats.flatMap((seat) => seat.decisionLatenciesMs);
    expect(latencies.length).toBeGreaterThan(0);
    expect(latencies.every((latency) => latency >= 1)).toBe(true);
  });

  it("waits for the inference deadline instead of declaring a stalled game", async () => {
    const policy = createEvaluationPolicy({ seed: 730000 });
    let first = true;
    let finishLate!: (intent: Intent) => void;
    const lateAnswer = new Promise<Intent>((resolve) => {
      finishLate = resolve;
    });
    const result = await runBotMatch({
      seed: 730000,
      seats: [
        {
          deck: trainingDeck(TRAINING_DECK_VERSIONS[0]).deck,
          policyTimeoutMs: 100,
          policy: {
            ...policy,
            chooseMainAction(view) {
              if (first) {
                first = false;
                return lateAnswer;
              }
              return policy.chooseMainAction(view);
            },
          },
        },
        { deck: trainingDeck(TRAINING_DECK_VERSIONS[1]).deck },
      ],
    });
    expect(result.errors).toEqual([]);
    expect(result.rejections).toEqual([]);
    expect(result.timedOut).toBe(false);
    expect(result.winnerSeat).toBeDefined();
    expect(result.seats[0].inferenceFallbacks).toEqual({ timeout: 1, error: 0 });
    const recorded = structuredClone(result);
    finishLate({ type: "endPhase" });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(result).toEqual(recorded);
  });

  it("closes truncated matches before pending inference can act or mutate their report", async () => {
    let finishLate!: (intent: Intent) => void;
    const lateAnswer = new Promise<Intent>((resolve) => {
      finishLate = resolve;
    });
    let capturedEngine: GameEngine | undefined;
    const policyFactory = (engine: GameEngine): BotPolicy<Intent | Promise<Intent>> => ({
      ...createEvaluationPolicy(),
      chooseMainAction() {
        capturedEngine = engine;
        // Exercise a turn-limit exit while the driver is already awaiting inference.
        engine.state.turnCount = 2;
        return lateAnswer;
      },
    });
    const result = await runBotMatch({
      seed: 730010,
      turnLimit: 1,
      captureEvents: true,
      seats: [{ policyFactory }, { policyFactory }],
    });
    expect(capturedEngine).toBeDefined();
    expect(result.reason).toBe("turnLimit");
    const recorded = structuredClone(result);
    const memory = capturedEngine!.state.memory;
    finishLate({ type: "endPhase" });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(result).toEqual(recorded);
    expect(capturedEngine!.state.memory).toBe(memory);
  });
});
