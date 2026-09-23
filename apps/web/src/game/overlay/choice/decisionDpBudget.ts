/** The combined current DP of every picked permanent, for decisions that cap a total DP. */
export function totalDP({
  picks,
  dpOf,
}: {
  picks: readonly string[];
  dpOf: (instanceId: string) => number | undefined;
}): number {
  return picks.reduce((total, instanceId) => total + (dpOf(instanceId) ?? 0), 0);
}

/**
 * Whether one more pick fits the DP budget; an existing pick always stays enabled so it can be
 * removed. The engine drops the whole selection when it exceeds `maxTotalDP`, so the client must
 * stop the pick rather than let the effect fizzle.
 */
export function dpBudgetAllowsCandidate({
  candidateInstanceId,
  picks,
  maxTotalDP,
  dpOf,
}: {
  candidateInstanceId: string;
  picks: readonly string[];
  maxTotalDP?: number;
  dpOf: (instanceId: string) => number | undefined;
}): boolean {
  if (maxTotalDP === undefined || picks.includes(candidateInstanceId)) return true;
  return totalDP({ picks: [...picks, candidateInstanceId], dpOf }) <= maxTotalDP;
}
