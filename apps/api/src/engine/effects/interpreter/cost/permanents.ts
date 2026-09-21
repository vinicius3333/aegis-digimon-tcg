import type { EffectContext } from "../../EffectContext.js";
import { runDigivolve } from "../actions/digivolve.js";
import { raiseDeletionDpCap, resolvePermanentTargets, topInstanceIds } from "../targeting/permanents.js";
import type { Action, Cost } from "@aegis/shared";

/**
 * Pay by moving a permanent from the breeding area into the battle area.
 */
export async function payMoveToBattleAreaCost(
  ctx: EffectContext,
  cost: Cost,
  out?: { paidCount: number },
): Promise<boolean> {
  if (cost.target !== undefined) {
    const ids = await resolvePermanentTargets(ctx, cost.target, {
      eligible: (id) => ctx.game.permanentById(id)?.inBreeding === true,
    });
    if (ids.length !== 1) return false;
    const id = ids[0]!;
    if (!(await ctx.fx.movePermanentZone(id, "toBattle"))) return false;
    if (cost.target.bindAs !== undefined) {
      ctx.selections ??= new Map();
      ctx.selections.set(cost.target.bindAs, id);
    }
    if (out) out.paidCount = 1;
    return true;
  }
  const self = ctx.source.permanent();
  return self !== undefined && (await ctx.fx.movePermanentZone(self.permanentId, "toBattle"));
}

/**
 * Pay by digivolving — the cost runs the digivolve action and reads its result.
 */
export async function payDigivolveCost(ctx: EffectContext, cost: Cost, out?: { paidCount: number }): Promise<boolean> {
  if (cost.target === undefined || cost.into === undefined) return false;
  const action: Extract<Action, { kind: "Digivolve" }> = {
    kind: "Digivolve",
    target: cost.target,
    into: cost.into,
    from: cost.from ?? ["hand", "trash"],
    payCost: true,
    ...(cost.costReduction === undefined ? {} : { costDelta: -cost.costReduction }),
  };
  await runDigivolve(ctx, action);
  const paid = ctx.lastDigivolveResult === true;
  if (paid && out) out.paidCount = 1;
  return paid;
}

/**
 * Pay by suspending permanents.
 */
export async function paySuspendCost(
  ctx: EffectContext,
  cost: Cost,
  out?: { paidCount: number },
  opts?: { deferSuspendTriggers?: boolean },
): Promise<boolean> {
  // "by suspending this Tamer" etc.
  // Do not let a prior suspend payment in the same effect resolution leak into
  // this cost's result when the current selection is empty or unpayable.
  ctx.lastSuspendedPermanentIds = [];
  const ids = cost.target
    ? await resolvePermanentTargets(ctx, cost.target, {
        eligible: (permanentId) => ctx.game.permanentById(permanentId)?.isSuspended === false,
      })
    : (() => {
        const self = ctx.source.permanent();
        return self !== undefined && !self.isSuspended ? [self.permanentId] : [];
      })();
  if (ids.length === 0) return false;
  // Effect targeting may return the available subset, but a fixed-count cost
  // must be paid in full before changing any state (EX8-074/Q3986).
  const requiredCount = cost.target?.count;
  if (cost.target?.upTo !== true && typeof requiredCount === "number" && ids.length !== requiredCount) {
    return false;
  }
  const suspendedIds = await ctx.fx.suspend(ids, {
    byEffectSeat: ctx.source.ownerSeat,
    byEffectCardId: ctx.source.cardId,
    deferTriggers: opts?.deferSuspendTriggers,
  });
  // A cost is atomic from the effect's point of view: selecting N candidates is
  // not enough when a restriction/replacement prevents one of them from actually
  // changing state. Bind the receipt returned by the primitive and reject an
  // incomplete payment (EX4-029/035/059 Alliance-style costs).
  if (suspendedIds.length !== ids.length) {
    ctx.lastSuspendedPermanentIds = suspendedIds;
    return false;
  }
  ctx.lastSuspendedPermanentIds = suspendedIds;
  // Record the suspended count so a `usePaidCount` scaling on the parent action can read it
  // ("for every Tamer this effect suspended" — BT17-041).
  if (out) out.paidCount = ids.length;
  return true;
}

