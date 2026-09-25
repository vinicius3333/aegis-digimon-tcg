import { MEMORY_MIN } from "../../../MemoryGauge.js";
import type { EffectContext } from "../../EffectContext.js";
import { canAttemptDigivolve } from "../actions/digivolve.js";
import { definitionMatches } from "../matching/definition.js";
import { bottomFaceDownCostStacks } from "../targeting/faceDownCosts.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { LooseCandidate, candidateLooseInstances, findLooseCandidateByInstance, zoneList } from "../targeting/loose.js";
import { candidatePermanents, effectiveTargetCount, raiseDeletionDpCap } from "../targeting/permanents.js";
import {
  distinctColorPermanentIds,
  isSelfFromFieldPlaceCost,
  permanentTopReturnCostCandidates,
  placeCostHostCandidates,
  selfFromFieldPlaceHosts,
} from "./candidates.js";
import { CardKind, getCardDefinition } from "@aegis/shared";
import type { Cost, Filter, Target, ZoneRef } from "@aegis/shared";

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
  if (cost.kind === "unsuspend") {
    const candidates = cost.target
      ? candidatePermanents(ctx, cost.target).filter((permanent) => permanent.isSuspended)
      : (() => {
          const self = ctx.source.permanent();
          return self?.isSuspended ? [self] : [];
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
  if (
    cost.kind === "return" &&
    cost.target !== undefined &&
    cost.target.filter.zone === undefined &&
    !TRASH_IN_RAW.test(cost.raw ?? "")
  ) {
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
    return stackCardsPayable(cost.target, candidates);
  }
  if (cost.kind === "securityToHand" || cost.kind === "trashSecurityTop") {
    return ctx.game.player(ctx.source.ownerSeat).security.length > 0;
  }
  if (cost.kind === "trashBothSecurityTop") {
    const ownerSeat = ctx.source.ownerSeat;
    return (
      ctx.game.player(ownerSeat).security.length > 0 &&
      ctx.game.player(ctx.game.opponentOf(ownerSeat)).security.length > 0
    );
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
    // The source permanent itself is the payment (ST23-15, ST24-15). It is not a loose card in
    // hand or trash, so the loose-candidate scan below would find nothing and silently hide the
    // whole clause; payability is "still in the battle area, and a legal host to go under".
    if (isSelfFromFieldPlaceCost(cost)) return selfFromFieldPlaceHosts(ctx, cost).length > 0;
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
  // Every kind needs an explicit rule here: a missing one used to fall through to "payable",
  // which offered ST23-05's security trash with an empty security stack.
  switch (cost.kind) {
    case "unsuspendNamed":
      return canPayUnsuspendNamedCost(ctx, cost);
    case "flipSecurity":
      return ctx.game.player(ctx.source.ownerSeat).security.some((card) => card.faceUp);
    case "placeAsSecurity":
      if (isUnboundSelectionRef(ctx, cost.target?.fromSelectionRef)) return true;
      return placeAsSecurityInstanceCount(ctx, cost) > 0;
    case "playFromDigivolutionCards":
      // BT19-102 binds the host in an earlier action of the same effect. Before that binding
      // exists (activation pre-checks) the host is unknown, so defer to payment.
      if (isUnboundSelectionRef(ctx, cost.hostTarget?.fromSelectionRef)) return true;
      return playFromDigivolutionCardsHosts(ctx, cost).length > 0;
    case "trash":
      // A targetless trash names its card only in the printed text (EX1-071 "1 Digimon card in
      // your hand of the same color as the digivolving Digimon"); payTrashCost resolves it.
      if (cost.target === undefined) return true;
      return canPayRemainingTrashCost(ctx, cost, cost.target);
    case "return":
      // No structured card to count; like the targetless trash above, payment decides.
      if (cost.target === undefined) return true;
      return canPayRemainingReturnCost(ctx, cost, cost.target);
    case "place":
      // A targetless place is the raw-text self-restack route, which payPlaceCost checks itself.
      return true;
    default: {
      const unhandled: never = cost.kind;
      void unhandled;
      return false;
    }
  }
}

const TRASH_IN_RAW = /\btrash\b/i;
const HAND_IN_RAW = /(?:from|in) (?:your|their) hand/i;
const TAMER_STACK_ZONES: readonly string[] = [
  "underMyTamers",
  "underTamers",
  "underTamer",
  "underThisTamer",
  "digivolutionCardsUnderTamers",
];

/** Mirrors the stack-card detection at the top of payTrashStackCost. */
function trashesStackCards(target: Target): boolean {
  const { zone } = target.filter;
  return (
    zone === "digivolutionCards" ||
    (Array.isArray(zone) && zone.includes("digivolutionCards")) ||
    (target.filter.isSelfRef === true &&
      (target.filter.faceDown !== undefined || target.filter.position !== undefined)) ||
    target.from?.includes("digivolutionCards") === true ||
    (typeof zone === "string" && TAMER_STACK_ZONES.includes(zone))
  );
}

/**
 * Trash shapes no earlier branch of canPayCost claims, checked in payTrashCost's own order
 * after its security, deck and digivolution-or-link branches.
 */
function canPayRemainingTrashCost(ctx: EffectContext, cost: Cost, target: Target): boolean {
  // BT25-073 (any of your Digimon's link cards), BT21-073 (this Digimon's link cards).
  if (target.filter.zone === "linked") return countIsAvailable(target, linkedCostCardCount(ctx, target));
  if (trashesStackCards(target)) return canPayStackTrash(ctx, target);
  if (target.filter.zone === "deck") {
    const seat =
      target.filter.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
    return countIsAvailable(target, ctx.game.player(seat).deck.length);
  }
  // A hand cost the compiler left only in the printed text; payTrashCost reads the raw too.
  if (HAND_IN_RAW.test(cost.raw ?? "")) {
    const handTarget: Target = { ...target, filter: { ...target.filter, zone: "hand" } };
    const available = candidateLooseInstances(ctx, handTarget, ["hand"]).length;
    return available > 0 && (target.upTo === true || countIsAvailable(target, available));
  }
  // "By trashing this card" while the source is a loose card (ST22-10's security replacement).
  if (target.filter.isSelfRef === true && ctx.source.permanent() === undefined) {
    return findLooseCandidateByInstance(ctx, ctx.source.instanceId) !== undefined;
  }
  // Permanent fallback: payTrashCost trashes whatever the target resolves to, if anything
  // (BT23-055 "1 of your Option cards in the battle area").
  return candidatePermanents(ctx, target).length > 0;
}

/** Link cards payTrashCost offers: every link card of the source, or of each matching host. */
function linkedCostCardCount(ctx: EffectContext, target: Target): number {
  if (target.filter.isSelfRef === true) return ctx.source.permanent()?.linked.length ?? 0;
  const { zone: _zone, ...hostFilter } = target.filter;
  return seatsForController(ctx, target.filter)
    .flatMap((seat) => [...ctx.game.player(seat).battleArea])
    .filter((host) => permanentMatchesFilter(ctx, host, hostFilter, ctx.source))
    .reduce((total, host) => total + host.linked.length, 0);
}

/** Mirrors payTrashStackCost for the stack shapes the dedicated branches above do not claim. */
function canPayStackTrash(ctx: EffectContext, target: Target): boolean {
  const boundHostRef = (target.filter as Filter & { boundTo?: string }).boundTo;
  if (boundHostRef !== undefined) {
    if (isUnboundSelectionRef(ctx, boundHostRef)) return true;
    const hostId = ctx.selections?.get(boundHostRef);
    const host = hostId === undefined ? undefined : ctx.game.permanentById(hostId);
    if (host === undefined) return false;
    const { zone: _zone, boundTo: _boundTo, ...cardFilter } = target.filter as Filter & { boundTo?: string };
    const available = host.stack
      .filter((card) => definitionMatches(cardFilter, ctx.game.definitionOf(card)))
      .filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) !== false).length;
    return countIsAvailable(target, available);
  }
  if (target.filter.isSelfRef === true) return canPaySelfStackTrash(ctx, target);
  // EX10-033 "up to 3 ... from any of your Digimon's digivolution cards", EX13-031 "from your
  // hand or your Digimon's digivolution cards".
  const zones: ZoneRef[] = target.filter.zone === undefined ? ["digivolutionCards"] : zoneList(target.filter.zone);
  return stackCardsPayable(target, candidateLooseInstances(ctx, target, zones));
}

/** Mirrors payTrashStackCost's isSelfRef branch, except the host redirect it asks about. */
function canPaySelfStackTrash(ctx: EffectContext, target: Target): boolean {
  const self = ctx.source.permanent();
  if (self === undefined) return false;
  const trashable = self.stack.filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) !== false);
  if (target.upTo === true) {
    const maximum = target.count === "all" ? trashable.length : target.count;
    return Math.min(maximum, trashable.length) >= Math.max(1, target.minimum ?? 1);
  }
  const required = target.count === "all" ? self.stack.length : target.count;
  if (required <= 0) return false;
  const { zone: _zone, isSelfRef: _isSelfRef, controller: _controller, ...stackCardFilter } = target.filter;
  let eligible = trashable
    .filter((card) => target.filter.faceDown !== true || !card.faceUp)
    .filter((card) => definitionMatches(stackCardFilter, ctx.game.definitionOf(card)));
  if (target.filter.sameLevelPair === true) {
    eligible = eligible.filter((card) => card.faceUp);
    const levelCounts = new Map<number, number>();
    for (const card of eligible) {
      const level = ctx.game.definitionOf(card).level;
      if (level !== undefined) levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
    }
    eligible = eligible.filter((card) => (levelCounts.get(ctx.game.definitionOf(card).level ?? -1) ?? 0) >= 2);
  }
  return eligible.length >= required;
}

