import type { Action } from "@aegis/shared";

/**
 * §15-7-5: an optional `by [cost], [effect]` processing condition may pay its
 * condition even when the following effect currently has no legal target.
 *
 * The explicit flag remains the compatibility escape hatch for cards whose
 * generated shape cannot express the condition. The unflagged compiled shape
 * covered here is the independent loose-card placement condition used by
 * EX7-011 and its EX9-010 peer; other activation costs retain their existing
 * target gate unless they opt in explicitly.
 */
export function allowsOptionalProcessingCostWithoutTarget(action: Action): boolean {
  if (action.kind === "RawUnparsed") return false;
  const placementSource =
    action.kind === "Delete" ? (action.cost?.kind === "place" ? action.cost.target?.from : undefined) : undefined;
  const hasLoosePlacementSource = Array.isArray(placementSource)
    ? placementSource.some((zone) => zone === "hand" || zone === "trash")
    : placementSource === "hand" || placementSource === "trash";
  return (
    action.allowCostWithoutTarget === true ||
    (action.kind === "Delete" &&
      action.optional === true &&
      action.abortOnDecline === true &&
      action.cost?.kind === "place" &&
      action.cost.destination === "digivolutionStack" &&
      action.cost.host === "self" &&
      hasLoosePlacementSource)
  );
}
