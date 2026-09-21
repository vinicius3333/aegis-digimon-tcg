import { MEMORY_MIN } from "../../../MemoryGauge.js";
import type { EffectContext } from "../../EffectContext.js";
import { canAttemptDigivolve } from "../actions/digivolve.js";
import { definitionMatches } from "../matching/definition.js";
import { bottomFaceDownCostStacks } from "../targeting/faceDownCosts.js";
import { LooseCandidate, candidateLooseInstances } from "../targeting/loose.js";
import { candidatePermanents, effectiveTargetCount, raiseDeletionDpCap } from "../targeting/permanents.js";
import { distinctColorPermanentIds, permanentTopReturnCostCandidates, placeCostHostCandidates } from "./candidates.js";
import { CardKind, getCardDefinition } from "@aegis/shared";
import type { Cost, ZoneRef } from "@aegis/shared";

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
  if (cost.kind === "trash" && cost.target?.topCardOnly === true) {
    const candidates = candidatePermanents(ctx, cost.target).filter((permanent) => permanent.stack.length > 0);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    return required > 0 && candidates.length >= required;
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
    return required > 0 && candidates.length >= (cost.target.upTo ? Math.max(1, cost.target.minimum ?? 1) : required);
  }
  if (cost.kind === "moveToBattleArea") {
    if (cost.target !== undefined) {
      return candidatePermanents(ctx, cost.target).some((permanent) => permanent.inBreeding);
    }
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
  if (cost.kind === "trashBottomFaceDownUnderTamer" || cost.kind === "trashBottomFaceDownUnderDigimon") {
    const available = bottomFaceDownCostStacks(ctx, cost).reduce((total, { cards }) => total + cards.length, 0);
    return available >= (cost.count ?? 1);
  }
  if (cost.kind === "deleteOwn") {
    if (cost.target === undefined) return false;
    const target = raiseDeletionDpCap(ctx, cost.target);
    const candidates = candidatePermanents(ctx, target);
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
    // "By suspending up to N ..." is payable with any non-zero number of candidates: the player
    // chooses how many and the parent action scales by what was paid. Zero candidates stays
    // unpayable because an upTo cost that can move no state is an unperformable optional process
    // (Comprehensive Rules 15-8-4-4-1); returning true would raise a prompt whose payment then
    // fails inside payCost and aborts the effect a step later.
    if (cost.target?.upTo === true) return candidates.length > 0;
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
    const maximum = cost.target.count === "all" ? candidates.length : cost.target.count;
    const required = cost.target.upTo ? (cost.target.minimum ?? 0) : maximum;
    if (maximum <= 0 || maximum < required) return false;
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
        // CR 3-4-5-8: a face-down digivolution card's level is not available for
        // a same-level comparison. It remains eligible for quantity-only costs.
        if (candidate.faceUp === false) continue;
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
      return (
        candidatePermanents(ctx, { filter: cost.host.filter, orFilters: cost.host.orFilters, count: cost.host.count })
          .length > 0
      );
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

export function costIsAskedAsSelection(cost: Cost | undefined): boolean {
  if (cost?.kind === "deleteOwn" && cost.target !== undefined) {
    return cost.target.upTo !== true && cost.target.count !== "all" && cost.target.chooser !== "opponent";
  }
  if (cost?.kind !== "trash" || cost.target === undefined) return false;
  if (cost.target.upTo === true || cost.target.count === "all") return false;
  const { filter } = cost.target;
  if (filter.zone === undefined && !/(?:from|in) (?:your|their) hand/i.test(cost.raw ?? "")) return false;
  if (filter.zone !== undefined && filter.zone !== "hand") return false;
  // "their hand" is the opponent's; only the controller's own hand is a question they answer.
  return filter.controller !== "opponent";
}
