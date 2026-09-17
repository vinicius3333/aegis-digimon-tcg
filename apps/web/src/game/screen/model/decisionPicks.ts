import { differentColorsAllowCandidate, distinctCardIdsAllow } from "../../decisionModel";

// CR 4-24-2: a multicolor card only needs one color no other pick uses, so the
// picks stay legal as long as a distinct color can still be assigned to each.
export function decisionAllowsPick(input: {
  decisionSelectable: ReadonlySet<string>;
  instanceId: string;
  picks: readonly string[];
  decisionInstanceColors: ReadonlyMap<string, readonly string[]>;
  decisionDifferentColors: boolean;
  decisionVisibleCardIds: ReadonlyMap<string, string | undefined>;
  decisionDistinctCardIds: boolean;
}): boolean {
  const {
    decisionSelectable,
    instanceId,
    picks,
    decisionInstanceColors,
    decisionDifferentColors,
    decisionVisibleCardIds,
    decisionDistinctCardIds,
  } = input;
  return (
    decisionSelectable.has(instanceId) &&
    differentColorsAllowCandidate(instanceId, picks, decisionInstanceColors, decisionDifferentColors) &&
    distinctCardIdsAllow(instanceId, picks, decisionVisibleCardIds, decisionDistinctCardIds)
  );
}

export function nextDecisionPicks(input: { picks: readonly string[]; instanceId: string; max: number }): string[] {
  const { picks, instanceId, max } = input;
  if (picks.includes(instanceId)) return picks.filter((id) => id !== instanceId);
  const keep = max > 1 ? picks.slice(-(max - 1)) : [];
  return [...keep, instanceId];
}
