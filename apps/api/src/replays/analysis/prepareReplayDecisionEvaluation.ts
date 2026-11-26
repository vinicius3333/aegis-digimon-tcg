import type { Seat } from "@aegis/shared/schema/enums";
import { ReplayDecisionContext } from "@aegis/shared/replays/analysis/ReplayDecisionContext";
import { scoreCandidate } from "#api/bot/evaluate";
import { DEFAULT_BOT_PROFILE } from "#api/bot/profiles";
import { projectMainActionCandidate } from "#api/bot/projectMainActionCandidate";
import { trainingObservation } from "#api/bot/training/observation";
import type { TrainingWindow } from "#api/bot/training/policy";
import { buildBotView } from "#api/bot/view";
import type { GameEngine } from "#api/engine/GameEngine";
import type { GameEngineSnapshot } from "#api/engine/snapshot/GameEngineSnapshot";
import { snapshotGameEngine } from "#api/engine/snapshot/snapshotGameEngine";
import type { ReplayDecisionBuild } from "#api/replays/analysis/buildReplayDecisionPoint";

export type ReplayDecisionEvaluationJob = {
  snapshot: GameEngineSnapshot;
  root: TrainingWindow;
  seat: Seat;
  optionByCandidate: readonly number[];
  priors: readonly number[];
};

type Params = {
  engine: GameEngine;
  seat: Seat;
  build: ReplayDecisionBuild;
  candidateLimit: number;
};

export function prepareReplayDecisionEvaluation({
  engine,
  seat,
  build,
  candidateLimit,
}: Params): ReplayDecisionEvaluationJob | undefined {
  const { decision, actions, optionByAction } = build;
  const view = buildBotView(engine.state, seat);
  if (
    decision.context !== ReplayDecisionContext.MAIN.value ||
    actions === undefined ||
    optionByAction === undefined ||
    view === undefined
  ) {
    return undefined;
  }
  let snapshot: GameEngineSnapshot;
  try {
    snapshot = snapshotGameEngine({ engine });
  } catch {
    return undefined;
  }
  const chosenOption = decision.chosen[0];
  const scored = actions.map((action, index) => {
    const candidate = projectMainActionCandidate({ view, action });
    const score = candidate === undefined ? -Infinity : scoreCandidate(view, candidate, DEFAULT_BOT_PROFILE);
    return { index, option: optionByAction[index]!, score };
  });
  const candidates: number[] = [];
  const covered = new Set<number>();
  const chosen = scored.find((entry) => entry.option === chosenOption);
  for (const entry of [...(chosen === undefined ? [] : [chosen]), ...scored.sort((a, b) => b.score - a.score)]) {
    if (candidates.length >= candidateLimit || covered.has(entry.option)) {
      continue;
    }
    covered.add(entry.option);
    candidates.push(entry.index);
  }
  if (candidates.length < 2) {
    return undefined;
  }
  return {
    snapshot,
    seat,
    root: {
      observation: trainingObservation(engine.state, seat),
      kind: "main",
      selected: [],
      actions: candidates.map((index) => actions[index]!),
    },
    optionByCandidate: candidates.map((index) => optionByAction[index]!),
    priors: getPriors(candidates.map((index) => scored.find((entry) => entry.index === index)!.score)),
  };
}

function getPriors(scores: readonly number[]): number[] {
  const finite = scores.map((score) => (Number.isFinite(score) ? score : -20));
  const top = Math.max(...finite);
  const weights = finite.map((score) => Math.exp(Math.max(-20, Math.min(0, (score - top) / 8))));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}