/**
 * Pay by unsuspending permanents.
 */
export async function payUnsuspendCost(ctx: EffectContext, cost: Cost): Promise<boolean> {
  // "By unsuspending this Digimon" (BT14-054). Default target is the source permanent;
  // the cost can only be paid by a permanent that is currently SUSPENDED (documented behavior CanSuspend
  // inverse — you can't unsuspend an already-unsuspended permanent), so an unsuspended
  // source makes the optional-processing condition unperformable (Comprehensive Rules
  // §15-8-4-4-1) and the cost fails.
  const ids = cost.target
    ? await resolvePermanentTargets(ctx, cost.target)
    : (() => {
        const self = ctx.source.permanent();
        return self ? [self.permanentId] : [];
      })();
  const suspendedIds = ids.filter((id) => ctx.game.permanentById(id)?.isSuspended === true);
  if (suspendedIds.length === 0) return false;
  await ctx.fx.unsuspend(suspendedIds);
  return true;
}

/**
 * Pay by unsuspending permanents matching a printed name.
 */
export async function payUnsuspendNamedCost(ctx: EffectContext, cost: Cost): Promise<boolean> {
  const targets = cost.targets ?? [];
  if (targets.length === 0) return false;
  const ids: string[] = [];
  for (const target of targets) {
    const candidates = (await resolvePermanentTargets(ctx, target)).filter(
      (id) => ctx.game.permanentById(id)?.isSuspended === true,
    );
    if (candidates.length !== 1) return false;
    ids.push(candidates[0]!);
  }
  if (new Set(ids).size !== ids.length) return false;
  await ctx.fx.unsuspend(ids);
  return true;
}

/**
 * Pay by deleting one's own permanents.
 */
export async function payDeleteOwnCost(ctx: EffectContext, cost: Cost): Promise<boolean> {
  if (!cost.target) return false;
  const target = raiseDeletionDpCap(ctx, cost.target);
  const permanentIds = await resolvePermanentTargets(ctx, target, { allowDecline: ctx.costIsTheQuestion });
  if (permanentIds.length === 0) return false;
  const deletedTopInstanceIds = topInstanceIds(ctx, permanentIds);
  // Capture the deleted Digimon's level BEFORE removal so a
  // subsequent target filter's `levelComparison.relativeTo:"lastDeleted"` can bound on it
  // (BT8-107: "delete 1 of your Digimon to delete 1 of your opponent's with level <= it").
  let maxLevel: number | undefined;
  let maxDP: number | undefined;
  for (const id of permanentIds) {
    const perm = ctx.game.permanentById(id);
    const level = perm?.topCard ? ctx.game.definitionOf(perm.topCard).level : undefined;
    if (level !== undefined && level > 0) maxLevel = Math.max(maxLevel ?? 0, level);
    if (perm !== undefined) maxDP = Math.max(maxDP ?? 0, perm.currentDP);
  }
  if (maxLevel !== undefined) ctx.lastDeletedLevel = maxLevel;
  if (maxDP !== undefined) ctx.lastDeletedDP = maxDP;
  if (cost.bindResultAs !== undefined) {
    ctx.boundPlayed ??= new Map();
    // Bind the physical cards paid by the cost, consistently with every loose-card
    // payment. The permanents cease to exist after deletion, while downstream
    // `bindingContains` conditions inspect those cards in their destination zone.
    ctx.boundPlayed.set(cost.bindResultAs, new Set(deletedTopInstanceIds));
  }
  const deleted = await ctx.fx.deletePermanent(permanentIds, "byEffect", { mechanic: cost.mechanic });
  // A cost is paid only when every declared permanent actually leaves play. A
  // leave-play replacement (or another deletion prevention) may reject one of
  // the selected permanents; treating that attempt as paid would let the parent
  // effect proceed while the printed cost card remains on the field.
  return deleted === permanentIds.length;
}
