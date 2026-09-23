import type { EffectContext } from "../EffectContext.js";
import { candidateLooseInstances } from "./targeting/loose.js";
import type { Cost, ZoneRef } from "@aegis/shared";

/** Keep Q5331's trash-first borrowed cost source consistent at choice and payment. */
export function borrowedProcessingCost(ctx: EffectContext, cost: Cost): Cost {
  if (ctx.borrowedEffectOverrides?.preferTrashCostSource !== true || cost.kind !== "place" || cost.target === undefined)
    return cost;
  const sourceZones = (Array.isArray(cost.target.from) ? cost.target.from : [cost.target.from]).filter(
    (zone): zone is ZoneRef => typeof zone === "string",
  );
  if (sourceZones.length !== 2 || !sourceZones.includes("hand") || !sourceZones.includes("trash")) return cost;
  const trashCandidates = candidateLooseInstances(ctx, cost.target, ["trash"]);
  const handCandidates = candidateLooseInstances(ctx, cost.target, ["hand"]);
  const preferredZones: ZoneRef[] =
    trashCandidates.length > 0 ? ["trash"] : handCandidates.length > 0 ? ["hand"] : sourceZones;
  if (
    preferredZones.length === sourceZones.length &&
    preferredZones.every((zone, index) => zone === sourceZones[index])
  )
    return cost;
  return { ...cost, target: { ...cost.target, from: preferredZones } };
}
