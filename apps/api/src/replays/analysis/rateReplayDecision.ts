import { ReplayDecisionQuality } from "@aegis/shared/replays/analysis/ReplayDecisionQuality";

export type ReplayRolloutSample = { reward: number; terminal: boolean };

export type ReplayDecisionRating = {
  values: (number | undefined)[];
  margins: (number | undefined)[];
  counts: number[];
  best: number;
  loss: number;
  lossMargin: number | undefined;
  quality: ReplayDecisionQuality;
  settled: boolean;
  active: boolean[];
};

type Params = {
  samples: readonly (readonly (ReplayRolloutSample | undefined)[])[];
  chosen: number;
  rootValue: number;
};

const TERMINAL_WEIGHT = 0.7;
const TERMINAL_FLOOR = 0.05;
const TERMINAL_CEILING = 0.95;
const SPREAD_FLOOR = 0.1;
const SETTLED_MARGIN = 0.05;
const MIN_SAMPLES_FOR_ERROR = 6;
const STUDENT_T_975 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12,
];
const GRADED = Object.values(ReplayDecisionQuality).filter((entry) => entry.isGraded);

export function rateReplayDecision({ samples, chosen, rootValue }: Params): ReplayDecisionRating {
  const rewards = samples.map((row) =>
    row.map((sample) => (sample === undefined ? undefined : blend(sample, rootValue))),
  );
  const summaries = rewards.map((row) => summarize(row.filter((reward): reward is number => reward !== undefined)));
  const best = summaries.reduce(
    (leader, summary, candidate) => ((summary.mean ?? -1) > (summaries[leader]!.mean ?? -1) ? candidate : leader),
    chosen,
  );
  const rival = best === chosen ? findRunnerUp({ summaries, best }) : chosen;
  const difference = rival === undefined ? summarize([]) : summarizePairs({ rewards, best, rival });
  const loss = best === chosen ? 0 : Math.max(0, difference.mean ?? 0);
  const lossMargin = best === chosen ? undefined : difference.margin;
  const quality = classify({ best, chosen, loss, margin: difference.margin, count: difference.count });
  const bestSummary = summaries[best]!;
  return {
    values: summaries.map((summary) => summary.mean),
    margins: summaries.map((summary) => summary.margin),
    counts: summaries.map((summary) => summary.count),
    best,
    loss,
    lossMargin,
    quality,
    settled: isSettled({ best, chosen, difference, quality }),
    active: summaries.map(
      (summary, candidate) =>
        candidate === chosen ||
        candidate === best ||
        summary.mean === undefined ||
        summary.mean + (summary.margin ?? 1) >= (bestSummary.mean ?? 0) - (bestSummary.margin ?? 1),
    ),
  };
}

function blend(sample: ReplayRolloutSample, rootValue: number): number {
  if (!sample.terminal) {
    return sample.reward;
  }
  const blended = TERMINAL_WEIGHT * sample.reward + (1 - TERMINAL_WEIGHT) * rootValue;
  return Math.min(TERMINAL_CEILING, Math.max(TERMINAL_FLOOR, blended));
}

type Summary = { mean: number | undefined; margin: number | undefined; count: number };

function summarize(values: readonly number[]): Summary {
  if (values.length === 0) {
    return { mean: undefined, margin: undefined, count: 0 };
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (values.length < 2) {
    return { mean, margin: undefined, count: values.length };
  }
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  const spread = Math.max(SPREAD_FLOOR, Math.sqrt(variance));
  const critical = STUDENT_T_975[values.length - 2] ?? 1.96;
  return { mean, margin: (critical * spread) / Math.sqrt(values.length), count: values.length };
}

function summarizePairs({
  rewards,
  best,
  rival,
}: {
  rewards: readonly (readonly (number | undefined)[])[];
  best: number;
  rival: number;
}): Summary {
  const differences: number[] = [];
  rewards[best]!.forEach((reward, sample) => {
    const other = rewards[rival]![sample];
    if (reward !== undefined && other !== undefined) {
      differences.push(reward - other);
    }
  });
  return summarize(differences);
}

function findRunnerUp({ summaries, best }: { summaries: readonly Summary[]; best: number }): number | undefined {
  let runnerUp: number | undefined;
  summaries.forEach((summary, candidate) => {
    if (candidate === best || summary.mean === undefined) {
      return;
    }
    if (runnerUp === undefined || summary.mean > summaries[runnerUp]!.mean!) {
      runnerUp = candidate;
    }
  });
  return runnerUp;
}

type ClassifyParams = { best: number; chosen: number; loss: number; margin: number | undefined; count: number };

function classify({ best, chosen, loss, margin, count }: ClassifyParams): ReplayDecisionQuality {
  if (best === chosen) {
    return ReplayDecisionQuality.BEST.value;
  }
  const lower = Math.max(0, loss - (margin ?? Infinity));
  const upper = loss + (margin ?? Infinity);
  if (upper <= ReplayDecisionQuality.GOOD.maxLoss) {
    return getBand(loss);
  }
  if (lower < ReplayDecisionQuality.INACCURACY.minLoss || count < MIN_SAMPLES_FOR_ERROR) {
    return ReplayDecisionQuality.UNCERTAIN.value;
  }
  return getBand(lower);
}

function getBand(loss: number): ReplayDecisionQuality {
  return GRADED.find((entry) => loss <= entry.maxLoss)!.value;
}

type SettledParams = { best: number; chosen: number; difference: Summary; quality: ReplayDecisionQuality };

function isSettled({ best, chosen, difference, quality }: SettledParams): boolean {
  if (difference.margin === undefined) {
    return false;
  }
  if (difference.margin <= SETTLED_MARGIN) {
    return true;
  }
  const lower = Math.max(0, (difference.mean ?? 0) - difference.margin);
  const upper = (difference.mean ?? 0) + difference.margin;
  if (best === chosen) {
    return lower > ReplayDecisionQuality.BEST.maxLoss;
  }
  if (quality === ReplayDecisionQuality.UNCERTAIN.value) {
    return false;
  }
  return getBand(lower) === getBand(upper) || upper <= ReplayDecisionQuality.GOOD.maxLoss;
}
