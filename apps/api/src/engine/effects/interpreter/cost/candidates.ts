import type { EffectContext } from "../../EffectContext.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { LooseCandidate } from "../targeting/loose.js";
import { candidatePermanents } from "../targeting/permanents.js";
import { canAssignDistinctColors, filterToDistinctColors } from "@aegis/shared";
import type { Cost, Filter, Permanent, Target } from "@aegis/shared";

/**
 * Candidate pools and selection binding shared by the cost payers.
 */

export function placeCostHostCandidates(ctx: EffectContext, host: Target): Permanent[] {
  const zone = host.filter.zone as string | readonly string[] | undefined;
  if (zone !== "breeding" && zone !== "breedingArea") {
    return candidatePermanents(ctx, host);
  }
  const { zone: _zone, ...filter } = host.filter;
  const candidates: Permanent[] = [];
  for (const seat of seatsForController(ctx, host.filter)) {
    const breeding = ctx.game.player(seat).breeding;
    if (breeding !== undefined && permanentMatchesFilter(ctx, breeding, filter, ctx.source)) candidates.push(breeding);
  }
  return candidates;
}

/**
 * Keep the selected permanents that satisfy the shared "different colors" rule. A
 * multicolor permanent contributes one assignable color, rather than occupying every
 * printed color (CR 4-24-2 / KB Q3048). The target resolver handles the board choice;
 * placement costs must revalidate its submitted ids before moving any permanent.
 */
export function distinctColorPermanentIds(ctx: EffectContext, permanentIds: readonly string[]): string[] {
  const selected = permanentIds
    .map((permanentId) => ctx.game.permanentById(permanentId))
    .filter((permanent): permanent is Permanent => permanent?.topCard !== undefined);
  const colorSets = selected.map((permanent) => ctx.game.definitionOf(permanent.topCard).colors);
  if (canAssignDistinctColors(colorSets)) return selected.map((permanent) => permanent.permanentId);
  return filterToDistinctColors(selected, (permanent) => ctx.game.definitionOf(permanent.topCard).colors).map(
    (permanent) => permanent.permanentId,
  );
}

/**
 * A return-cost target with `topCardOnly` names a permanent's visible top card, not a loose
 * digivolution-card instance. A stack card must exist beneath that top card so the permanent can
 * remain in play after payment (BT13-107 Q2359/Q2360).
 */
export function permanentTopReturnCostCandidates(ctx: EffectContext, target: Target): Permanent[] {
  return candidatePermanents(ctx, target).filter((permanent) => permanent.stack.length > 0);
}

/** Snapshot one loose-card payment for a downstream relative/name filter in this resolution. */
export function bindLooseCostSelection(
  ctx: EffectContext,
  ref: string | undefined,
  candidates: readonly LooseCandidate[],
  chosen: readonly string[],
): void {
  if (ref === undefined) return;
  const selected = candidates.find((candidate) => chosen.includes(candidate.instanceId));
  if (selected === undefined) return;
  const definition = ctx.game.definitionOf({ cardId: selected.cardId });
  ctx.selections ??= new Map();
  ctx.selections.set(ref, selected.instanceId);
  ctx.selectionFacts ??= new Map();
  ctx.selectionFacts.set(ref, {
    dp: definition.dp,
    level: definition.level,
    playCost: definition.playCost,
    name: definition.nameEn,
  });
}

/**
 * Conservative feasibility precheck for an action's cost, used to avoid prompting "you may…"
 * for an optional cost-bearing action the controller cannot actually perform, and (CR
 * §15-8-4-3-1) to refuse DECLARING an activation-type effect whose cost can't be paid. Returns
 * false ONLY when the cost is provably unpayable; unknown cost shapes return true so a payable
 * option is never hidden. Currently covers own-Digimon deletion, security-stack costs (BT15-003
 * "by trashing the top or bottom card of your security stack" with an empty stack),
 * `securityToHand`, `payMemory`, stacked-permanent visible-top return costs, and permanent
 * placement costs whose destination must differ from the selected source; extend as other
 * provable cases arise.
 */

/**
 * "By placing this card from the battle area face down under any of your [X] trait Tamers"
 * (ST23-15, ST24-15). The paid card is the SOURCE PERMANENT itself, not a loose card, so the
 * cost's `from: ["field"]` names the battle area rather than a hand/trash pool. KB Q6232 /
 * Q6194 confirm the placement — under a Tamer, at the bottom of the cards already there — is
 * how the clause is used, so the effect must be offered whenever the source is still in the
 * battle area and a legal host exists.
 */
export function isSelfFromFieldPlaceCost(cost: Cost): boolean {
  if (cost.kind !== "place" || cost.target === undefined) return false;
  // A cost compiled with the full permanent shape (`targetIsPermanent`, `destination`, `host`)
  // is already routed by the permanent-placement paths, which ST23-15 proves correct. This is
  // the fallback for the same printed cost compiled without them.
  if (cost.targetIsPermanent === true) return false;
  if (cost.target.isSelf !== true && cost.target.filter.isSelfRef !== true) return false;
  const from = cost.target.from;
  const zones: readonly string[] = from === undefined ? [] : typeof from === "string" ? [from] : from;
  return zones.some((zone) => zone === "field" || zone === "battleArea");
}

/** Hosts a {@link isSelfFromFieldPlaceCost} payment may place its source permanent under. */
export function selfFromFieldPlaceHosts(ctx: EffectContext, cost: Cost): Permanent[] {
  const self = ctx.source.permanent();
  if (self === undefined) return [];
  const underFilter = cost.underFilter ?? (cost.target as (Target & { underFilter?: Filter }) | undefined)?.underFilter;
  if (underFilter === undefined) return [];
  return candidatePermanents(ctx, {
    filter: underFilter,
    orFilters: cost.underOrFilters,
    count: 1,
  }).filter((permanent) => permanent.permanentId !== self.permanentId);
}
