import type { Action } from "@aegis/shared";
import type { PlayReductionBound } from "../../context/replacements.js";

/** Certify a fixed result without executing or projecting its payment. */
export function fixedPlayReductionBound(action: Action | undefined): PlayReductionBound | undefined {
  if (action?.kind !== "Replacement" || action.event !== "wouldBePlayed") return undefined;
  const nested = action.actions?.length === 1 ? action.actions[0] : undefined;
  const modifier =
    action.mode === "reduceCost"
      ? action.actions?.length
        ? undefined
        : action
      : action.mode === undefined &&
          action.amount === undefined &&
          nested?.kind === "Replacement" &&
          nested.event === "wouldBePlayed" &&
          nested.mode === "reduceCost" &&
          !nested.actions?.length
        ? nested
        : undefined;
  if (modifier === undefined || typeof modifier.amount !== "number" || !Number.isFinite(modifier.amount))
    return undefined;
  for (const clause of [action, modifier]) {
    if (
      clause.scaling !== undefined ||
      clause.reduceCostScaling !== undefined ||
      clause.amountChoices !== undefined ||
      clause.amountFromPaidCost === true ||
      clause.additionalCost !== undefined ||
      clause.additionalCosts?.length
    )
      return undefined;
    if ("dynamicFrom" in clause) return undefined;
  }
  const cost = action.cost ?? modifier.cost;
  if (cost === undefined) return { maximumReduction: Math.max(0, modifier.amount), returnsSourceToDeck: false };
  // Other cost/target fields can select loose cards, detach a top or read bindings.
  // Certify only the permanent-return branch, including its legacy raw-text gate.
  if (
    cost.kind !== "return" ||
    cost.to !== "deckBottom" ||
    /\btrash\b/i.test(cost.raw ?? "") ||
    Object.keys(cost).some((key) => !["kind", "to", "target", "raw"].includes(key)) ||
    cost.target?.isSelf !== true ||
    cost.target.count !== 1 ||
    cost.target.filter.isSelfRef !== true ||
    Object.keys(cost.target).some((key) => !["filter", "count", "isSelf"].includes(key)) ||
    Object.keys(cost.target.filter).some((key) => key !== "isSelfRef")
  )
    return undefined;
  return { maximumReduction: Math.max(0, modifier.amount), returnsSourceToDeck: true };
}
