import type { Seat } from "#shared/schema/enums";
import type { ReplayDecisionAction } from "#shared/replays/analysis/ReplayDecisionAction";
import type { ReplayDecisionContext } from "#shared/replays/analysis/ReplayDecisionContext";
import type { ReplayDecisionQuality } from "#shared/replays/analysis/ReplayDecisionQuality";
import type { ReplayEvaluationFactor } from "#shared/replays/analysis/ReplayEvaluationFactor";

export interface ReplayRolloutFacts {
  ownSecurity: number;
  opponentSecurity: number;
  ownDigimon: number;
  opponentDigimon: number;
  ownHand: number;
  memory: number;
}

export interface ReplayDecisionOption {
  action: ReplayDecisionAction;
  cardId?: string;
  targetCardId?: string;
  cost?: number;
  text?: string;
  value?: number;
  margin?: number;
  samples?: number;
  factors?: Partial<Record<ReplayEvaluationFactor, number>>;
  facts?: ReplayRolloutFacts;
}

export interface ReplayDecisionPoint {
  frameIndex: number;
  inputIndex: number;
  seat: Seat;
  turn: number;
  context: ReplayDecisionContext;
  sourceCardId?: string;
  prompt?: string;
  options: ReplayDecisionOption[];
  chosen: number[];
  quality?: ReplayDecisionQuality;
  bestOption?: number;
  loss?: number;
  lossMargin?: number;
}
