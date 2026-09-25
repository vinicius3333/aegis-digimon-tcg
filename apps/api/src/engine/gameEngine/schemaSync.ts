import { ArraySchema } from "@colyseus/schema";
import type { AppFusionRoute, DigivolveRoute, DnaDigivolveRoute, Permanent } from "@aegis/shared";

export function sameNumericMap(left: ReadonlyMap<string, number>, right: ReadonlyMap<string, number>): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) if (right.get(key) !== value) return false;
  return true;
}

/**
 * Overwrite a synchronized string list only when its contents actually changed.
 *
 * The keyword and affordance projections run for every permanent and every hand card on every
 * continuous recompute — several times per player action — and a clear-and-refill marks the list
 * dirty even when the contents come back identical, costing the encoder a re-serialization each
 * pass. Same result, written only on a real change.
 */
// Projection lists are emptied with `clear()`, never `splice(0, length)`: @colyseus/schema 5 can
// keep a queued replace for a slot that a later same-tick splice removed, and the next patch then
// fails to encode that `undefined` element. `clear()` discards the list's queued changes.
export function replaceIfChanged(target: ArraySchema<string>, values: readonly string[]): void {
  if (target.length === values.length && values.every((value, index) => target[index] === value)) return;
  target.clear();
  for (const value of values) target.push(value);
}

export function replaceDigivolveRoutesIfChanged(
  target: ArraySchema<DigivolveRoute>,
  values: readonly DigivolveRoute[],
): void {
  const same =
    target.length === values.length &&
    target.every((route, index) => {
      const next = values[index];
      return (
        next !== undefined &&
        route.permanentId === next.permanentId &&
        route.alternateRequirementIndex === next.alternateRequirementIndex &&
        route.projectedCost === next.projectedCost
      );
    });
  if (same) return;
  target.clear();
  for (const value of values) target.push(value);
}

export function replaceDnaDigivolveRoutesIfChanged(
  target: ArraySchema<DnaDigivolveRoute>,
  values: readonly DnaDigivolveRoute[],
): void {
  const same =
    target.length === values.length &&
    target.every((route, index) => {
      const next = values[index];
      return (
        next !== undefined &&
        route.projectedCost === next.projectedCost &&
        route.materialPermanentIdsJson === next.materialPermanentIdsJson
      );
    });
  if (same) return;
  target.clear();
  for (const value of values) target.push(value);
}

export function replaceAppFusionRoutesIfChanged(
  target: ArraySchema<AppFusionRoute>,
  values: readonly AppFusionRoute[],
): void {
  const same =
    target.length === values.length &&
    target.every((route, index) => {
      const next = values[index];
      return (
        next !== undefined &&
        route.hostPermanentId === next.hostPermanentId &&
        route.linkedInstanceId === next.linkedInstanceId &&
        route.projectedCost === next.projectedCost
      );
    });
  if (same) return;
  target.clear();
  for (const value of values) target.push(value);
}

/** Reset one permanent's four projected attack affordances before a fresh sync pass. */
export function clearAttackProjection(perm: Permanent): void {
  perm.attackablePermanentIds.clear();
  perm.canAttackPlayer = false;
  perm.vortexAttackablePermanentIds.clear();
  perm.canVortexAttackPlayer = false;
}
