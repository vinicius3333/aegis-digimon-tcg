// Checking and paying an action's cost.

import { MEMORY_MIN } from "../../MemoryGauge.js";
import { requireOpponentAsk } from "../../decisions/decisionApi.js";
import type { EffectContext } from "../EffectContext.js";
import { canAttemptDigivolve, runDigivolve } from "./actions/digivolve.js";
import { definitionMatches } from "./matching/definition.js";
import { permanentMatchesFilter, seatsForController } from "./matching/permanent.js";
import { LooseCandidate, candidateLooseInstances, looseCardsInZone, pickLoose, zoneList } from "./targeting/loose.js";
import {
  candidatePermanents,
  effectiveTargetCount,
  resolvePermanentTargets,
  topInstanceIds,
} from "./targeting/permanents.js";
import {
  canAssignDistinctColors,
  CardKind,
  filterToDistinctColors,
  getCardDefinition,
  isDigimon,
  isTamer,
} from "@aegis/shared";
import type { Action, Cost, Filter, Permanent, Target, ZoneRef } from "@aegis/shared";

// ---------------------------------------------------------------------------
// Cost payment
// ---------------------------------------------------------------------------

function placeCostHostCandidates(ctx: EffectContext, host: Target): Permanent[] {
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
function distinctColorPermanentIds(ctx: EffectContext, permanentIds: readonly string[]): string[] {
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
function permanentTopReturnCostCandidates(ctx: EffectContext, target: Target): Permanent[] {
  return candidatePermanents(ctx, target).filter((permanent) => permanent.stack.length > 0);
}

/** Snapshot one loose-card payment for a downstream relative/name filter in this resolution. */
function bindLooseCostSelection(
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
export function canPayCost(ctx: EffectContext, cost: Cost): boolean {
  if (cost.kind === "raw") return false;
  if (cost.kind === "digivolve") {
    if (cost.target === undefined || cost.into === undefined) return false;
    return canAttemptDigivolve(ctx, {
      kind: "Digivolve",
      target: cost.target,
      into: cost.into,
      from: cost.from ?? ["hand", "trash"],
      payCost: true,
      ...(cost.costReduction === undefined ? {} : { costDelta: -cost.costReduction }),
    });
  }
  if (cost.kind === "trash" && cost.target?.from?.includes("hand") && cost.target.from.includes("digivolutionCards")) {
    const filter = { ...cost.target.filter, zone: undefined };
    const candidates = candidateLooseInstances(ctx, { ...cost.target, filter }, ["hand", "digivolutionCards"]);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return required > 0 && candidates.length >= required;
  }
  if (cost.kind === "trash" && cost.target?.filter.zone === "hand") {
    const candidates = candidateLooseInstances(ctx, cost.target, ["hand"]);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return cost.target.upTo === true ? true : required > 0 && candidates.length >= required;
  }
  if (
    cost.kind === "trash" &&
    cost.target?.filter.zone === "digivolutionCards" &&
    cost.target.filter.isSelfRef === true
  ) {
    const self = ctx.source.permanent();
    if (self === undefined) return false;
    const { zone: _zone, isSelfRef: _isSelfRef, controller: _controller, ...stackCardFilter } = cost.target.filter;
    const candidates = self.stack
      .filter((card) => definitionMatches(stackCardFilter, ctx.game.definitionOf(card)))
      .filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) !== false);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return required > 0 && candidates.length >= required;
  }
  if (cost.kind === "moveToBattleArea") {
    const self = ctx.source.permanent();
    return self !== undefined && self.inBreeding && ctx.game.player(ctx.source.ownerSeat).battleArea.length === 0;
  }
  if (cost.kind === "attack") {
    const self = ctx.source.permanent();
    return self !== undefined && (ctx.game.canDeclareAttack?.(self) ?? true);
  }
  if (cost.kind === "digivolveSelf") return ctx.source.permanent() !== undefined;
  if (cost.kind === "placeOwnTopAtStackBottom") {
    if (cost.target === undefined) return false;
    return candidatePermanents(ctx, cost.target).some((permanent) => permanent.stack.length > 0);
  }
  if (
    cost.kind === "place" &&
    cost.targetIsPermanent === true &&
    cost.target !== undefined &&
    cost.destination === "digivolutionStack" &&
    cost.host === "target" &&
    cost.underFilter !== undefined
  ) {
    const sourceIds = new Set(candidatePermanents(ctx, cost.target).map((permanent) => permanent.permanentId));
    if (sourceIds.size === 0) return false;
    const destinationIds = candidatePermanents(ctx, { filter: cost.underFilter, count: 1 }).map(
      (permanent) => permanent.permanentId,
    );
    return (
      destinationIds.length > 0 &&
      [...sourceIds].some((sourceId) => destinationIds.some((destinationId) => destinationId !== sourceId))
    );
  }
  if (cost.kind === "reveal") {
    if (cost.target === undefined) return false;
    const candidates = candidateLooseInstances(ctx, cost.target, ["hand"]);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return required > 0 && candidates.length >= required;
  }
  if (cost.kind === "compound") {
    if (cost.costs === undefined || cost.costs.length === 0) return false;
    return cost.costs.every((nested) => {
      if (nested.stopIfZero === true && nested.kind === "return" && nested.target !== undefined) {
        const candidates = candidateLooseInstances(ctx, nested.target, ["trash"]);
        return candidates.length > 0;
      }
      return canPayCost(ctx, nested);
    });
  }
  if (cost.kind === "trashBreeding") {
    const breeding = ctx.game.player(ctx.source.ownerSeat).breeding;
    if (breeding?.topCard === undefined) return false;
    const definition = ctx.game.definitionOf(breeding.topCard);
    return definition.kinds.includes(CardKind.Digimon) || definition.kinds.includes(CardKind.DigiEgg);
  }
  if (cost.kind === "trashBottomFaceDownUnderTamer") {
    const seat = cost.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
    const candidates = ctx.game.player(seat).battleArea.filter((permanent) => {
      if (permanent.topCard === undefined || !isTamer(ctx.game.definitionOf(permanent.topCard))) return false;
      return permanent.stack[0]?.faceUp === false;
    });
    return candidates.length >= (cost.count ?? 1);
  }
  if (cost.kind === "trashBottomFaceDownUnderDigimon") {
    const seat = cost.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
    const candidates = ctx.game.player(seat).battleArea.filter((permanent) => {
      if (permanent.topCard === undefined || !isDigimon(ctx.game.definitionOf(permanent.topCard))) return false;
      return permanent.stack[0]?.faceUp === false;
    });
    return candidates.length >= (cost.count ?? 1);
  }
  if (cost.kind === "deleteOwn") {
    if (cost.target === undefined) return false;
    const candidates = candidatePermanents(ctx, cost.target);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return required > 0 && (cost.target.upTo === true || candidates.length >= required);
  }
  if (cost.kind === "suspend") {
    const candidates = cost.target
      ? candidatePermanents(ctx, cost.target).filter((permanent) => !permanent.isSuspended)
      : (() => {
          const self = ctx.source.permanent();
          return self !== undefined && !self.isSuspended ? [self] : [];
        })();
    const required = cost.target?.count === "all" ? candidates.length : (cost.target?.count ?? 1);
    return required > 0 && candidates.length >= required;
  }
  if (
    cost.kind === "trash" &&
    cost.target &&
    (cost.target.filter.zone === "security" || /security stack/i.test(cost.raw ?? ""))
  ) {
    const seat =
      cost.target.filter.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
    const available = ctx.game.player(seat).security.length;
    const n = cost.target.count === "all" ? available : cost.target.count;
    return cost.target.upTo === true ? true : n > 0 && available >= n;
  }
  if (cost.kind === "return" && cost.target !== undefined && cost.target.filter.zone === "trash") {
    const candidates = candidateLooseInstances(ctx, cost.target, ["trash"]);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return cost.target.upTo === true
      ? candidates.length >= (cost.stopIfZero === true ? 1 : 0)
      : candidates.length >= required;
  }
  if (cost.kind === "return" && cost.target !== undefined && cost.target.filter.zone === "hand") {
    const candidates = candidateLooseInstances(ctx, cost.target, ["hand"]);
    const required =
      cost.leaveInZone !== undefined
        ? Math.max(0, candidates.length - cost.leaveInZone)
        : cost.target.count === "all"
          ? candidates.length
          : (cost.target.count ?? 1);
    return cost.target.upTo === true ? true : required > 0 && candidates.length >= required;
  }
  if (
    cost.kind === "return" &&
    cost.target !== undefined &&
    cost.target.filter.zone === "battleArea" &&
    cost.target.topCardOnly === true
  ) {
    const candidates = permanentTopReturnCostCandidates(ctx, cost.target);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return required > 0 && candidates.length >= required;
  }
  if (cost.kind === "return" && cost.target !== undefined && cost.target.filter.zone === "digivolutionCards") {
    const candidates = candidateLooseInstances(ctx, cost.target, ["digivolutionCards"]);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    if (required <= 0 || candidates.length < required) return false;
    if (cost.target.filter.sameHost !== true) return true;
    const byHost = new Map<string, number>();
    for (const candidate of candidates) {
      if (candidate.hostPermanentId !== undefined)
        byHost.set(candidate.hostPermanentId, (byHost.get(candidate.hostPermanentId) ?? 0) + 1);
    }
    return [...byHost.values()].some((count) => count >= required);
  }
  if (cost.kind === "return" && cost.target !== undefined && Array.isArray(cost.target.filter.zone)) {
    const zones = cost.target.filter.zone as ZoneRef[];
    const candidates = candidateLooseInstances(ctx, cost.target, zones);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return cost.target.upTo === true
      ? candidates.length >= (cost.stopIfZero === true ? 1 : 0)
      : required > 0 && candidates.length >= required;
  }
  if (cost.kind === "return" && cost.target?.filter.isSelfRef === true && ctx.source.permanent() === undefined) {
    return ctx.game.player(ctx.source.ownerSeat).trash.some((card) => card.instanceId === ctx.source.instanceId);
  }
  if (cost.kind === "return" && cost.target !== undefined && cost.target.filter.zone === undefined) {
    const candidates = candidatePermanents(ctx, cost.target);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return required > 0 && candidates.length >= required;
  }
  if (
    cost.kind === "trash" &&
    (cost.target?.filter.zone === "digivolutionCards" ||
      cost.target?.filter.zone === "digivolutionCardsOrLinkCards" ||
      (cost.target?.filter.isSelfRef === true &&
        (cost.target.filter.faceDown !== undefined || cost.target.filter.position !== undefined)))
  ) {
    if (cost.target.filter.isSelfRef === true) {
      const self =
        ctx.source.permanent() ??
        (ctx.trigger.attackerPermanentId !== undefined
          ? ctx.game.permanentById(ctx.trigger.attackerPermanentId)
          : undefined);
      if (self === undefined) return false;
      const candidates = self.stack.filter((card) => cost.target!.filter.faceDown !== true || !card.faceUp);
      const required = cost.target.count === "all" ? candidates.length : cost.target.count;
      return required > 0 && candidates.length >= required;
    }
    let candidates =
      cost.target.filter.zone === "digivolutionCardsOrLinkCards"
        ? candidateLooseInstances(
            ctx,
            { ...cost.target, filter: { ...cost.target.filter, zone: "digivolutionCards" } },
            ["digivolutionCards"],
          )
        : candidateLooseInstances(ctx, cost.target, ["digivolutionCards"]);
    if (cost.target.filter.zone === "digivolutionCardsOrLinkCards") {
      const linked: LooseCandidate[] = [];
      const { zone: _zone, controller: _controller, isSelfRef: _isSelfRef, ...linkedCardFilter } = cost.target.filter;
      for (const host of ctx.game.player(ctx.source.ownerSeat).battleArea) {
        for (const card of host.linked) {
          if (!definitionMatches(linkedCardFilter, getCardDefinition(card.cardId) as never)) continue;
          linked.push({
            instanceId: card.instanceId,
            cardId: card.cardId,
            ownerSeat: card.ownerSeat,
            hostPermanentId: host.permanentId,
          });
        }
      }
      candidates = [...candidates, ...linked];
    }
    const required = cost.target.count === "all" ? candidates.length : cost.target.count;
    if (required <= 0) return false;
    if (cost.target.filter.sameHost !== true) return candidates.length >= required;
    const byHost = new Map<string, LooseCandidate[]>();
    for (const candidate of candidates) {
      if (candidate.hostPermanentId === undefined) continue;
      const group = byHost.get(candidate.hostPermanentId) ?? [];
      group.push(candidate);
      byHost.set(candidate.hostPermanentId, group);
    }
    if (cost.target.filter.sameLevelPair !== true) {
      return [...byHost.values()].some((group) => group.length >= required);
    }
    return [...byHost.values()].some((group) => {
      const levels = new Map<number, number>();
      for (const candidate of group) {
        const level = getCardDefinition(candidate.cardId)?.level;
        if (level !== undefined) levels.set(level, (levels.get(level) ?? 0) + 1);
      }
      return [...levels.values()].some((count) => count >= required);
    });
  }
  if (cost.kind === "securityToHand") {
    return ctx.game.player(ctx.source.ownerSeat).security.length > 0;
  }
  if (cost.kind === "payMemory") {
    const n = cost.memory ?? 0;
    if (n <= 0) return true;
    // Mirrors MemoryGauge.canPay(seat, cost) = cost <= maxCostFor(seat), where
    // maxCostFor(seat) = memoryFor(seat) - MEMORY_MIN. GameAccess exposes only raw
    // GameState, not the MemoryGauge instance, so the seat-relative conversion (state.memory
    // is stored turn-relative) is reproduced here rather than duplicating the gauge itself.
    const seat = ctx.source.ownerSeat;
    const memoryForSeat = seat === ctx.game.state.turnSeat ? ctx.game.state.memory : -ctx.game.state.memory;
    return n <= memoryForSeat - MEMORY_MIN;
  }
  if (cost.kind === "place" && cost.target !== undefined) {
    if (cost.destination === "digivolutionStack" && cost.target.from?.includes("deck")) {
      const source =
        (ctx.trigger.attackerPermanentId !== undefined
          ? ctx.game.permanentById(ctx.trigger.attackerPermanentId)
          : undefined) ??
        ctx.source.permanent() ??
        ctx.game
          .player(ctx.source.ownerSeat)
          .battleArea.find(
            (p) => p.topCard?.instanceId === ctx.source.instanceId || p.permanentId === ctx.source.instanceId,
          );
      return ctx.game.player(ctx.source.ownerSeat).deck.length > 0 && source !== undefined;
    }
    // Self-restack costs operate on the source permanent's own evolution stack,
    // not on loose cards from hand. Keep this in sync with payCost's dedicated
    // placeOwnTopAtStackBottom route below so an available cost is actually
    // offered to the controller.
    if (cost.raw && /bottom digivolution card/i.test(cost.raw) && /\btop\s+(?:stacked\s+)?card/i.test(cost.raw)) {
      const selfPerm = ctx.source.permanent();
      return selfPerm !== undefined && selfPerm.stack.length > 0;
    }
    // A placement cost needs both halves to exist before an optional activation is
    // offered: enough matching loose cards in the declared source zones and a legal
    // destination host. EX3-066 otherwise asked to place a Cyborg with an empty
    // hand/trash, then opened a guaranteed no-op selection.
    if (cost.targetIsPermanent === true) {
      const candidates = candidatePermanents(ctx, cost.target);
      const selectedIds = candidates.map((permanent) => permanent.permanentId);
      const legalIds =
        cost.target.filter.differentColors === true ? distinctColorPermanentIds(ctx, selectedIds) : selectedIds;
      const required =
        cost.target.upTo === true ? 1 : cost.target.count === "all" ? 1 : effectiveTargetCount(ctx, cost.target);
      if (legalIds.length < required) return false;
      if (cost.destination === "security" || cost.destination === "battleArea") return true;
      if (cost.host !== null && typeof cost.host === "object") {
        return placeCostHostCandidates(ctx, { filter: cost.host.filter, count: cost.host.count }).length > 0;
      }
      if (cost.host === "target" && cost.underFilter !== undefined) {
        return candidatePermanents(ctx, { filter: cost.underFilter, count: 1 }).length > 0;
      }
      return ctx.source.permanent() !== undefined;
    }
    const zones: ZoneRef[] = (cost.target.from?.length ?? 0) > 0 ? (cost.target.from as ZoneRef[]) : ["hand"];
    const candidates = candidateLooseInstances(ctx, cost.target, zones);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    if (required <= 0 || (!cost.target.upTo && candidates.length < required)) return false;

    if (cost.destination === "security" || cost.destination === "battleArea") return true;
    if (cost.host === "triggerSource") {
      const triggerHostId =
        ctx.trigger.subjectPermanentId ?? ctx.trigger.attackerPermanentId ?? ctx.trigger.deletedPermanentId;
      return triggerHostId !== undefined && ctx.game.permanentById(triggerHostId) !== undefined;
    }
    if (cost.underFilter !== undefined) {
      return (
        candidatePermanents(ctx, {
          filter: cost.underFilter,
          orFilters: cost.underOrFilters,
          count: 1,
        }).length > 0
      );
    }
    if (cost.host !== null && typeof cost.host === "object") {
      // A preceding component of a compound cost may bind this host while payment is in
      // progress. Its loose-card half is already proven payable above; defer the exact host
      // check until payCost, after that binding exists (BT26-098's two named materials).
      if (cost.host.filter.boundRef !== undefined && ctx.selections?.has(cost.host.filter.boundRef) !== true)
        return true;
      return candidatePermanents(ctx, { filter: cost.host.filter, count: cost.host.count }).length > 0;
    }
    return (
      ctx.source.permanent() !== undefined ||
      (ctx.trigger.attackerPermanentId !== undefined &&
        ctx.game.permanentById(ctx.trigger.attackerPermanentId) !== undefined)
    );
  }
  return true;
}

/**
 * Pay an action's cost. Returns true if paid (or no cost); false if unpayable.
 * When `out` is supplied, records the number of cards actually paid (for a variable
 * "up to N" cost whose paid count drives the parent action's scaling — BT7-040).
 */
export async function relocateByEffect(
  ctx: EffectContext,
  destPermanentId: string,
  sourcePermanentId: string,
  opts?: { belowTop?: boolean; shedOwnCards?: boolean },
): Promise<boolean> {
  if (ctx.fx.relocatePermanentByEffect !== undefined) {
    return ctx.fx.relocatePermanentByEffect(destPermanentId, sourcePermanentId, opts);
  }
  // Minimal unit contexts predate the awaited wrapper. Preserve their recorder behavior;
  // production primitives always expose `relocatePermanentByEffect`.
  return ctx.fx.relocatePermanent(destPermanentId, sourcePermanentId, opts);
}

export async function payCost(
  ctx: EffectContext,
  cost: Cost,
  out?: { paidCount: number },
  opts?: { deferSuspendTriggers?: boolean },
): Promise<boolean> {
  const recordTrackedColors = (candidates: LooseCandidate[], chosen: readonly string[]) => {
    if (cost.trackColors === undefined) return;
    const colors = new Set<string>();
    for (const candidate of candidates) {
      if (!chosen.includes(candidate.instanceId)) continue;
      for (const color of ctx.game.definitionOf({ cardId: candidate.cardId } as never).colors) colors.add(color);
    }
    ctx.namedCounts ??= new Map();
    ctx.namedCounts.set(cost.trackColors, colors.size);
  };
  if (cost.kind === "place" && cost.destination === "digivolutionStack" && cost.target?.from?.includes("deck")) {
    const host =
      ctx.trigger.attackerPermanentId !== undefined
        ? ctx.game.permanentById(ctx.trigger.attackerPermanentId)
        : ctx.source.permanent();
    if (host === undefined || ctx.game.player(ctx.source.ownerSeat).deck.length === 0) return false;
    const placed = await ctx.fx.placeUnderFromDeck(host.permanentId, ctx.source.ownerSeat);
    if (placed !== undefined && out) out.paidCount = 1;
    return placed !== undefined;
  }
  switch (cost.kind) {
    case "moveToBattleArea": {
      const self = ctx.source.permanent();
      return self !== undefined && (await ctx.fx.movePermanentZone(self.permanentId, "toBattle"));
    }
    case "attack":
    case "digivolveSelf":
      return false;
    case "digivolve": {
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
    case "reveal": {
      if (cost.target === undefined) return false;
      const candidates = candidateLooseInstances(ctx, cost.target, ["hand"]);
      const count = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
      if (count <= 0 || candidates.length < count) return false;
      const chosen = await pickLoose(ctx, { ...cost.target, count }, candidates);
      if (chosen.length !== count) return false;
      // A reveal cost is a public hand reveal, and the exact cards paid by that cost
      // remain available to a following "that revealed card" disposition (EX4-023).
      // Keep the binding on the effect context instead of resolving the follow-up target
      // independently, which could choose a different same-level hand card.
      ctx.lastRevealedCards = chosen.flatMap((instanceId) => {
        const card = candidates.find((candidate) => candidate.instanceId === instanceId);
        if (card === undefined) return [];
        ctx.fx.revealCard(card.ownerSeat, card.cardId, ctx.source.cardId);
        return [{ instanceId: card.instanceId, cardId: card.cardId, ownerSeat: card.ownerSeat }];
      });
      return true;
    }
    case "compound": {
      if (cost.costs === undefined || cost.costs.length === 0) return false;
      if (!canPayCost(ctx, cost)) return false;
      if (cost.orderReturnedCards === true && cost.costs.every((nested) => nested.kind === "return")) {
        const chosen: string[] = [];
        for (const nested of cost.costs) {
          if (nested.target === undefined) return false;
          const candidates = candidateLooseInstances(ctx, nested.target, ["trash"]);
          const min = nested.target.upTo === true ? 0 : 1;
          const decisionCtx = ctx.activeTiming === "WhenAttacking" ? { ...ctx, activeTiming: "OnAllyAttack" } : ctx;
          const picked = await decisionCtx.ask.selectCards(decisionCtx, {
            candidates: candidates.map((candidate) => candidate.instanceId),
            min,
            max: Math.min(
              nested.target.count === "all" ? candidates.length : (nested.target.count ?? 1),
              candidates.length,
            ),
            visible: candidateLooseInstances(ctx, { filter: { zone: "trash" }, count: "all" }, ["trash"]).map(
              (candidate) => candidate.instanceId,
            ),
            visibleCards: candidateLooseInstances(ctx, { filter: { zone: "trash" }, count: "all" }, ["trash"]).map(
              (candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId }),
            ),
          });
          if (picked.length < min) return false;
          if (nested.stopIfZero === true && picked.length === 0) return false;
          chosen.push(...picked);
        }
        if (chosen.length > 1) {
          const decisionCtx = ctx.activeTiming === "WhenAttacking" ? { ...ctx, activeTiming: "OnAllyAttack" } : ctx;
          const ordered =
            (await decisionCtx.ask.orderCards?.(decisionCtx, {
              candidates: chosen,
              visibleCards: chosen.map((instanceId) => {
                const card = candidateLooseInstances(ctx, { filter: { zone: "trash" }, count: "all" }, ["trash"]).find(
                  (candidate) => candidate.instanceId === instanceId,
                );
                return { instanceId, cardId: card?.cardId ?? instanceId };
              }),
              destination: "deckBottom",
            })) ?? chosen;
          await ctx.fx.returnToDeck(ordered, { toTop: false });
        } else if (chosen.length === 1) {
          await ctx.fx.returnToDeck(chosen, { toTop: false });
        }
        return true;
      }
      for (const nested of cost.costs) {
        const nestedOut = { paidCount: 0 };
        if (!(await payCost(ctx, nested, nestedOut, opts))) return false;
        if (nested.stopIfZero === true && nestedOut.paidCount === 0) return false;
      }
      return true;
    }
    case "trashBreeding": {
      const breeding = ctx.game.player(ctx.source.ownerSeat).breeding;
      if (breeding?.topCard === undefined) return false;
      const definition = ctx.game.definitionOf(breeding.topCard);
      if (!definition.kinds.includes(CardKind.Digimon) && !definition.kinds.includes(CardKind.DigiEgg)) return false;
      const moved = await ctx.fx.trashBreedingPermanent?.(ctx.source.ownerSeat, {
        byEffectSeat: ctx.source.ownerSeat,
      });
      return (moved?.length ?? 0) > 0;
    }
    case "trashBottomFaceDownUnderTamer": {
      const seat = cost.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      const hosts = ctx.game.player(seat).battleArea.filter((permanent) => {
        if (permanent.topCard === undefined || !isTamer(ctx.game.definitionOf(permanent.topCard))) return false;
        return permanent.stack[0] !== undefined && !permanent.stack[0].faceUp;
      });
      const candidates = hosts.flatMap((host) => {
        const bottomFaceDown = host.stack[0]?.faceUp === false ? host.stack[0] : undefined;
        return bottomFaceDown === undefined ? [] : [{ hostId: host.permanentId, cardId: bottomFaceDown.instanceId }];
      });
      const count = cost.count ?? 1;
      if (candidates.length < count) return false;
      const chosen =
        candidates.length === count
          ? candidates
          : (
              await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((candidate) => candidate.cardId),
                min: count,
                max: count,
              })
            )
              .map((cardId) => candidates.find((candidate) => candidate.cardId === cardId)!)
              .filter(Boolean);
      if (chosen.length !== count) return false;
      const byHost = new Map<string, string[]>();
      for (const candidate of chosen)
        byHost.set(candidate.hostId, [...(byHost.get(candidate.hostId) ?? []), candidate.cardId]);
      let movedCount = 0;
      for (const [hostId, cardIds] of byHost) {
        const moved = await ctx.fx.trashDigivolutionCards(hostId, cardIds, {
          byEffectSeat: ctx.source.ownerSeat,
          byEffectCardId: ctx.source.cardId,
        });
        movedCount += moved.length;
      }
      return movedCount === count;
    }
    case "trashBottomFaceDownUnderDigimon": {
      const seat = cost.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      const candidates: { hostId: string; cardId: string }[] = [];
      for (const host of ctx.game.player(seat).battleArea) {
        if (host.topCard === undefined || !isDigimon(ctx.game.definitionOf(host.topCard))) continue;
        const bottomFaceDown = host.stack[0]?.faceUp === false ? host.stack[0] : undefined;
        if (bottomFaceDown !== undefined) {
          candidates.push({ hostId: host.permanentId, cardId: bottomFaceDown.instanceId });
        }
      }
      const count = cost.count ?? 1;
      if (candidates.length < count) return false;
      const chosen =
        candidates.length === count
          ? candidates
          : (
              await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((candidate) => candidate.cardId),
                min: count,
                max: count,
              })
            )
              .map((cardId) => candidates.find((candidate) => candidate.cardId === cardId)!)
              .filter(Boolean);
      if (chosen.length !== count) return false;
      let movedCount = 0;
      for (const candidate of chosen) {
        const moved = await ctx.fx.trashDigivolutionCards(candidate.hostId, [candidate.cardId], {
          byEffectSeat: ctx.source.ownerSeat,
        });
        movedCount += moved.length;
      }
      return movedCount === count;
    }
    case "suspend": {
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
    case "unsuspend": {
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
    case "unsuspendNamed": {
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
    case "trash": {
      if (cost.target?.from?.includes("hand") && cost.target.from.includes("digivolutionCards")) {
        const filter = { ...cost.target.filter, zone: undefined };
        const candidates = candidateLooseInstances(ctx, { ...cost.target, filter }, ["hand", "digivolutionCards"]);
        const want = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
        if (want <= 0 || candidates.length < want) return false;
        const chosen = await pickLoose(ctx, { ...cost.target, filter, count: want }, candidates);
        if (chosen.length !== want) return false;
        const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        if (out) out.paidCount = moved.length;
        return moved.length === want;
      }
      if (!cost.target) return false;
      // "By trashing (the top/bottom card of) your/their security stack" — a SECURITY-trash
      // compiler does not always tag the filter with zone:"security" (BT18-082's "by trashing
      // the bottom card of your security stack"), so the raw description is the fallback
      // detector; "bottom" in the raw selects the bottom end (fromTop:false).
      if (cost.target.filter.zone === "security" || /security stack/i.test(cost.raw ?? "")) {
        const seat =
          cost.target.filter.controller === "opponent"
            ? ctx.game.opponentOf(ctx.source.ownerSeat)
            : ctx.source.ownerSeat;
        let n = cost.target.count === "all" ? ctx.game.player(seat).security.length : cost.target.count;
        if (cost.target.upTo === true) {
          const cap = Math.min(n, ctx.game.player(seat).security.length);
          n = await ctx.ask.chooseOption(
            ctx,
            Array.from({ length: cap + 1 }, (_, count) => `Trash ${count} security`),
          );
          if (n === 0) {
            if (out) out.paidCount = 0;
            return true;
          }
        }
        if (n <= 0 || ctx.game.player(seat).security.length < n) return false;
        // "the top OR bottom card" is a CONTROLLER CHOICE, not a fixed end (BT15-003, BT8-044):
        // prompt per trashed card via the shared binary-choice helper (index 0 = top, 1 = bottom),
        // mirroring the place-cost "choice" path below. Detected via filter.position or the raw
        // text; without this the `bottom`-in-raw branch silently trashed the bottom with no prompt.
        const raw = cost.raw ?? "";
        const isChoice = /\btop\s+or\s+bottom\b|\bbottom\s+or\s+top\b/i.test(raw);
        if (isChoice) {
          for (let i = 0; i < n; i++) {
            const idx = await ctx.ask.chooseOption(ctx, ["top", "bottom"]);
            await ctx.fx.trashFromSecurity(seat, 1, { fromTop: idx === 0 });
          }
          return true;
        }
        // Honor filter.position when present; fall back to raw-text detection for prose-compiled IR.
        const isBottom =
          cost.target.filter.position === "bottom" ||
          (cost.target.filter.position === undefined && /bottom/i.test(raw));
        const moved = await ctx.fx.trashFromSecurity(seat, n, { fromTop: !isBottom });
        if (out) out.paidCount = moved.length;
        return true;
      }
      // "By trashing 1 of your Digimon's link cards" (BT25-073) — the cost trashes a ＜Link＞
      // card sitting in a HOST permanent's `linked` list. `filter.zone === "linked"` selects
      // the link cards; the remaining filter fields (kind/controller/isSelfRef) constrain the
      // HOST permanent, NOT the link card itself. Enumerate the matching hosts' link cards, let
      // the controller pick, then route through `ctx.fx.trash` — which removes each chosen card
      // from its host's `.linked` ArraySchema and moves it to the OWNER's trash (firing
      // whenLinkTrashed). An empty pool fails the cost (unmet optional-processing condition).
      if (cost.target.filter.zone === "linked" || cost.target.filter.zone === "digivolutionCardsOrLinkCards") {
        const linkTarget = cost.target;
        const { zone: _linkZone, ...hostFilter } = linkTarget.filter;
        const selfHost = linkTarget.filter.isSelfRef === true;
        const hosts: Permanent[] = [];
        if (selfHost) {
          const self = ctx.source.permanent();
          if (self !== undefined) hosts.push(self);
        } else if (linkTarget.filter.zone === "digivolutionCardsOrLinkCards") {
          for (const seat of seatsForController(ctx, linkTarget.filter)) {
            for (const permanent of ctx.game.player(seat).battleArea) {
              if (
                permanent.topCard !== undefined &&
                getCardDefinition(permanent.topCard.cardId)?.kinds.includes(CardKind.Digimon)
              ) {
                hosts.push(permanent);
              }
            }
          }
        } else {
          for (const seat of seatsForController(ctx, linkTarget.filter)) {
            for (const permanent of ctx.game.player(seat).battleArea) {
              if (permanentMatchesFilter(ctx, permanent, hostFilter, ctx.source)) hosts.push(permanent);
            }
          }
        }
        const candidates: LooseCandidate[] = [];
        if (cost.target.filter.zone === "digivolutionCardsOrLinkCards") {
          candidates.push(
            ...candidateLooseInstances(
              ctx,
              { ...cost.target, filter: { ...cost.target.filter, zone: "digivolutionCards" } },
              ["digivolutionCards"],
            ),
          );
        }
        for (const host of hosts) {
          for (const c of host.linked) {
            candidates.push({
              instanceId: c.instanceId,
              cardId: c.cardId,
              ownerSeat: c.ownerSeat,
              hostPermanentId: host.permanentId,
            });
          }
        }
        const n = linkTarget.count === "all" ? candidates.length : linkTarget.count;
        if (n <= 0 || candidates.length < n) return false;
        const chosen = await pickLoose(
          ctx,
          {
            ...linkTarget,
            count: n,
            filter: { ...linkTarget.filter, zone: undefined },
          },
          candidates,
        );
        if (chosen.length < n) return false;
        const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        const movedIds = new Set(moved.map((card) => card.instanceId));
        if (moved.length !== n || chosen.some((instanceId) => !movedIds.has(instanceId))) return false;
        if (out) out.paidCount = moved.length;
        return true;
      }
      // "By trashing N of this Digimon's digivolution cards" (BT17-057, EX10-055) — an
      // all-or-nothing cost paid from the SOURCE permanent's digivolution stack. Take N
      // stack cards (from the top of the stack); requires at least N to be present.
      // When `isSelfRef` is set, restrict to the source's OWN stack (Digi-Burst etc.).
      // Without `isSelfRef` (e.g. BT21-054 "any of your Digimon's digivolution cards"),
      // scan all controller permanents via candidateLooseInstances instead.
      const trashStackZone = cost.target.filter.zone;
      const trashesStackCards =
        trashStackZone === "digivolutionCards" ||
        (Array.isArray(trashStackZone) && trashStackZone.includes("digivolutionCards")) ||
        (cost.target.filter.isSelfRef === true &&
          (cost.target.filter.faceDown !== undefined || cost.target.filter.position !== undefined)) ||
        cost.target.from?.includes("digivolutionCards") === true ||
        trashStackZone === "underMyTamers" ||
        trashStackZone === "underTamers" ||
        trashStackZone === "underTamer" ||
        trashStackZone === "underThisTamer" ||
        trashStackZone === "digivolutionCardsUnderTamers";
      if (trashesStackCards) {
        const boundHostRef = (cost.target.filter as Filter & { boundTo?: string }).boundTo;
        if (boundHostRef !== undefined) {
          const hostId = ctx.selections?.get(boundHostRef);
          const host = hostId === undefined ? undefined : ctx.game.permanentById(hostId);
          if (host === undefined) return false;
          const { zone: _zone, boundTo: _boundTo, ...cardFilter } = cost.target.filter as Filter & { boundTo?: string };
          const candidates = host.stack
            .filter((card) => definitionMatches(cardFilter, ctx.game.definitionOf(card)))
            .filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) !== false)
            .map((card) => ({
              instanceId: card.instanceId,
              cardId: card.cardId,
              ownerSeat: card.ownerSeat,
              hostPermanentId: host.permanentId,
            }));
          const n = cost.target.count === "all" ? candidates.length : cost.target.count;
          if (n <= 0 || candidates.length < n) return false;
          const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
          if (chosen.length < n) return false;
          const moved = await ctx.fx.trashDigivolutionCards(host.permanentId, chosen, {
            byEffectSeat: ctx.source.ownerSeat,
            byEffectCardId: ctx.source.cardId,
          });
          if (moved.length !== n) return false;
          if (out) out.paidCount = moved.length;
          return true;
        }
        if (cost.target.filter.isSelfRef === true) {
          const self = ctx.source.permanent();
          if (self === undefined) return false;
          const isDigiBurst = /Digi-?Burst/i.test(cost.raw ?? "");
          // "<Digi-Burst up to N>" (BT7-040): the controller chooses how many (1..N, capped at
          // the stack size) to trash; at least 1 is required to activate (KB Q1569). The paid
          // count is recorded so the parent action can scale by it (-3000 per card trashed).
          if (cost.target.upTo === true) {
            const candidateIds = self.stack
              .filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) !== false)
              .map((card) => card.instanceId);
            const max = cost.target.count === "all" ? candidateIds.length : cost.target.count;
            const cap = Math.min(max, candidateIds.length);
            if (cap < 1) return false;
            const chosen = await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: 1, max: cap });
            // Defensive guard: `min: 1` already makes the cost mandatory once activated
            // (KB Q1569), so a decision layer honoring the contract cannot return fewer
            // than 1 here. If it does, treat it as an unpaid cost (consistent with the
            // fixed-count path) rather than trusting the out-of-contract response.
            if (chosen.length < 1) return false;
            const moved = await ctx.fx.trashDigivolutionCards(self.permanentId, chosen, {
              byEffectSeat: ctx.source.ownerSeat,
              byEffectCardId: ctx.source.cardId,
              isDigiBurst,
            });
            if (moved.length !== chosen.length) return false;
            if (out) out.paidCount = moved.length;
            return true;
          }
          // Redirect BEFORE computing which cards to take (KB BT10-084 Q2006: "by choosing 5
          // digivolution cards of THIS Digimon" — this exact cost shape — gets redirected when
          // `self` is a DIFFERENT Digimon than the reacting one). `n`/`stackIds` are then
          // recomputed against the (possibly redirected) host, preserving the paid count.
          const redirected = await ctx.fx.redirectDigivolutionTrashHosts([self.permanentId]);
          const hostId = redirected[0] ?? self.permanentId;
          const host = hostId === self.permanentId ? self : ctx.game.permanentById(hostId);
          if (host === undefined) return false;
          const n = cost.target.count === "all" ? host.stack.length : cost.target.count;
          if (n <= 0) return false;
          const {
            zone: _zone,
            isSelfRef: _isSelfRef,
            controller: _controller,
            ...stackCardFilter
          } = cost.target.filter;
          let eligible: LooseCandidate[] = Array.from(host.stack)
            .filter((card) => cost.target!.filter.faceDown !== true || !card.faceUp)
            .filter((card) => definitionMatches(stackCardFilter, ctx.game.definitionOf(card)))
            .filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) !== false)
            .map((card) => ({
              instanceId: card.instanceId,
              cardId: card.cardId,
              ownerSeat: card.ownerSeat,
              hostPermanentId: host.permanentId,
            }));
          // "Trash 2 cards of the same level" (BT9-024): don't expose an isolated-level
          // stack card as a payable UI candidate. Multiple valid level groups remain visible,
          // but every offered card now belongs to at least one legal pair.
          const requiresSameLevelPair =
            (cost.target.filter as Filter & { sameLevelPair?: boolean }).sameLevelPair === true;
          if (requiresSameLevelPair) {
            const levelCounts = new Map<number, number>();
            for (const card of eligible) {
              const level = getCardDefinition(card.cardId)?.level;
              if (level !== undefined) levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
            }
            eligible = eligible.filter((card) => {
              const level = getCardDefinition(card.cardId)?.level;
              return level !== undefined && (levelCounts.get(level) ?? 0) >= 2;
            });
          }
          if (eligible.length < n) return false;
          const stackIds =
            eligible.length === n
              ? eligible.map((card) => card.instanceId)
              : await pickLoose(ctx, { ...cost.target, count: n }, eligible);
          if (stackIds.length < n) return false;
          // Candidate filtering alone cannot prevent a hostile client from mixing cards from
          // two different valid level groups. Revalidate the submitted payment server-side.
          if (requiresSameLevelPair) {
            const selectedLevels = stackIds.map((id) => {
              const card = host.stack.find(({ instanceId }) => instanceId === id);
              return card === undefined ? undefined : ctx.game.definitionOf(card).level;
            });
            if (selectedLevels.some((level) => level === undefined) || new Set(selectedLevels).size !== 1) return false;
          }
          const moved = await ctx.fx.trashDigivolutionCards(host.permanentId, stackIds, {
            byEffectSeat: ctx.source.ownerSeat,
            byEffectCardId: ctx.source.cardId,
            isDigiBurst,
          });
          if (moved.length !== n) return false;
          if (out) out.paidCount = n;
          return true;
        }
        // "By trashing N card(s) from ANY of your Digimon's digivolution cards" (BT21-054),
        // or from under your Tamers (BT25-029): scan stacked-card zones, honoring host/zone
        // filters. Route through trashDigivolutionCards so stack-trash watchers fire.
        // "all" means "pay with every matching candidate", i.e. n = candidates.length —
        // NOT Infinity (a finite pool is never >= Infinity, which made every "all"-shaped
        // cost unpayable; engine-audit finding 6). An empty pool is unpayable outright
        // (n <= 0), matching the isSelfRef branch above.
        const zones = trashStackZone === undefined ? ["digivolutionCards" as const] : zoneList(trashStackZone);
        let candidates = candidateLooseInstances(ctx, cost.target, zones);
        const n = cost.target.count === "all" ? candidates.length : cost.target.count;
        if (n <= 0 || candidates.length < n) return false;
        if (cost.target.filter.sameHost === true) {
          const byHost = new Map<string, LooseCandidate[]>();
          for (const candidate of candidates) {
            if (candidate.hostPermanentId === undefined) continue;
            const group = byHost.get(candidate.hostPermanentId) ?? [];
            group.push(candidate);
            byHost.set(candidate.hostPermanentId, group);
          }
          const requiresSameLevelPair = cost.target.filter.sameLevelPair === true;
          const eligibleHosts = [...byHost.entries()].filter(([, group]) => {
            if (!requiresSameLevelPair) return group.length >= n;
            const levels = new Map<number, number>();
            for (const candidate of group) {
              const level = getCardDefinition(candidate.cardId)?.level;
              if (level !== undefined) levels.set(level, (levels.get(level) ?? 0) + 1);
            }
            return [...levels.values()].some((count) => count >= n);
          });
          if (eligibleHosts.length === 0) return false;
          const hostId =
            eligibleHosts.length === 1
              ? eligibleHosts[0]![0]
              : (
                  await ctx.ask.chooseTargets(ctx, {
                    candidates: eligibleHosts.map(([id]) => id),
                    min: 1,
                    max: 1,
                  })
                )[0];
          if (hostId === undefined) return false;
          candidates = byHost.get(hostId) ?? [];
          if (requiresSameLevelPair) {
            const levels = new Map<number, number>();
            for (const candidate of candidates) {
              const level = getCardDefinition(candidate.cardId)?.level;
              if (level !== undefined) levels.set(level, (levels.get(level) ?? 0) + 1);
            }
            candidates = candidates.filter((candidate) => {
              const level = getCardDefinition(candidate.cardId)?.level;
              return level !== undefined && (levels.get(level) ?? 0) >= n;
            });
          }
          if (cost.bindHostAs !== undefined) {
            ctx.selections ??= new Map();
            ctx.selections.set(cost.bindHostAs, hostId);
          }
        }
        const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
        if (chosen.length < n) return false;
        if (cost.target.filter.sameLevelPair === true) {
          const selectedLevels = chosen.map((id) => {
            const candidate = candidates.find((entry) => entry.instanceId === id);
            return candidate === undefined ? undefined : getCardDefinition(candidate.cardId)?.level;
          });
          if (selectedLevels.some((level) => level === undefined) || new Set(selectedLevels).size !== 1) return false;
        }
        const byHost = new Map<string, string[]>();
        const loose: string[] = [];
        for (const id of chosen) {
          const entry = candidates.find((c) => c.instanceId === id);
          if (entry?.hostPermanentId === undefined) {
            loose.push(id);
            continue;
          }
          const bucket = byHost.get(entry.hostPermanentId) ?? [];
          bucket.push(id);
          byHost.set(entry.hostPermanentId, bucket);
        }
        if (loose.length === 0) {
          const selections = [...byHost].flatMap(([hostPermanentId, instanceIds]) =>
            instanceIds.map((instanceId) => ({ hostPermanentId, instanceId })),
          );
          if (ctx.fx.trashDigivolutionCardsAtomic !== undefined) {
            const moved = await ctx.fx.trashDigivolutionCardsAtomic(selections, n, {
              byEffectSeat: ctx.source.ownerSeat,
            });
            if (moved.length !== n) return false;
          } else {
            // Lightweight/internal primitive implementations may predate the atomic seam.
            // Preserve the per-host watcher path for them; production uses the atomic
            // operation above so leave replacements cannot partially pay the cost.
            let movedCount = 0;
            for (const [hostId, ids] of byHost) {
              const moved = await ctx.fx.trashDigivolutionCards(hostId, ids, {
                byEffectSeat: ctx.source.ownerSeat,
              });
              movedCount += moved.length;
            }
            if (movedCount !== n) return false;
          }
        } else {
          if (chosen.some((instanceId) => ctx.fx.canTrashDigivolutionCard?.(instanceId) === false)) return false;
          for (const [hostId, ids] of byHost) {
            await ctx.fx.trashDigivolutionCards(hostId, ids, { byEffectSeat: ctx.source.ownerSeat });
          }
          await ctx.fx.trash(loose, { byEffectSeat: ctx.source.ownerSeat });
        }
        if (out) out.paidCount = chosen.length;
        return true;
      }
      // "By trashing the top N cards of your deck" (P-011): deck cards are loose
      // instances, so they cannot go through the permanent-target fallback below.
      // The top is deterministic and the cost is all-or-nothing.
      if (cost.target.filter.zone === "deck") {
        const seat =
          cost.target.filter.controller === "opponent"
            ? ctx.game.opponentOf(ctx.source.ownerSeat)
            : ctx.source.ownerSeat;
        const deck = ctx.game.player(seat).deck;
        const n = cost.target.count === "all" ? deck.length : cost.target.count;
        if (n <= 0 || deck.length < n) return false;
        const topCards = Array.from(deck).slice(0, n);
        const chosen = topCards.map((card) => card.instanceId);
        const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        const movedIds = new Set(moved.map((card) => card.instanceId));
        const milled = topCards.filter((card) => movedIds.has(card.instanceId));
        if (milled.length > 0) {
          await ctx.fx.fireOnDiscardLibrary(
            seat,
            milled.map((card) => card.instanceId),
          );
          for (const card of milled) {
            await ctx.fx.fireWhenTrashedFromDeck(card.cardId, card.instanceId, ctx.source.cardId);
          }
        }
        if (out) out.paidCount = moved.length;
        return true;
      }
      // "By trashing N card(s) from your hand" (BT24-088 OnPlay): resolve
      // loose hand cards matching the cost's filter. Hand costs are
      // detected via an explicit zone:"hand" filter or the raw description.
      const isHandCost = cost.target.filter.zone === "hand" || /(?:from|in) (?:your|their) hand/i.test(cost.raw ?? "");
      if (isHandCost) {
        const handTarget: Target = { ...cost.target, filter: { ...cost.target.filter, zone: "hand" } };
        const candidates = candidateLooseInstances(ctx, handTarget, ["hand"]);
        if (candidates.length === 0) return false;
        // "By trashing up to N cards from your hand" (EX6-060): the controller chooses
        // how many (1..N, capped at the matching hand cards); the paid count drives the
        // parent action's scaling, mirroring the upTo Digi-Burst branch above.
        if (cost.target.upTo === true) {
          const max = cost.target.count === "all" ? candidates.length : cost.target.count;
          const cap = Math.min(max, candidates.length);
          if (cap < 1) return false;
          const candidateIds = candidates.map((c) => c.instanceId);
          const allowZero = (cost.target as Target & { allowZero?: boolean }).allowZero === true;
          const chosen = await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: allowZero ? 0 : 1, max: cap });
          if (chosen.length < 1) return false;
          const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
          ctx.lastTrashedCards = moved.map((card) => ({
            instanceId: card.instanceId,
            cardId: card.cardId,
            dp: ctx.game.definitionOf(card).dp ?? 0,
          }));
          if (cost.storeAs !== undefined && moved.length > 0) {
            const level = ctx.game.definitionOf(moved[0]!).level;
            if (level !== undefined && level > 0) {
              ctx.namedCounts ??= new Map();
              ctx.namedCounts.set(cost.storeAs, level);
            }
          }
          if (out) out.paidCount = moved.length;
          if (moved.length >= 1)
            bindLooseCostSelection(
              ctx,
              cost.bindResultAs,
              candidates,
              moved.map((card) => card.instanceId),
            );
          return moved.length >= 1;
        }
        const want = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
        if (candidates.length < want) return false;
        const chosen = await pickLoose(ctx, { ...handTarget, count: want }, candidates);
        if (chosen.length < want) return false;
        const moved = await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        ctx.lastTrashedCards = moved.map((card) => ({
          instanceId: card.instanceId,
          cardId: card.cardId,
          dp: ctx.game.definitionOf(card).dp ?? 0,
        }));
        if (cost.storeAs !== undefined && moved.length > 0) {
          const level = ctx.game.definitionOf(moved[0]!).level;
          if (level !== undefined && level > 0) {
            ctx.namedCounts ??= new Map();
            ctx.namedCounts.set(cost.storeAs, level);
          }
        }
        if (out) out.paidCount = moved.length;
        if (moved.length === want)
          bindLooseCostSelection(
            ctx,
            cost.bindResultAs,
            candidates,
            moved.map((card) => card.instanceId),
          );
        return moved.length === want;
      }
      // A security-/hand-/trash-resident effect can pay "by trashing this card" while its
      // source is a loose instance rather than a permanent (ST22-10's face-up security
      // replacement). Permanent target resolution cannot see that source, so route the exact
      // self instance through the zone-agnostic trash primitive and require an actual move.
      if (cost.target.filter.isSelfRef === true && ctx.source.permanent() === undefined) {
        const moved = await ctx.fx.trash([ctx.source.instanceId], { byEffectSeat: ctx.source.ownerSeat });
        if (out) out.paidCount = moved.length;
        return moved.some((card) => card.instanceId === ctx.source.instanceId);
      }
      const ids = topInstanceIds(ctx, await resolvePermanentTargets(ctx, cost.target));
      if (ids.length === 0) return false;
      await ctx.fx.trash(ids, { byEffectSeat: ctx.source.ownerSeat });
      return true;
    }
    case "return": {
      if (!cost.target) return false;
      const returnToTop = async (): Promise<boolean> => {
        if (cost.to === "deckTopOrBottom") {
          return (await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"])) === 0;
        }
        if (cost.to === "deckTop") return true;
        return /\bto the top\b/i.test(cost.raw ?? "");
      };
      // Trash effects can pay "by returning this card" while the source is a loose card,
      // not a battle-area permanent. Resolve that exact physical instance before the generic
      // permanent-target branch (BT23-097).
      if (cost.target.filter.isSelfRef === true && ctx.source.permanent() === undefined) {
        const inTrash = ctx.game
          .player(ctx.source.ownerSeat)
          .trash.some((card) => card.instanceId === ctx.source.instanceId);
        if (!inTrash || cost.to === "hand") return false;
        await ctx.fx.returnToDeck([ctx.source.instanceId], { toTop: await returnToTop() });
        if (out) out.paidCount = 1;
        return true;
      }
      if (cost.target.filter.zone === "hand") {
        const candidates = candidateLooseInstances(ctx, cost.target, ["hand"]);
        const n =
          cost.leaveInZone !== undefined
            ? Math.max(0, candidates.length - cost.leaveInZone)
            : cost.target.count === "all"
              ? candidates.length
              : cost.target.count;
        if (n <= 0 || candidates.length < n) return false;
        let chosen = await pickLoose(
          ctx,
          { ...cost.target, count: n },
          candidates,
          undefined,
          ctx.ask,
          cost.selectionHidden === true ? [] : undefined,
        );
        if (chosen.length < n) return false;
        if (cost.ownerInspectsSelection === true) {
          const selectedCards = candidates
            .filter((candidate) => chosen.includes(candidate.instanceId))
            .map((candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId }));
          await requireOpponentAsk(ctx).selectCards(ctx, {
            candidates: [],
            min: 0,
            max: 0,
            visible: chosen,
            visibleCards: selectedCards,
          });
        }
        if (cost.orderReturnedCards === true && chosen.length > 1) {
          chosen =
            (await ctx.ask.orderCards?.(ctx, {
              candidates: chosen,
              ...(cost.selectionHidden === true
                ? {}
                : {
                    visibleCards: candidates
                      .filter((candidate) => chosen.includes(candidate.instanceId))
                      .map((candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId })),
                  }),
              destination: cost.to === "deckTop" ? "deckTop" : "deckBottom",
            })) ?? chosen;
        }
        // A hand card "returned" to hand moves nowhere, so such a cost is unpayable rather
        // than a silent deck return.
        if (cost.to === "hand") return false;
        await ctx.fx.returnToDeck(chosen, { toTop: await returnToTop() });
        if (out) out.paidCount = chosen.length;
        return true;
      }
      // Combined loose-zone return cost (for example, trash OR digivolution cards). Select
      // all-or-nothing from the pooled candidates; the explicit destination controls whether
      // the cards go to the regular deck top or the legacy Digi-Egg deck bottom.
      if (Array.isArray(cost.target.filter.zone) && cost.target.filter.zone.length > 1) {
        const zones = cost.target.filter.zone as ZoneRef[];
        const candidates = candidateLooseInstances(ctx, cost.target, zones);
        const n = cost.target.count === "all" ? candidates.length : cost.target.count;
        if (n <= 0 || candidates.length < n) return false;
        const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
        if (chosen.length < n) return false;
        if (await returnToTop()) await ctx.fx.returnToDeck(chosen, { toTop: true });
        else await ctx.fx.returnToEggDeck?.(chosen);
        if (out) out.paidCount = chosen.length;
        return true;
      }
      if (cost.target.filter.zone === "battleArea" && cost.target.topCardOnly === true) {
        // This printed form names the visible top card of a permanent, but only its underlying
        // stack card is retained. Resolve the permanent with the stack-length eligibility before
        // selecting it, then detach its top via the shared primitive seam.
        const permanentIds = await resolvePermanentTargets(ctx, cost.target, {
          eligible: (permanentId) => (ctx.game.permanentById(permanentId)?.stack.length ?? 0) > 0,
        });
        const n = cost.target.count === "all" ? permanentIds.length : cost.target.count;
        if (n <= 0 || permanentIds.length < n) return false;
        const topIds = topInstanceIds(ctx, permanentIds);
        if (topIds.length < n) return false;
        const moved = await ctx.fx.returnToHand(topIds, {
          detachPermanentTop: true,
          byEffectSeat: ctx.source.ownerSeat,
        });
        if (out) out.paidCount = moved.length;
        return moved.length >= n;
      }
      // Stack-card return cost ("by returning 2 [Vemmon] from that Digimon's digivolution
      // cards to the bottom of the deck", BT18-092): these are loose stack instances, not
      // battle-area permanent top cards. Resolve them through the loose-card path so
      // returnToDeck can remove the selected stack cards from their hosts.
      if (cost.target.filter.zone === "digivolutionCards") {
        let candidates = candidateLooseInstances(ctx, cost.target, ["digivolutionCards"]);
        const n = cost.target.count === "all" ? candidates.length : cost.target.count;
        if (n <= 0 || candidates.length < n) return false;
        if (cost.target.filter.sameHost === true) {
          const byHost = new Map<string, LooseCandidate[]>();
          for (const candidate of candidates) {
            if (candidate.hostPermanentId === undefined) continue;
            const group = byHost.get(candidate.hostPermanentId) ?? [];
            group.push(candidate);
            byHost.set(candidate.hostPermanentId, group);
          }
          const eligibleHosts = [...byHost.entries()].filter(([, group]) => group.length >= n);
          if (eligibleHosts.length === 0) return false;
          const hostId =
            eligibleHosts.length === 1
              ? eligibleHosts[0]![0]
              : (
                  await ctx.ask.chooseTargets(ctx, {
                    candidates: eligibleHosts.map(([id]) => id),
                    min: 1,
                    max: 1,
                  })
                )[0];
          if (hostId === undefined) return false;
          candidates = byHost.get(hostId) ?? [];
        }
        const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
        if (chosen.length < n) return false;
        // Some generated return costs encode the destination as `position: "bottom"`
        // (rather than the legacy `to: "deckBottom"`). Preserve that distinction here:
        // EX6-073's seven distinct-name self-stack payment must actually bottom-deck the
        // selected cards, while `pickLoose` enforces the distinct-name constraint.
        if (cost.to === "deckBottom" || cost.position === "bottom") {
          await ctx.fx.returnToDeck(chosen, { toTop: false });
        } else {
          await ctx.fx.returnToHand(chosen);
        }
        if (out) out.paidCount = chosen.length;
        return true;
      }
      if (cost.target.filter.zone === "security") {
        const candidates = candidateLooseInstances(ctx, cost.target, ["security"]);
        const n = cost.target.count === "all" ? candidates.length : cost.target.count;
        if (n <= 0 || candidates.length < n) return false;
        const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
        if (chosen.length < n) return false;
        await ctx.fx.returnToDeck(chosen, { toTop: await returnToTop() });
        if (out) out.paidCount = chosen.length;
        return true;
      }
      // Trash-zone return cost ("by returning 1 [Apocalymon] from your trash to the bottom of the
      // deck", BT17-068): resolve the loose trash cards matching the filter and return them to the
      // deck (bottom unless the raw says "top"). The prose compiler leaves the zone in the raw
      // (not filter.zone), so detect either. All-or-nothing — fewer than N available => unmet.
      if (cost.target.filter.zone === "trash" || /\btrash\b/i.test(cost.raw ?? "")) {
        // "all" means "pay with every matching candidate", i.e. n = candidates.length —
        // NOT Infinity (a finite pool is never >= Infinity, which made every "all"-shaped
        // cost unpayable; engine-audit finding 6). An empty pool is unpayable outright.
        const candidates = candidateLooseInstances(ctx, cost.target, ["trash"]);
        if (cost.target.distinctLevels === true || cost.target.distinctNames === true) {
          const groups = new Map<string, LooseCandidate[]>();
          for (const candidate of candidates) {
            const def = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
            const key =
              cost.target.distinctLevels === true
                ? def.level !== undefined && def.level > 0
                  ? String(def.level)
                  : undefined
                : (def.nameEn ?? candidate.cardId).toLowerCase();
            if (key === undefined) continue;
            const group = groups.get(key) ?? [];
            group.push(candidate);
            groups.set(key, group);
          }
          const want = cost.target.count === "all" ? groups.size : cost.target.count;
          if (want <= 0 || groups.size < want) return false;
          const chosen: string[] = [];
          for (const group of [...groups.values()].slice(0, want)) {
            if (group.length === 1) {
              chosen.push(group[0]!.instanceId);
              continue;
            }
            const picked = await ctx.ask.selectCards(ctx, {
              candidates: group.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            const id = picked[0];
            if (id === undefined) return false;
            chosen.push(id);
          }
          await ctx.fx.returnToDeck(chosen, { toTop: await returnToTop() });
          bindLooseCostSelection(ctx, cost.bindResultAs, candidates, chosen);
          if (out) out.paidCount = chosen.length;
          return true;
        }
        if (cost.target.upTo === true) {
          const max = typeof cost.target.count === "number" ? cost.target.count : candidates.length;
          const cap = Math.min(max, candidates.length);
          const min = (cost.target as Target & { allowZero?: boolean }).allowZero === true ? 0 : 1;
          if (cap < min) return false;
          let chosen = await ctx.ask.selectCards(ctx, {
            candidates: candidates.map((candidate) => candidate.instanceId),
            min,
            max: cap,
          });
          if (chosen.length < min) return false;
          if (chosen.length > 1) {
            chosen =
              (await ctx.ask.orderCards?.(ctx, {
                candidates: chosen,
                visibleCards: candidates
                  .filter((candidate) => chosen.includes(candidate.instanceId))
                  .map((candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId })),
                destination: /to the top/i.test(cost.raw ?? "") ? "deckTop" : "deckBottom",
              })) ?? chosen;
          }
          const toTop = await returnToTop();
          await ctx.fx.returnToDeck(toTop ? [...chosen].reverse() : chosen, { toTop });
          bindLooseCostSelection(ctx, cost.bindResultAs, candidates, chosen);
          if (out) out.paidCount = chosen.length;
          return true;
        }
        const n = cost.target.count === "all" ? candidates.length : cost.target.count;
        if (n <= 0 || candidates.length < n) return false;
        let chosen = await ctx.ask.selectCards(ctx, {
          candidates: candidates.map((c) => c.instanceId),
          min: n,
          max: n,
        });
        if (chosen.length < n) return false;
        if (cost.orderReturnedCards === true && chosen.length > 1) {
          chosen =
            (await ctx.ask.orderCards?.(ctx, {
              candidates: chosen,
              visibleCards: candidates
                .filter((candidate) => chosen.includes(candidate.instanceId))
                .map((candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId })),
              destination: cost.to === "deckTop" ? "deckTop" : "deckBottom",
            })) ?? chosen;
        }
        ctx.lastReturnedColors = [
          ...new Set(
            candidates
              .filter((candidate) => chosen.includes(candidate.instanceId))
              .flatMap((candidate) => ctx.game.definitionOf({ cardId: candidate.cardId } as never).colors),
          ),
        ];
        recordTrackedColors(candidates, chosen);
        await ctx.fx.returnToDeck(chosen, { toTop: await returnToTop() });
        bindLooseCostSelection(ctx, cost.bindResultAs, candidates, chosen);
        if (out) out.paidCount = chosen.length;
        return true;
      }
      const permIds = await resolvePermanentTargets(ctx, cost.target);
      const ids = topInstanceIds(ctx, permIds);
      if (ids.length === 0) return false;
      // storeAs: record the returned Digimon's level so a later levelLte filter can reference it
      // (BT19-002 "returnedDigimonLevel" — the level of this card sets the cap on the bounce target).
      if (cost.storeAs !== undefined) {
        const perm = ctx.game.permanentById(permIds[0]!);
        const level = perm?.topCard ? ctx.game.definitionOf(perm.topCard).level : undefined;
        if (level !== undefined && level > 0) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(cost.storeAs, level);
        }
      }
      // storeAsPlayCost: record the returned permanent's printed PLAY COST so a later
      // `namedCount` scaling can reference it — "play this card with the play cost reduced by
      // the play cost of the returned Tamer" (LM-006). A -1 sentinel (Digi-Egg) floors at 0.
      if (cost.storeAsPlayCost !== undefined) {
        const returned = ctx.game.permanentById(permIds[0]!);
        const playCost = returned?.topCard ? ctx.game.definitionOf(returned.topCard).playCost : undefined;
        if (playCost !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(cost.storeAsPlayCost, Math.max(0, playCost));
        }
      }
      if (cost.to === "deckBottom") {
        await ctx.fx.returnToDeck(ids, { toTop: false });
      } else {
        await ctx.fx.returnToHand(ids);
      }
      return true;
    }
    case "deleteOwn": {
      if (!cost.target) return false;
      const permanentIds = await resolvePermanentTargets(ctx, cost.target);
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
    case "payMemory": {
      // "By paying N cost" — pay N memory (memory can go negative; the gauge handles
      // turn-passing). A free effect would not carry this cost at all.
      const n = cost.memory ?? 0;
      if (n <= 0) return true;
      ctx.fx.gainMemory(-n);
      return true;
    }
    case "flipSecurity": {
      // "By flipping your top face-up security card face down" (BT23-043, EX11-031).
      // All-or-nothing: requires a face-up security card to flip.
      return ctx.fx.flipTopSecurity(ctx.source.ownerSeat);
    }
    case "trashSecurityTop": {
      // "By trashing your top security card" (ST23-05). All-or-nothing: requires a
      // security card to trash.
      const seat = ctx.source.ownerSeat;
      if (ctx.game.player(seat).security.length === 0) return false;
      await ctx.fx.trashFromSecurity(seat, 1, { fromTop: true });
      return true;
    }
    case "trashBothSecurityTop": {
      const opponent = ctx.game.opponentOf(ctx.source.ownerSeat);
      if (
        ctx.game.player(ctx.source.ownerSeat).security.length === 0 ||
        ctx.game.player(opponent).security.length === 0
      )
        return false;
      await ctx.fx.trashFromSecurity(ctx.source.ownerSeat, 1, { fromTop: true });
      await ctx.fx.trashFromSecurity(opponent, 1, { fromTop: true });
      return true;
    }
    case "securityToHand": {
      // "By adding your top security card to the hand" — all-or-nothing cost.
      const seat = ctx.source.ownerSeat;
      if (ctx.game.player(seat).security.length === 0) return false;
      // "the top OR bottom card" is a CONTROLLER CHOICE (EX6-021/EX6-027, raw "top or bottom"):
      // prompt via the shared binary-choice helper (0 = top, 1 = bottom) instead of silently
      // defaulting to the top end.
      const isChoice = /\btop\s+or\s+bottom\b|\bbottom\s+or\s+top\b/i.test(cost.raw ?? "");
      if (isChoice) {
        const idx = await ctx.ask.chooseOption(ctx, ["top", "bottom"]);
        await ctx.fx.securityToHand(seat, 1, { fromTop: idx === 0 });
        return true;
      }
      await ctx.fx.securityToHand(seat, 1, { fromTop: cost.position !== "bottom" });
      return true;
    }
    case "placeAsSecurity": {
      // "By placing this Digimon as the face-up bottom security card" (BT19-048).
      // Resolves the target (isSelfRef → the source permanent itself), takes its top-card
      // instance, and adds it to the controller's security stack at the position encoded
      // in `cost.position`. `"faceUpBottom"` → bottom (toTop:false), face-up (faceUp:true).
      const targets = cost.target
        ? await resolvePermanentTargets(ctx, cost.target)
        : (() => {
            const selfPerm = ctx.source.permanent();
            return selfPerm ? [selfPerm.permanentId] : [];
          })();
      const instanceIds = topInstanceIds(ctx, targets);
      if (instanceIds.length === 0) return false;
      const toTop = cost.position !== "bottom" && cost.position !== "faceUpBottom";
      const faceUp = cost.position === "faceUpBottom";
      await ctx.fx.addSecurity(ctx.source.ownerSeat, instanceIds, { toTop, faceUp });
      return true;
    }
    case "placeOwnTopAtStackBottom": {
      if (!cost.target) return false;
      const candidates = (await resolvePermanentTargets(ctx, cost.target)).filter((id) => {
        const permanent = ctx.game.permanentById(id);
        return permanent !== undefined && permanent.stack.length > 0;
      });
      if (candidates.length === 0) return false;
      const selected =
        candidates.length === 1 ? candidates[0] : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
      if (selected === undefined || !ctx.fx.placeOwnTopAtStackBottom(selected)) return false;
      if (out) out.paidCount = 1;
      return true;
    }
    case "playFromDigivolutionCards": {
      // BT19-102: choose a Digimon, then choose a matching card from that Digimon's
      // digivolution cards and play it for free. The host selection is explicit rather
      // than inferred from the card filter because the subsequent Delete target is a
      // separate choice and may include a different permanent.
      if (!cost.target || !cost.hostTarget) return false;
      const hostCandidates = candidatePermanents(ctx, cost.hostTarget)
        .map((host) => host.permanentId)
        .filter((hostId) => {
          const host = ctx.game.permanentById(hostId);
          if (host === undefined || host.topCard === undefined) return false;
          const hostLevel = ctx.game.definitionOf(host.topCard).level;
          return host.stack.some((card) => {
            const definition = ctx.game.definitionOf({ cardId: card.cardId } as never);
            return (
              definitionMatches(cost.target!.filter, definition) &&
              (cost.sameLevelAsHost !== true || definition.level === hostLevel)
            );
          });
        });
      if (hostCandidates.length === 0) return false;
      const hostId =
        hostCandidates.length === 1
          ? hostCandidates[0]
          : (await ctx.ask.chooseTargets(ctx, { candidates: hostCandidates, min: 1, max: 1 }))[0];
      if (hostId === undefined) return false;
      const host = ctx.game.permanentById(hostId);
      if (host === undefined) return false;
      const hostLevel = host.topCard === undefined ? undefined : ctx.game.definitionOf(host.topCard).level;
      const candidates: LooseCandidate[] = host.stack
        .map((card) => ({
          instanceId: card.instanceId,
          cardId: card.cardId,
          ownerSeat: card.ownerSeat,
          hostPermanentId: host.permanentId,
          faceUp: card.faceUp,
        }))
        .filter((candidate) => {
          const definition = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
          return (
            definitionMatches(cost.target!.filter, definition) &&
            (cost.sameLevelAsHost !== true || definition.level === hostLevel)
          );
        });
      const chosen = await pickLoose(ctx, { ...cost.target, count: 1 }, candidates);
      if (chosen.length !== 1) return false;
      const played = await ctx.fx.playInstances(chosen, { payCost: false });
      if (played.length === 0) return false;
      if (cost.bindResultAs !== undefined) {
        ctx.boundPlayed ??= new Map();
        ctx.boundPlayed.set(cost.bindResultAs, new Set(played.map((permanent) => permanent.permanentId)));
      }
      ctx.lastResolvedPermanentIds = [hostId];
      if (out) out.paidCount = played.length;
      return true;
    }
    case "place": {
      // BT22-043/044 self-restack: "By placing this [CS] Digimon's top stacked card as its
      // bottom digivolution card" rotates the SOURCE permanent's OWN top card to the bottom of
      if (cost.raw && /bottom digivolution card/i.test(cost.raw) && /\btop\s+(?:stacked\s+)?card/i.test(cost.raw)) {
        const selfPerm = ctx.source.permanent();
        if (selfPerm === undefined) return false;
        // EX5-016's inherited payment names the HOST trait, not merely a top-card
        // rotation. Do not let the generic self-restack shortcut pay it on another host.
        if (/Night Claw.*Light Fang|Light Fang.*Night Claw/i.test(cost.raw)) {
          const top = selfPerm.topCard;
          if (
            top === undefined ||
            !definitionMatches(
              { nameOrTrait: [{ tokens: ["Night Claw", "Light Fang"], match: "trait" }] },
              ctx.game.definitionOf(top),
            )
          )
            return false;
        }
        const rotated = await ctx.fx.placeOwnTopAtStackBottom(selfPerm.permanentId);
        if (rotated && out) out.paidCount = 1;
        return rotated;
      }
      // Routed place-as-cost (cost.destination set): the chosen card(s) go to the
      // security stack or a chosen/own digivolution stack at top/bottom, instead of
      // the default "under the source" placeUnder below. Loose-card source zones come from
      // cost.target.from (defaulting to hand); permanent relocation tracks actual moves.
      if (cost.destination !== undefined) {
        if (!cost.target) return false;
        if (cost.targetIsPermanent === true) {
          // `bindAs` is needed while resolving an `excludeSelectionRef` destination, but it
          // must not leak from a failed payment into a reused activation context (notably a
          // hand-resident replacement). Preserve any earlier binding until the payment commits.
          const bindAs = cost.target.bindAs;
          const hadPreviousBinding = bindAs !== undefined && ctx.selections?.has(bindAs) === true;
          const previousBinding = bindAs === undefined ? undefined : ctx.selections?.get(bindAs);
          const hostBindAs = cost.bindHostAs;
          const hadPreviousHostBinding = hostBindAs !== undefined && ctx.selections?.has(hostBindAs) === true;
          const previousHostBinding = hostBindAs === undefined ? undefined : ctx.selections?.get(hostBindAs);
          let committedBinding = false;
          const restoreBinding = (): void => {
            if (bindAs !== undefined) {
              if (hadPreviousBinding && previousBinding !== undefined) {
                ctx.selections ??= new Map();
                ctx.selections.set(bindAs, previousBinding);
              } else {
                ctx.selections?.delete(bindAs);
              }
            }
            if (hostBindAs !== undefined) {
              if (hadPreviousHostBinding && previousHostBinding !== undefined) {
                ctx.selections ??= new Map();
                ctx.selections.set(hostBindAs, previousHostBinding);
              } else {
                ctx.selections?.delete(hostBindAs);
              }
            }
          };
          try {
            const resolvedSourceIds = await resolvePermanentTargets(ctx, cost.target);
            const sourceIds =
              cost.target.filter.differentColors === true
                ? distinctColorPermanentIds(ctx, resolvedSourceIds)
                : resolvedSourceIds;
            if (sourceIds.length === 0) return false;
            const requiredSourceCount =
              cost.target.upTo === true
                ? 0
                : cost.target.count === "all"
                  ? sourceIds.length
                  : effectiveTargetCount(ctx, cost.target);
            if (sourceIds.length < requiredSourceCount) return false;
            if (cost.target.bindAs !== undefined) {
              ctx.selections ??= new Map();
              ctx.selections.set(cost.target.bindAs, sourceIds[0]!);
            }
            if (cost.storeAs !== undefined) {
              const sourcePermanent = ctx.game.permanentById(sourceIds[0]!);
              const level = sourcePermanent?.topCard ? ctx.game.definitionOf(sourcePermanent.topCard).level : undefined;
              if (level !== undefined && level > 0) {
                if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
                ctx.namedCounts.set(cost.storeAs, level);
              }
            }
            if (cost.destination === "security") {
              for (const sourcePermanentId of sourceIds) {
                const permanent = ctx.game.permanentById(sourcePermanentId);
                if (permanent?.topCard === undefined) return false;
                const topInstanceId = permanent.topCard.instanceId;
                await ctx.fx.addSecurity(permanent.controllerSeat, [topInstanceId], {
                  toTop: cost.position !== "bottom",
                  detachPermanentTop: cost.detachPermanentTop === true,
                });
                if (cost.detachPermanentTop === true) {
                  const reachedSecurity = ctx.game.state.players.some((player) =>
                    player.security.some((card) => card.instanceId === topInstanceId),
                  );
                  if (!reachedSecurity) return false;
                  continue;
                }
                // The cost is paid only if the permanent actually left. A leave-prevention
                // replacement can keep it in the battle area (ST22-06 Q5425), in which case the
                // dependent effect must not resolve even though the placement was attempted.
                if (ctx.game.permanentById(sourcePermanentId) !== undefined) return false;
              }
              if (out) out.paidCount = sourceIds.length;
              committedBinding = true;
              return true;
            }
            let hostPermId: string | undefined;
            if (cost.host !== null && typeof cost.host === "object") {
              const destIds = placeCostHostCandidates(ctx, {
                filter: cost.host.filter,
                count: cost.host.count,
                orFilters: cost.host.orFilters,
              }).map((permanent) => permanent.permanentId);
              if (destIds.length === 0) return false;
              hostPermId =
                destIds.length === 1
                  ? destIds[0]
                  : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
            } else if (cost.host === "target" && cost.underFilter) {
              const destIds = await resolvePermanentTargets(ctx, {
                filter: cost.underFilter,
                orFilters: cost.underOrFilters,
                count: 1,
              });
              if (destIds.length === 0) return false;
              hostPermId =
                destIds.length === 1
                  ? destIds[0]
                  : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
            } else if (cost.host === "triggerSource") {
              hostPermId =
                ctx.trigger.subjectPermanentId ?? ctx.trigger.attackerPermanentId ?? ctx.trigger.deletedPermanentId;
            } else {
              const selfPerm =
                ctx.source.permanent() ??
                (ctx.trigger.attackerPermanentId !== undefined
                  ? ctx.game.permanentById(ctx.trigger.attackerPermanentId)
                  : undefined);
              if (selfPerm === undefined) return false;
              hostPermId = selfPerm.permanentId;
            }
            if (hostPermId === undefined) return false;
            // A permanent cannot be placed under itself. The destination filter normally
            // excludes the selected source through `excludeSelectionRef`; retain this
            // identity guard at the mutation seam so a malformed/stale selection can never
            // partially pay the cost.
            if (sourceIds.includes(hostPermId)) return false;
            if (sourceIds.some((sourceId) => ctx.game.permanentById(sourceId)?.topCard === undefined)) return false;
            if (cost.bindHostAs !== undefined) {
              ctx.selections ??= new Map();
              ctx.selections.set(cost.bindHostAs, hostPermId);
            }
            const placedSourceIds: string[] = [];
            const sourceTopInstanceIds = new Map(
              sourceIds.map((sourcePermanentId) => [
                sourcePermanentId,
                ctx.game.permanentById(sourcePermanentId)?.topCard?.instanceId,
              ]),
            );
            if (sourceIds.length > 1) {
              // A multi-source permanent payment must be one atomic operation. The production
              // primitive preflights every source before mutating; refusing the batch in a
              // minimal/legacy context is safer than falling back to partial sequential moves.
              if (ctx.fx.relocatePermanentsByEffect === undefined) return false;
              const moved = await ctx.fx.relocatePermanentsByEffect(hostPermId, sourceIds, {
                belowTop: cost.position !== "bottom",
                shedOwnCards: cost.shedOwnCards === true,
              });
              if (
                moved.length !== sourceIds.length ||
                moved.some((sourcePermanentId) => !sourceIds.includes(sourcePermanentId))
              )
                return false;
              placedSourceIds.push(...sourceIds);
            } else {
              const moved = await relocateByEffect(ctx, hostPermId, sourceIds[0]!, {
                belowTop: cost.position !== "bottom",
                shedOwnCards: cost.shedOwnCards === true,
              });
              if (moved) placedSourceIds.push(sourceIds[0]!);
            }
            if (placedSourceIds.length === 0) return false;
            ctx.lastPlacedUnderInstanceIds = placedSourceIds
              .map((sourcePermanentId) => sourceTopInstanceIds.get(sourcePermanentId))
              .filter((instanceId): instanceId is string => instanceId !== undefined);
            ctx.lastEffectActed = true;
            if (cost.trackCount !== undefined) {
              ctx.namedCounts ??= new Map();
              ctx.namedCounts.set(cost.trackCount, placedSourceIds.length);
            }
            if (out) out.paidCount = placedSourceIds.length;
            committedBinding = true;
            return true;
          } finally {
            if (!committedBinding) restoreBinding();
          }
        }
        const srcZones: ZoneRef[] = (cost.target.from?.length ?? 0) > 0 ? (cost.target.from as ZoneRef[]) : ["hand"];
        const srcCandidates = candidateLooseInstances(ctx, cost.target, srcZones);
        const visibleSourceIds = srcZones.every((zone) => zone === "hand" || zone === "trash")
          ? seatsForController(ctx, cost.target.filter).flatMap((seat) =>
              srcZones.flatMap((zone) => looseCardsInZone(ctx, seat, zone).map((candidate) => candidate.instanceId)),
            )
          : undefined;
        const wantN = cost.target.count === "all" ? srcCandidates.length : (cost.target.count ?? 1);
        if (wantN <= 0) return false;
        if (!cost.target.upTo && srcCandidates.length < wantN) return false;
        const picked = await pickLoose(
          ctx,
          { ...cost.target, count: wantN },
          srcCandidates,
          undefined,
          ctx.ask,
          visibleSourceIds,
        );
        if (!cost.target.upTo && picked.length < wantN) return false;
        if (cost.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(cost.trackCount, picked.length);
        }
        // `storeAs`: record the FIRST picked card's level under a named count, readable by a
        // later action's `levelComparison.scaling` (unit "namedCount") — e.g. "delete 1 of your
        // opponent's Digimon with the SAME level as the placed card" (EX9-055). Honored for
        // every destination, not just security (the earlier placement predates digivolutionStack
        // reuse of this hook).
        if (cost.storeAs !== undefined && picked.length > 0) {
          const pickedCard = srcCandidates.find((c) => c.instanceId === picked[0]);
          const def = pickedCard !== undefined ? ctx.game.definitionOf(pickedCard as never) : undefined;
          const level = def?.level;
          if (level !== undefined && level > 0) {
            if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
            ctx.namedCounts.set(cost.storeAs, level);
          }
        }
        if (cost.destination === "security") {
          if (cost.bindResultAs) {
            ctx.boundPlayed ??= new Map();
            ctx.boundPlayed.set(cost.bindResultAs, new Set(picked));
          }
          // "top or bottom" is a controller choice, including when the
          // destination is security (not only when placing under a Digimon).
          // Without this branch, a `position: "choice"` cost silently always
          // inserted at the top of security.
          let toTop: boolean;
          if (cost.position === "choice") {
            const choice = await ctx.ask.chooseOption(ctx, ["top", "bottom"]);
            toTop = choice === 0;
          } else {
            toTop = cost.position !== "bottom";
          }
          await ctx.fx.addSecurity(ctx.source.ownerSeat, picked, {
            toTop,
            faceUp: cost.faceDown !== true,
          });
          if (out) out.paidCount = picked.length;
          return true;
        }
        if (cost.destination === "battleArea") {
          const placed: string[] = [];
          for (const instanceId of picked) {
            const permanent = await ctx.fx.placeOptionAsPermanent?.(instanceId);
            if (permanent !== undefined) placed.push(permanent.permanentId);
          }
          if (placed.length !== picked.length) return false;
          if (out) out.paidCount = placed.length;
          return true;
        }
        // digivolutionStack: resolve the host (self or the underFilter target) and
        // place under it at the chosen end. placeUnder forces face-down (digivolution
        // cards are always face-down), satisfying the face-down variants too.
        let hostPermId: string | undefined;
        if (cost.host !== null && typeof cost.host === "object") {
          // Object form: { filter, count } — player picks a destination Digimon (BT21-071).
          const destIds = placeCostHostCandidates(ctx, {
            filter: cost.host.filter,
            count: cost.host.count,
            orFilters: cost.host.orFilters,
          }).map((permanent) => permanent.permanentId);
          if (destIds.length === 0) return false;
          hostPermId =
            destIds.length === 1
              ? destIds[0]
              : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
        } else if (cost.host === "target" && cost.underFilter) {
          const destIds = await resolvePermanentTargets(ctx, {
            filter: cost.underFilter,
            orFilters: cost.underOrFilters,
            count: 1,
          });
          if (destIds.length === 0) return false;
          hostPermId =
            destIds.length === 1
              ? destIds[0]
              : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
        } else if (cost.host === "triggerSource") {
          hostPermId =
            ctx.trigger.subjectPermanentId ?? ctx.trigger.attackerPermanentId ?? ctx.trigger.deletedPermanentId;
        } else {
          // "place ... as 1 of your Digimon's ... card" names the destination
          // separately from the material filter. Older IR omitted an explicit host
          // target, so do not incorrectly default to the source Tamer; choose one of
          // the controller's Digimon permanents through the production target seam.
          const sourcePermanent = ctx.source.permanent();
          const sourceIsTamer =
            sourcePermanent !== undefined &&
            ctx.game.definitionOf(sourcePermanent.topCard).kinds.includes(CardKind.Tamer);
          if (
            (cost.raw && /as 1 of your Digimon's/i.test(cost.raw)) ||
            (sourceIsTamer && cost.target.filter.kind?.includes("Digimon"))
          ) {
            const candidates = ctx.game
              .player(ctx.source.ownerSeat)
              .battleArea.filter((permanent) =>
                ctx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Digimon),
              )
              .map((permanent) => permanent.permanentId);
            if (candidates.length === 0) return false;
            hostPermId =
              candidates.length === 1
                ? candidates[0]
                : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
          } else {
            const selfPerm =
              ctx.source.permanent() ??
              (ctx.trigger.attackerPermanentId !== undefined
                ? ctx.game.permanentById(ctx.trigger.attackerPermanentId)
                : undefined);
            if (selfPerm === undefined) return false;
            hostPermId = selfPerm.permanentId;
          }
        }
        if (hostPermId === undefined) return false;
        let orderedPicked = picked;
        if (picked.length > 1 && /in any order/i.test(cost.raw ?? "") && ctx.ask.orderCards !== undefined) {
          orderedPicked = await ctx.ask.orderCards(ctx, {
            candidates: picked,
            visibleCards: picked.map((instanceId) => {
              const card = srcCandidates.find((candidate) => candidate.instanceId === instanceId);
              return { instanceId, cardId: card?.cardId ?? "" };
            }),
            destination: "stackBottom",
          });
        }
        const placedIds = new Set<string>();
        if (cost.position === "choice") {
          // "top or bottom" — prompt the controller per placed card via the shared
          // binary-choice helper ctx.ask.chooseOption (index 0 = top, 1 = bottom).
          for (const instanceId of orderedPicked) {
            const idx = await ctx.ask.chooseOption(ctx, ["top", "bottom"]);
            const placed = await ctx.fx.placeUnder(hostPermId, [instanceId], {
              belowTop: idx === 0,
              faceUp: cost.faceDown !== true,
            });
            for (const card of placed) placedIds.add(card.instanceId);
          }
        } else {
          const placed = await ctx.fx.placeUnder(hostPermId, orderedPicked, {
            belowTop: cost.position !== "bottom",
            faceUp: cost.faceDown !== true,
          });
          for (const card of placed) placedIds.add(card.instanceId);
        }
        // A placement cost is paid only when every selected card actually entered the
        // requested digivolution stack.  The primitive is allowed to reject individual
        // cards (for example, if a replacement or intervening effect makes one no longer
        // movable), so a selection alone must not bind a target or unlock a dependent
        // "if you did" action.
        if (placedIds.size !== orderedPicked.length || orderedPicked.some((instanceId) => !placedIds.has(instanceId))) {
          return false;
        }
        ctx.lastPlacedUnderInstanceIds = [...orderedPicked];
        if (cost.bindHostAs !== undefined) {
          ctx.selections ??= new Map();
          ctx.selections.set(cost.bindHostAs, hostPermId);
        }
        if (cost.storeAs !== undefined && orderedPicked.length > 0) {
          const pickedCard = srcCandidates.find((c) => c.instanceId === picked[0]);
          const def = pickedCard !== undefined ? ctx.game.definitionOf(pickedCard as never) : undefined;
          const level = def?.level;
          if (level !== undefined && level > 0) {
            if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
            ctx.namedCounts.set(cost.storeAs, level);
          }
        }
        // A successful placement cost is the producer for following "if you did"
        // clauses (BT13-088). Keep the effect-result binding consistent with the
        // equivalent place/trash action paths.
        ctx.lastEffectActed = picked.length > 0;
        if (out) out.paidCount = picked.length;
        return true;
      }
      // "By placing N card(s) from your hand as this Digimon's bottom digivolution
      // card(s)" (EX9-037/EX9-038, EX11-018). Source zones come from cost.target.from
      // (emitted by the compiler); absent, defaults to hand. Destination comes from
      // cost.underFilter when set ("under one of your Tamers"); absent, uses the source
      // permanent itself. Exotic variants (BT24-040, BT9-044, BT23-073) still lack a
      // derivable destination when neither underFilter nor a battle-area source exists.
      const self =
        ctx.source.permanent() ??
        (ctx.trigger.attackerPermanentId !== undefined
          ? ctx.game.permanentById(ctx.trigger.attackerPermanentId)
          : undefined);
      if (!cost.target) return false;
      const zones: ZoneRef[] = (cost.target.from?.length ?? 0) > 0 ? (cost.target.from as ZoneRef[]) : ["hand"];
      const candidates = candidateLooseInstances(ctx, cost.target, zones);
      const visibleSourceIds = zones.every((zone) => zone === "hand" || zone === "trash")
        ? seatsForController(ctx, cost.target.filter).flatMap((seat) =>
            zones.flatMap((zone) => looseCardsInZone(ctx, seat, zone).map((candidate) => candidate.instanceId)),
          )
        : undefined;
      const want = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
      if (want <= 0 || candidates.length < want) return false;
      const chosen = await pickLoose(
        ctx,
        { ...cost.target, count: want },
        candidates,
        undefined,
        ctx.ask,
        visibleSourceIds,
      );
      if (chosen.length < want) return false;
      let hostId: string | undefined;
      // Older compiled records place the destination selector on the cost target,
      // while newer hand-authored IR uses the cost-level field. Both encode the
      // same printed "under this Digimon or one of your Tamers" destination.
      const underFilter = cost.underFilter ?? (cost.target as Target & { underFilter?: Filter }).underFilter;
      if (underFilter) {
        const destTarget: Target = { filter: underFilter, count: 1 };
        const destIds = await resolvePermanentTargets(ctx, destTarget);
        if (destIds.length === 0) return false;
        hostId =
          destIds.length === 1
            ? destIds[0]
            : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
      } else {
        const inBattleArea =
          self !== undefined &&
          Array.from(ctx.game.player(ctx.source.ownerSeat).battleArea).some((p) => p.permanentId === self.permanentId);
        if (cost.raw && /as 1 of your Digimon's/i.test(cost.raw)) {
          const destIds = ctx.game
            .player(ctx.source.ownerSeat)
            .battleArea.filter((permanent) => ctx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Digimon))
            .map((permanent) => permanent.permanentId);
          if (destIds.length === 0) return false;
          hostId =
            destIds.length === 1
              ? destIds[0]
              : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
        } else {
          if (self === undefined || !inBattleArea) return false;
          hostId = self.permanentId;
        }
      }
      if (hostId === undefined) return false;
      let orderedChosen = chosen;
      if (chosen.length > 1 && /in any order/i.test(cost.raw ?? "") && ctx.ask.orderCards !== undefined) {
        orderedChosen = await ctx.ask.orderCards(ctx, {
          candidates: chosen,
          visibleCards: chosen.map((instanceId) => {
            const card = candidates.find((candidate) => candidate.instanceId === instanceId);
            return { instanceId, cardId: card?.cardId ?? "" };
          }),
          destination: "stackBottom",
        });
      }
      await ctx.fx.placeUnder(hostId, [...orderedChosen].reverse(), {
        belowTop: false,
        faceUp: cost.faceDown !== true,
      });
      ctx.lastPlacedUnderInstanceIds = [...orderedChosen];
      if (cost.storeAs !== undefined && chosen.length > 0) {
        const pickedCard = candidates.find((c) => c.instanceId === chosen[0]);
        const level = pickedCard !== undefined ? ctx.game.definitionOf(pickedCard as never).level : undefined;
        if (level !== undefined && level > 0) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(cost.storeAs, level);
        }
      }
      if (out) out.paidCount = chosen.length;
      return true;
    }
    case "raw":
    default:
      return false; // cost we cannot pay precisely yet
  }
}

export async function payOneCostOption(
  ctx: EffectContext,
  costs: readonly Cost[],
  out?: { paidCount: number },
): Promise<boolean> {
  if (costs.length === 0) return true;
  const index =
    costs.length === 1
      ? 0
      : await ctx.ask.chooseOption(
          ctx,
          costs.map((cost) => cost.raw ?? cost.kind),
        );
  const cost = costs[index];
  if (cost === undefined) return false;
  return payCost(ctx, cost, out);
}