/** Stack-card candidates cover the count, per host when the cost needs one host (and one level). */
function stackCardsPayable(target: Target, candidates: LooseCandidate[]): boolean {
  const maximum = target.count === "all" ? candidates.length : target.count;
  const required = target.upTo ? (target.minimum ?? 0) : maximum;
  if (maximum <= 0 || maximum < required) return false;
  if (target.filter.sameHost !== true) return candidates.length >= required;
  const byHost = new Map<string, LooseCandidate[]>();
  for (const candidate of candidates) {
    if (candidate.hostPermanentId === undefined) continue;
    const group = byHost.get(candidate.hostPermanentId) ?? [];
    group.push(candidate);
    byHost.set(candidate.hostPermanentId, group);
  }
  if (target.filter.sameLevelPair !== true) {
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

/**
 * Return shapes no earlier branch of canPayCost claims, checked in payReturnCost's order
 * after its hand, pooled-zone, top-card and digivolution-card branches.
 */
function canPayRemainingReturnCost(ctx: EffectContext, cost: Cost, target: Target): boolean {
  // BT26-016 "the top card of your security stack".
  if (target.filter.zone === "security") {
    return countIsAvailable(target, candidateLooseInstances(ctx, target, ["security"]).length);
  }
  if (TRASH_IN_RAW.test(cost.raw ?? "")) return canPayTrashReturn(ctx, target);
  // Permanent fallback: payReturnCost returns whatever the target resolves to, if anything
  // (BT26-092 "1 of your [TS] trait Tamers in the battle area").
  return candidatePermanents(ctx, target).length > 0;
}

/** Mirrors payReturnCost's trash branch for a trash zone the compiler left in the raw text. */
function canPayTrashReturn(ctx: EffectContext, target: Target): boolean {
  const candidates = candidateLooseInstances(ctx, target, ["trash"]);
  if (target.distinctLevels === true || target.distinctNames === true) {
    const keys = new Set<string>();
    for (const candidate of candidates) {
      const definition = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
      if (target.distinctNames === true) keys.add((definition.nameEn ?? candidate.cardId).toLowerCase());
      else if (definition.level !== undefined && definition.level > 0) keys.add(String(definition.level));
    }
    return countIsAvailable(target, keys.size);
  }
  if (target.upTo === true) {
    const maximum = typeof target.count === "number" ? target.count : candidates.length;
    const minimum = (target as Target & { allowZero?: boolean }).allowZero === true ? 0 : 1;
    return Math.min(maximum, candidates.length) >= minimum;
  }
  return countIsAvailable(target, candidates.length);
}

/** An all-or-nothing count: "all" needs at least one card, a number needs that many. */
function countIsAvailable(target: Target, available: number): boolean {
  const required = target.count === "all" ? available : target.count;
  return required > 0 && available >= required;
}

function isUnboundSelectionRef(ctx: EffectContext, ref: string | undefined): boolean {
  return ref !== undefined && ctx.selections?.has(ref) !== true && ctx.boundPlayed?.has(ref) !== true;
}

/** Every named target needs its own suspended permanent; mirrors payUnsuspendNamedCost. */
function canPayUnsuspendNamedCost(ctx: EffectContext, cost: Cost): boolean {
  const targets = cost.targets ?? [];
  if (targets.length === 0) return false;
  if (targets.some((target) => isUnboundSelectionRef(ctx, target.fromSelectionRef))) return true;
  const candidateIdsPerTarget = targets.map((target) =>
    candidatePermanents(ctx, target)
      .filter((permanent) => permanent.isSuspended)
      .map((permanent) => permanent.permanentId),
  );
  const assignDistinct = (index: number, used: ReadonlySet<string>): boolean =>
    index === candidateIdsPerTarget.length ||
    candidateIdsPerTarget[index]!.some(
      (permanentId) => !used.has(permanentId) && assignDistinct(index + 1, new Set([...used, permanentId])),
    );
  return assignDistinct(0, new Set());
}

/** Cards payPlaceAsSecurityCost would move: each target's top card, or the card beneath it. */
function placeAsSecurityInstanceCount(ctx: EffectContext, cost: Cost): number {
  const self = ctx.source.permanent();
  const permanents = cost.target ? candidatePermanents(ctx, cost.target) : self === undefined ? [] : [self];
  return permanents.filter((permanent) =>
    cost.fromDigivolutionTop === true || cost.detachPermanentTop === true
      ? permanent.stack.length > 0
      : permanent.topCard !== undefined,
  ).length;
}

/** Hosts holding a playable matching card; mirrors payPlayFromDigivolutionCardsCost (BT19-102, EX5-065). */
function playFromDigivolutionCardsHosts(ctx: EffectContext, cost: Cost): string[] {
  const { target, hostTarget } = cost;
  if (target === undefined || hostTarget === undefined) return [];
  return candidatePermanents(ctx, hostTarget)
    .filter((host) => {
      if (host.topCard === undefined) return false;
      const hostLevel = ctx.game.definitionOf(host.topCard).level;
      return host.stack.some((card) => {
        const definition = ctx.game.definitionOf(card);
        return (
          definitionMatches(target.filter, definition) &&
          (cost.sameLevelAsHost !== true || definition.level === hostLevel)
        );
      });
    })
    .map((host) => host.permanentId);
}

/**
 * Pay an action's cost. Returns true if paid (or no cost); false if unpayable.
 * When `out` is supplied, records the number of cards actually paid (for a variable
 * "up to N" cost whose paid count drives the parent action's scaling — BT7-040).
 */

export function costIsAskedAsSelection(cost: Cost | undefined): boolean {
  if (cost?.kind === "deleteOwn" && cost.target !== undefined && cost.declineViaSelection === true) {
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
