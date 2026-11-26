import type { GameState } from "@aegis/shared/schema/GameState";
import type { Seat } from "@aegis/shared/schema/enums";
import type {
  ReplayDecisionOption,
  ReplayDecisionPoint,
  ReplayRolloutFacts,
} from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import type { ReplayEvaluationFactor } from "@aegis/shared/replays/analysis/ReplayEvaluationFactor";
import { evaluateSearchPosition } from "#api/bot/evolution/evaluateSearchPosition";
import type { HeuristicProgram } from "#api/bot/evolution/heuristic";
import { informationKey } from "#api/bot/evolution/mcts";
import { SEED_RESIDUAL } from "#api/bot/evolution/residualPolicy";
import { runReplayContinuation } from "#api/bot/evolution/runReplayContinuation";
import { createEvaluationPolicy } from "#api/bot/policy";
import { DEFAULT_BOT_PROFILE } from "#api/bot/profiles";
import { isSearchLeaf } from "#api/bot/search/isSearchLeaf";
import { runBotSearchTask } from "#api/bot/search/runBotSearchTask";
import { mainActionReady } from "#api/bot/training/actions";
import { trainingObservation, type TrainingObservation } from "#api/bot/training/observation";
import type { ReplayDecisionEvaluationJob } from "#api/replays/analysis/prepareReplayDecisionEvaluation";
import { rateReplayDecision, type ReplayRolloutSample } from "#api/replays/analysis/rateReplayDecision";

type Params = {
  job: ReplayDecisionEvaluationJob;
  decision: ReplayDecisionPoint;
  program: HeuristicProgram;
  randomKey?: string;
  seed: number;
  calibrate: boolean;
};

export type ReplayDecisionEvaluation = {
  decision: ReplayDecisionPoint;
  rollouts: number;
  agreesWithMaster?: boolean;
};

type Rollout = { sample: ReplayRolloutSample; factors: Map<ReplayEvaluationFactor, number>; facts: ReplayRolloutFacts };
type RolloutParams = {
  job: ReplayDecisionEvaluationJob;
  program: HeuristicProgram;
  randomKey?: string;
  sampleSeed: number;
  candidate: number;
  expectedInformation: string;
};

const MIN_ROUNDS = 3;
const MAX_ROUNDS = 12;
const MAX_ROLLOUT_MS = 10_000;
const MASTER_SIMULATIONS = 20;
const MASTER_CANDIDATES = 8;
const MASTER_BUDGET_MS = 120_000;

export async function evaluateReplayDecision({
  job,
  decision,
  program,
  randomKey,
  seed,
  calibrate,
}: Params): Promise<ReplayDecisionEvaluation> {
  const expectedInformation = informationKey(job.root);
  const chosen = job.optionByCandidate.indexOf(decision.chosen[0]!);
  if (chosen < 0) {
    return { decision, rollouts: 0 };
  }
  const rootValue = evaluateSearchPosition(job.root.observation);
  const rollouts: (Rollout | undefined)[][] = job.root.actions.map(() => []);
  let active = job.root.actions.map(() => true);
  let rating = rateReplayDecision({ samples: [], chosen, rootValue });
  let total = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const sampleSeed = (seed + round * 104729) >>> 0;
    for (let candidate = 0; candidate < job.root.actions.length; candidate++) {
      rollouts[candidate]![round] = active[candidate]
        ? await runRollout({ job, program, randomKey, sampleSeed, candidate, expectedInformation })
        : undefined;
      total += active[candidate] ? 1 : 0;
    }
    rating = rateReplayDecision({
      samples: rollouts.map((row) => row.map((rollout) => rollout?.sample)),
      chosen,
      rootValue,
    });
    active = rating.active;
    if (round + 1 >= MIN_ROUNDS && rating.settled) {
      break;
    }
  }
  if (rating.values[chosen] === undefined || rating.values.filter((value) => value !== undefined).length < 2) {
    return { decision, rollouts: total };
  }
  const options = decision.options.map((option) => ({ ...option }));
  job.optionByCandidate.forEach((optionIndex, candidate) => {
    const value = rating.values[candidate];
    if (value !== undefined) {
      options[optionIndex] = describeOption({
        option: options[optionIndex]!,
        value,
        margin: rating.margins[candidate],
        rollouts: rollouts[candidate]!.filter((rollout): rollout is Rollout => rollout !== undefined),
      });
    }
  });
  const evaluated: ReplayDecisionPoint = {
    ...decision,
    options,
    bestOption: job.optionByCandidate[rating.best]!,
    loss: round3(rating.loss),
    ...(rating.lossMargin === undefined ? {} : { lossMargin: round3(rating.lossMargin) }),
    quality: rating.quality,
  };
  if (!calibrate) {
    return { decision: evaluated, rollouts: total };
  }
  const master = await findMasterChoice({ job, program, randomKey, seed });
  return {
    decision: evaluated,
    rollouts: total,
    ...(master === undefined ? {} : { agreesWithMaster: job.optionByCandidate[master] === evaluated.bestOption }),
  };
}

