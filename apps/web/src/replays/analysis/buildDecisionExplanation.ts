import type { ReplayDecisionOption, ReplayDecisionPoint } from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import { ReplayEvaluationFactor } from "@aegis/shared/replays/analysis/ReplayEvaluationFactor";

export type ReplayFactorDifference = { factor: ReplayEvaluationFactor; difference: number };

export type ReplayDecisionExplanation = {
  chosen: ReplayDecisionOption;
  reference: ReplayDecisionOption;
  referenceIsBest: boolean;
  factors: ReplayFactorDifference[];
};

type Params = { decision: ReplayDecisionPoint };

const MAX_FACTORS = 3;
const MIN_DIFFERENCE = 0.01;
const FACTORS = Object.values(ReplayEvaluationFactor).map((entry) => entry.value);

export function buildDecisionExplanation({ decision }: Params): ReplayDecisionExplanation | undefined {
  const chosenIndex = decision.chosen[0];
  const chosen = chosenIndex === undefined ? undefined : decision.options[chosenIndex];
  if (chosen?.value === undefined || decision.bestOption === undefined) {
    return undefined;
  }
  const referenceIndex =
    decision.bestOption === chosenIndex ? findRunnerUp({ decision, chosenIndex }) : decision.bestOption;
  const reference = referenceIndex === undefined ? undefined : decision.options[referenceIndex];
  if (reference?.value === undefined) {
    return undefined;
  }
  const factors = FACTORS.map((factor) => ({
    factor,
    difference: (reference.factors?.[factor] ?? 0) - (chosen.factors?.[factor] ?? 0),
  }))
    .filter((entry) => Math.abs(entry.difference) >= MIN_DIFFERENCE)
    .sort((first, second) => Math.abs(second.difference) - Math.abs(first.difference))
    .slice(0, MAX_FACTORS);
  return { chosen, reference, referenceIsBest: referenceIndex === decision.bestOption, factors };
}

function findRunnerUp({ decision, chosenIndex }: { decision: ReplayDecisionPoint; chosenIndex: number }) {
  let runnerUp: number | undefined;
  decision.options.forEach((option, index) => {
    if (index === chosenIndex || option.value === undefined) {
      return;
    }
    if (runnerUp === undefined || option.value > decision.options[runnerUp]!.value!) {
      runnerUp = index;
    }
  });
  return runnerUp;
}
