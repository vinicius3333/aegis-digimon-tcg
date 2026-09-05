import type { Action, Target } from "@aegis/shared";
import type { EffectContext } from "../../EffectContext.js";
import { canPayCost } from "../costs.js";

/** Read-only target projection for a fixed self-placement cost that raises a level ceiling. */
export function targetAfterSelfPlacementCost(ctx: EffectContext, action: Action): Target | undefined {
  if (action.kind !== "Delete" || action.target?.filter === undefined) return undefined;
  const cost = action.cost;
  const comparison = action.target?.filter?.levelComparison;
  const scaling = comparison?.scaling;
  if (
    cost?.kind !== "place" ||
    cost.destination !== "digivolutionStack" ||
    cost.host !== "self" ||
    cost.faceDown !== true ||
    cost.target?.upTo === true ||
    typeof cost.target?.count !== "number" ||
    cost.target.count <= 0 ||
    !Number.isInteger(cost.target.count) ||
    action.additionalCost !== undefined ||
    (action.additionalCosts?.length ?? 0) > 0 ||
    (action.costOptions?.length ?? 0) > 0 ||
    (action.target.orFilters?.length ?? 0) > 0 ||
    (action.target.filter.orFilters?.length ?? 0) > 0 ||
    comparison?.op !== "lte" ||
    comparison.value === undefined ||
    scaling?.unit !== "selfFaceDownDigivolutionCards" ||
    !canPayCost(ctx, cost)
  )
    return undefined;
  const self = ctx.source.permanent();
  if (self === undefined) return undefined;
  const hidden = self.stack.filter((card) => card.faceUp !== true).length;
  const per = scaling.per > 0 ? scaling.per : 1;
  const increment = Math.max(scaling.floor ?? 0, Math.floor((hidden + cost.target.count) / per));
  return {
    ...action.target,
    filter: {
      ...action.target.filter,
      levelComparison: { ...comparison, value: comparison.value + increment, scaling: undefined },
    },
  };
}
