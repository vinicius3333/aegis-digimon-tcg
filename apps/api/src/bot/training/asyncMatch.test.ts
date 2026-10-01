import { describe, expect, it } from "vitest";
import type { Intent } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import { runBotMatch, type MatchResult, type SeatConfig } from "../matchHarness.js";
import { createEvaluationPolicy, type BotPolicy } from "../policy.js";
import { trainingDeck, TRAINING_DECK_VERSIONS } from "./decks.js";
import { createAsyncTrainingPolicy, createTrainingPolicy, type TrainingWindow } from "./policy.js";
import { mainActionReady } from "./actions.js";

// Each test plays whole engine matches; under full-suite CPU contention they run ~10x slower
// than alone, so the default 15s limit fails them spuriously.
const fullMatchTimeoutMs = 60_000;

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
  it.each([0, 1] as const)(
    "preserves teacher choices through the async candidate adapter with deck ordering %i",
    async (firstDeck) => {
      const seed = 750000 + firstDeck;
      const syncChoices: string[] = [];
      const asyncChoices: string[] = [];
      const choose = (window: TrainingWindow, trace: string[]) => {
        const action = window.teacher?.action;
        if (action === undefined || action === null) throw new Error("Missing teacher action");
        trace.push(JSON.stringify({ kind: window.kind, selected: window.selected, actions: window.actions, action }));
        return action;
      };
      function seatConfig(seat: 0 | 1, asynchronous: boolean): SeatConfig {
        return {
          deck: trainingDeck(TRAINING_DECK_VERSIONS[seat === 0 ? firstDeck : 1 - firstDeck]!).deck,
          canChooseMainAction: mainActionReady,
          maxMainPhaseActions: Infinity,
          policyFactory(engine) {
            const teacher = createEvaluationPolicy({ seed: seed + seat * 7919 });
            return asynchronous
              ? createAsyncTrainingPolicy(
                  engine,
                  seat,
                  async (window, signal) => {
                    await new Promise<void>((resolve) => setImmediate(resolve));
                    signal.throwIfAborted();
                    return choose(window, asyncChoices);
                  },
                  teacher,
                )
              : createTrainingPolicy(engine, seat, (window) => choose(window, syncChoices), teacher);
          },
        };
      }
      const synchronous = await runBotMatch({ seed, seats: [seatConfig(0, false), seatConfig(1, false)] });
      const asynchronous = await runBotMatch({ seed, seats: [seatConfig(0, true), seatConfig(1, true)] });
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
      expect(asyncChoices).toEqual(syncChoices);
      expect(outcomes(asynchronous)).toEqual(outcomes(synchronous));
    },
    fullMatchTimeoutMs,
  );

  it.each([0, 1] as const)(
    "preserves seeded outcomes with deck ordering %i",
    async (firstDeck) => {
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
    },
    fullMatchTimeoutMs,
  );

  it(
    "waits for the inference deadline instead of declaring a stalled game",
    async () => {
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
    },
    fullMatchTimeoutMs,
  );

  it.each(["cancelled", "turnLimit"] as const)(
    "closes %s matches before pending inference can act or mutate their report",
    async (reason) => {
      const stop = new AbortController();
      let finishLate!: (intent: Intent) => void;
      const lateAnswer = new Promise<Intent>((resolve) => {
        finishLate = resolve;
      });
      let capturedEngine: GameEngine | undefined;
      const policyFactory = (engine: GameEngine): BotPolicy<Intent | Promise<Intent>> => ({
        ...createEvaluationPolicy(),
        chooseMainAction() {
          capturedEngine = engine;
          if (reason === "cancelled") stop.abort("decisionLimit");
          else engine.state.turnCount = 2;
          return lateAnswer;
        },
      });
      const result = await runBotMatch({
        seed: 730010,
        signal: stop.signal,
        turnLimit: 1,
        captureEvents: true,
        seats: [{ policyFactory }, { policyFactory }],
      });
      expect(capturedEngine).toBeDefined();
      expect(result.reason).toBe(reason);
      expect(result.winnerSeat).toBeUndefined();
      expect(result.errors).toEqual([]);
      expect(result.rejections).toEqual([]);
      expect(result.seats.map((seat) => seat.inferenceFallbacks)).toEqual([
        { timeout: 0, error: 0 },
        { timeout: 0, error: 0 },
      ]);
      const recorded = structuredClone(result);
      const memory = capturedEngine!.state.memory;
      finishLate({ type: "endPhase" });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(result).toEqual(recorded);
      expect(capturedEngine!.state.memory).toBe(memory);
    },
  );
});