async function runRollout({
  job,
  program,
  randomKey,
  sampleSeed,
  candidate,
  expectedInformation,
}: RolloutParams): Promise<Rollout | undefined> {
  try {
    const result = await runReplayContinuation({
      engineSnapshot: job.snapshot,
      ...(randomKey === undefined ? {} : { randomKey }),
      seat: job.seat,
      expectedInformation,
      sampleSeed,
      program,
      opponentProgram: SEED_RESIDUAL,
      rolloutPolicy: createEvaluationPolicy({ profile: DEFAULT_BOT_PROFILE, seed: sampleSeed + job.seat * 7919 }),
      rootWindow: job.root,
      choose: () => candidate,
      rolloutTurns: 1,
      maxRolloutDecisions: 128,
      maxDurationMs: MAX_ROLLOUT_MS,
      seenOpponentCards: { main: [], eggs: [] },
      profile: DEFAULT_BOT_PROFILE,
      opponent: {
        policyFactory: (_engine, seat) =>
          createEvaluationPolicy({ profile: DEFAULT_BOT_PROFILE, seed: sampleSeed + seat * 7919 }),
        canChooseMainAction: mainActionReady,
      },
    });
    if (!isSearchLeaf(result)) {
      return undefined;
    }
    return {
      sample: { reward: result.reward, terminal: result.reason !== "rolloutCutoff" },
      ...describeLeaf({ state: result.state, seat: job.seat }),
    };
  } catch {
    return undefined;
  }
}

function describeLeaf({ state, seat }: { state: GameState; seat: Seat }) {
  const observation = trainingObservation(state, seat);
  const factors = new Map<ReplayEvaluationFactor, number>();
  evaluateSearchPosition(observation, DEFAULT_BOT_PROFILE, ({ side, factor, value }) => {
    factors.set(factor, (factors.get(factor) ?? 0) + (side === "own" ? value : -value));
  });
  return { factors, facts: getFacts({ observation, seat }) };
}

function getFacts({ observation, seat }: { observation: TrainingObservation; seat: Seat }): ReplayRolloutFacts {
  const own = observation.players.find((player) => player.seat === seat)!;
  const opponent = observation.players.find((player) => player.seat !== seat)!;
  const countDigimon = (player: typeof own) =>
    player.board.filter((permanent) => permanent.top?.kinds?.includes("Digimon") || (permanent.top?.level ?? 0) > 0)
      .length;
  return {
    ownSecurity: own.securityCount,
    opponentSecurity: opponent.securityCount,
    ownDigimon: countDigimon(own),
    opponentDigimon: countDigimon(opponent),
    ownHand: own.handCount,
    memory: observation.turnSeat === seat ? observation.memory : -observation.memory,
  };
}

type DescribeParams = {
  option: ReplayDecisionOption;
  value: number;
  margin: number | undefined;
  rollouts: readonly Rollout[];
};

function describeOption({ option, value, margin, rollouts }: DescribeParams): ReplayDecisionOption {
  const factors: Partial<Record<ReplayEvaluationFactor, number>> = {};
  for (const rollout of rollouts) {
    for (const [factor, contribution] of rollout.factors) {
      factors[factor] = (factors[factor] ?? 0) + contribution / rollouts.length;
    }
  }
  const average = (pick: (facts: ReplayRolloutFacts) => number) =>
    Math.round((rollouts.reduce((sum, rollout) => sum + pick(rollout.facts), 0) / rollouts.length) * 10) / 10;
  return {
    ...option,
    value: round3(value),
    ...(margin === undefined ? {} : { margin: round3(Math.min(1, margin)) }),
    samples: rollouts.length,
    factors: Object.fromEntries(Object.entries(factors).map(([factor, total]) => [factor, round3(total)])),
    facts: {
      ownSecurity: average((facts) => facts.ownSecurity),
      opponentSecurity: average((facts) => facts.opponentSecurity),
      ownDigimon: average((facts) => facts.ownDigimon),
      opponentDigimon: average((facts) => facts.opponentDigimon),
      ownHand: average((facts) => facts.ownHand),
      memory: average((facts) => facts.memory),
    },
  };
}

async function findMasterChoice({
  job,
  program,
  randomKey,
  seed,
}: Pick<Params, "job" | "program" | "randomKey" | "seed">): Promise<number | undefined> {
  try {
    const result = await runBotSearchTask({
      task: {
        snapshot: job.snapshot,
        ...(randomKey === undefined ? {} : { randomKey }),
        root: job.root,
        seat: job.seat,
        program,
        opponentProgram: SEED_RESIDUAL,
        profile: DEFAULT_BOT_PROFILE,
        simulations: MASTER_SIMULATIONS,
        candidateLimit: MASTER_CANDIDATES,
        deadlineEpochMs: Date.now() + MASTER_BUDGET_MS,
        seed: (seed ^ 0x5bd1e995) >>> 0,
        rootPriors: job.priors,
        seenOpponentCards: { main: [], eggs: [] },
      },
      signal: new AbortController().signal,
    });
    return result.action;
  } catch {
    return undefined;
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
