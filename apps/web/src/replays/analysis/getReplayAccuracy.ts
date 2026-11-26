import type { ReplayDecisionPoint } from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import type { Seat } from "@aegis/shared/schema/enums";

type Params = { decisions: readonly ReplayDecisionPoint[]; seat: Seat };
export type ReplayAccuracy = { accuracy: number; rated: number };

export function getReplayAccuracy({ decisions, seat }: Params): ReplayAccuracy | undefined {
  const losses = decisions.flatMap((decision) =>
    decision.seat === seat && decision.loss !== undefined ? [decision.loss * 100] : [],
  );
  if (losses.length === 0) {
    return undefined;
  }
  const total = losses.reduce(
    (sum, loss) => sum + Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669)),
    0,
  );
  return { accuracy: Math.round(total / losses.length), rated: losses.length };
}
