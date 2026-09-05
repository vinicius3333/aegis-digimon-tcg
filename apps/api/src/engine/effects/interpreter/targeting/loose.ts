// Resolving a Target into loose cards in hand, deck, trash, security, and stacks.

import type { EffectContext, SeatScopedDecisionApi } from "../../EffectContext.js";
import { definitionMatches, matchNameOrTrait } from "../matching/definition.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { scaleFactor } from "../scaling.js";
import { effectiveTargetCount } from "./permanents.js";
import { filterToDistinctColors } from "@aegis/shared";
import type { Filter, Seat, Target, ZoneRef } from "@aegis/shared";

// ---------------------------------------------------------------------------
// Loose-card (hand/trash/security/deck/under-permanent) resolution
// ---------------------------------------------------------------------------
//
// PlayWithoutCost (filtered), Digivolve-from-effect, DnaDigivolve, PlaceUnder and
// Link source cards that are NOT yet permanents (a hand/trash/security/deck card, or
// a card sitting under one of the controller's Tamers/Digimon). The interpreter owns
// Filter matching, so it enumerates the candidate loose instances and prompts the
// controller; the zone-mechanic primitive then plays/places the chosen instances.

/** Default play-zones for a PlayWithoutCost whose `from` was not stated: the hand. */
export const DEFAULT_PLAY_ZONES: ZoneRef[] = ["hand"];

export interface LooseCandidate {
  instanceId: string;
  cardId: string;
  ownerSeat: Seat;
  /** The host permanent ID when this card sits in a permanent's stack/linked list; undefined for hand/trash/deck/security cards. */
  hostPermanentId?: string;
  /** Whether this loose card is currently face-up (digivolutionCards zone only; undefined elsewhere). */
  faceUp?: boolean;
}

/** Read a player's loose cards in a zone, paired with controller seat. */
export function looseCardsInZone(ctx: EffectContext, seat: Seat, zone: ZoneRef): LooseCandidate[] {
  const p = ctx.game.player(seat);
  const out: LooseCandidate[] = [];
  const collect = (
    cards: ArrayLike<{ instanceId: string; cardId: string; ownerSeat: Seat; faceUp?: boolean }>,
  ): void => {
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]!;
      out.push({
        instanceId: c.instanceId,
        cardId: c.cardId,
        ownerSeat: c.ownerSeat,
        ...(c.faceUp !== undefined ? { faceUp: c.faceUp } : {}),
      });
    }
  };
  switch (zone) {
    case "hand":
      collect(p.hand);
      break;
    case "trash":
      collect(p.trash);
      break;
    case "deck":
      collect(p.deck);
      break;
    case "security":
      collect(p.security);
      break;
    case "breeding":
      if (p.breeding?.topCard) collect([p.breeding.topCard]);
      break;
    case "digivolutionCards": {
      // "from under your Tamers/Digimon" — every digivolution card of every permanent
      // this seat controls, including the breeding-area permanent (BT13-110/112).
      for (const permanent of p.battleArea) {
        for (const c of permanent.stack) {
          out.push({
            instanceId: c.instanceId,
            cardId: c.cardId,
            ownerSeat: c.ownerSeat,
            hostPermanentId: permanent.permanentId,
            faceUp: c.faceUp,
          });
        }
      }
      if (p.breeding !== undefined) {
        for (const c of p.breeding.stack) {
          out.push({
            instanceId: c.instanceId,
            cardId: c.cardId,
            ownerSeat: c.ownerSeat,
            hostPermanentId: p.breeding.permanentId,
            faceUp: c.faceUp,
          });
        }
      }
      break;
    }
    case "underMyTamers":
    case "underTamers":
    // `underTamer` (singular) is another alias used in PlaceUnder target filters (BT19-081).
    case "underTamer": {
      // Cards stacked beneath the controller's Tamer permanents only (not under Digimon).
      // `underTamers`/`underTamer` are zone aliases for `underMyTamers` (BT19-026/BT19-081).
      for (const permanent of p.battleArea) {
        if (permanent.controllerSeat !== p.seat || permanent.topCard === undefined) continue;
        const topDef = ctx.game.definitionOf(permanent.topCard);
        if (!topDef.kinds.includes("Tamer" as never)) continue;
        for (const c of permanent.stack) {
          out.push({
            instanceId: c.instanceId,
            cardId: c.cardId,
            ownerSeat: c.ownerSeat,
            hostPermanentId: permanent.permanentId,
          });
        }
      }
      break;
    }
    case "underThisTamer": {
      // Cards stacked beneath the specific Tamer permanent executing this effect.
      // ctx.source.permanent() is the source Tamer; resolve its stack directly.
      const sourcePermanent = ctx.source.permanent();
      if (sourcePermanent !== undefined) {
        for (const c of sourcePermanent.stack) {
          out.push({
            instanceId: c.instanceId,
            cardId: c.cardId,
            ownerSeat: c.ownerSeat,
            hostPermanentId: sourcePermanent.permanentId,
          });
        }
      }
      break;
    }
    case "digivolutionCardsUnderTamers": {
      // Cards stacked beneath any of the controller's Tamer permanents only.
      // Semantically equivalent to `underMyTamers` but named explicitly for
      // DigiXros-material-under-Tamer sourcing (BT19-025 Digivolve/Play from).
      for (const permanent of p.battleArea) {
        if (permanent.topCard === undefined) continue;
        const topDef = ctx.game.definitionOf(permanent.topCard);
        if (!topDef.kinds.includes("Tamer" as never)) continue;
        for (const c of permanent.stack) {
          out.push({
            instanceId: c.instanceId,
            cardId: c.cardId,
            ownerSeat: c.ownerSeat,
            hostPermanentId: permanent.permanentId,
          });
        }
      }
      break;
    }
    case "linked": {
      // Link cards are loose instances owned by their host permanent for targeting, even
      // though they are not part of the player's hand/trash/deck zones.
      for (const permanent of p.battleArea) {
        for (const c of permanent.linked) {
          out.push({
            instanceId: c.instanceId,
            cardId: c.cardId,
            ownerSeat: c.ownerSeat,
            hostPermanentId: permanent.permanentId,
          });
        }
      }
      if (p.breeding !== undefined) {
        for (const c of p.breeding.linked) {
          out.push({
            instanceId: c.instanceId,
            cardId: c.cardId,
            ownerSeat: c.ownerSeat,
            hostPermanentId: p.breeding.permanentId,
          });
        }
      }
      break;
    }
    case "digivolutionCardsOrLinkCards": {
      out.push(...looseCardsInZone(ctx, seat, "digivolutionCards"));
      out.push(...looseCardsInZone(ctx, seat, "linked"));
      break;
    }
    default:
      break;
  }
  // CR 7-1-3 / 15-15-3-1: the imminent card cannot pay a cost from its origin
  // zone. Apply this uniformly to loose zones, hosted cards and their aliases.
  const imminentId = ctx.trigger?.wouldBePlayedInstanceId;
  return imminentId === undefined ? out : out.filter((card) => card.instanceId !== imminentId);
}

/**
 * Resolve a Target's filter to candidate loose instance ids across `zones`. Exported so a
 * card A3 can prove the load-bearing filter-resolution path discriminates (e.g. BT25-089's
 * `hasLinkRequirement` ＜Link＞-capability gate over hand/digivolution link material).
 */
/**
 * Normalize a filter's `zone` into a list. A filter may name one zone or pool several
 * ("from your trash or your Digimon's digivolution cards" — EX9-057).
 */
export function zoneList(zone: ZoneRef | ZoneRef[] | undefined): ZoneRef[] {
  if (zone === undefined) return [];
  return Array.isArray(zone) ? zone : [zone];
}

export function candidateLooseInstances(ctx: EffectContext, target: Target, zones: ZoneRef[]): LooseCandidate[] {
  const candidates = candidateLooseInstancesIncludingReserved(ctx, target, zones);
  const reserved = ctx.reservedCostInstanceIds;
  return reserved === undefined ? candidates : candidates.filter(({ instanceId }) => !reserved.has(instanceId));
}

/** Printed level of the permanent/card that produced the enclosing watcher event. */
function triggerSourceLevel(ctx: EffectContext): number | undefined {
  if (ctx.trigger.playedLevel !== undefined) return ctx.trigger.playedLevel;
  if (ctx.trigger.deletedTopCardId !== undefined) {
    return ctx.game.definitionOf({ cardId: ctx.trigger.deletedTopCardId } as never).level;
  }
  const subjectPermanentId =
    ctx.trigger.subjectPermanentId ?? ctx.trigger.suspendedPermanentId ?? ctx.trigger.deletedPermanentId;
  const subject = subjectPermanentId === undefined ? undefined : ctx.game.permanentById(subjectPermanentId);
  return subject?.topCard === undefined ? undefined : ctx.game.definitionOf(subject.topCard).level;
}

function candidateLooseInstancesIncludingReserved(
  ctx: EffectContext,
  target: Target,
  zones: ZoneRef[],
): LooseCandidate[] {
  // For a loose card in hand/trash/security, `this card` is the source instance.  In a
  // hosted-card zone, though, "this Digimon's digivolution cards" means every stack card
  // whose HOST is the source permanent (EX6-073), not the source's top-card instance.
  const hostedZone = zones.length > 0 && zones.every((zone) => zone === "digivolutionCards" || zone === "linked");
  if (target.filter.isSelfRef === true && !hostedZone) {
    const self = findLooseCandidateByInstance(ctx, ctx.source.instanceId);
    if (
      self === undefined ||
      !zones.some((zone) =>
        looseCardsInZone(ctx, self.ownerSeat, zone).some((card) => card.instanceId === ctx.source.instanceId),
      )
    ) {
      return [];
    }
    const { isSelfRef: _isSelfRef, ...definitionFilter } = target.filter;
    return definitionMatches(definitionFilter, ctx.game.definitionOf({ cardId: self.cardId })) ? [self] : [];
  }
  if (target.fromSelectionRef !== undefined) {
    const boundInstanceId = ctx.selections?.get(target.fromSelectionRef);
    if (boundInstanceId === undefined) return [];
    const bound = findLooseCandidateByInstance(ctx, boundInstanceId);
    if (
      bound === undefined ||
      !zones.some((zone) =>
        looseCardsInZone(ctx, bound.ownerSeat, zone).some((card) => card.instanceId === boundInstanceId),
      )
    )
      return [];
    const def = ctx.game.definitionOf({ cardId: bound.cardId });
    return definitionMatches(target.filter, def) ? [bound] : [];
  }
  // `orFilters`: a card qualifies if it matches the primary filter OR any alternative
  // ("play 1 [X] or 1 [Y]", BT17-074). Union the controller scope across all alternatives.
  // `filter.or` carries branch-specific context as well as definition predicates. Flatten it
  // into common+branch filters so a branch's hostFilter is evaluated for the same candidate;
  // calling definitionMatches on the unflattened parent loses which OR branch matched.
  const { or: nestedOr, ...commonFilter } = target.filter;
  const primaryFilters =
    nestedOr && nestedOr.length > 0 ? nestedOr.map((branch) => ({ ...commonFilter, ...branch })) : [target.filter];
  const allFilters = [...primaryFilters, ...(target.orFilters ?? []), ...(target.filter.orFilters ?? [])];
  const branchSpecificHostFilters = new Set(
    [...(nestedOr ?? []), ...(target.orFilters ?? []), ...(target.filter.orFilters ?? [])]
      .map((filter) => filter.hostFilter)
      .filter((filter): filter is NonNullable<Filter["hostFilter"]> => filter !== undefined),
  );
  const seatSet = new Set<Seat>();
  for (const f of allFilters) for (const s of seatsForController(ctx, f)) seatSet.add(s);
  const seats = [...seatSet];
  const seen = new Set<string>();
  const out: LooseCandidate[] = [];
  const targetSources =
    target.source === undefined ? [] : Array.isArray(target.source) ? target.source : [target.source];
  const fromThisDigimon = targetSources.includes("thisDigimon");
  const contextMatches = (filter: Filter, ownerSeat: Seat): boolean => {
    const gate = filter.ownerTrashNameCountGte;
    if (gate === undefined) return true;
    const tokens = gate.tokens.map((token) => token.toLowerCase());
    const matches = Array.from(ctx.game.player(ownerSeat).trash).filter((card) => {
      const name = ctx.game.definitionOf(card).nameEn.toLowerCase();
      return tokens.some((token) => name.includes(token));
    }).length;
    return matches >= gate.count;
  };
  for (const seat of seats) {
    for (const zone of zones) {
      for (const cand of looseCardsInZone(ctx, seat, zone)) {
        if (seen.has(cand.instanceId)) continue;
        // `target.source: "thisDigimon"` narrows only hosted-card zones. A combined
        // hand/digivolution-card pool (EX12-034) may still use any qualifying hand card, but a
        // digivolution-card candidate must be under the resolving source permanent rather than
        // under the Digimon whose leave event triggered the replacement.
        if (fromThisDigimon && (zone === "digivolutionCards" || zone === "linked")) {
          const selfPermanentId = ctx.source.permanent()?.permanentId;
          if (selfPermanentId === undefined || cand.hostPermanentId !== selfPermanentId) continue;
        }
        const def = ctx.game.definitionOf({ cardId: cand.cardId } as never);
        const hostMatches = (filter: Filter): boolean => {
          const hostFilter = filter.hostFilter;
          if (
            (zone !== "digivolutionCards" && zone !== "linked") ||
            hostFilter === undefined ||
            cand.hostPermanentId === undefined
          )
            return true;
          if (hostFilter.sourceRef === "triggerSubject") {
            const triggerSubjectId =
              ctx.trigger.subjectPermanentId ?? ctx.trigger.attackerPermanentId ?? ctx.trigger.deletedPermanentId;
            return cand.hostPermanentId === triggerSubjectId;
          }
          if (hostFilter.isSelfRef === true) {
            return ctx.source.permanent()?.permanentId === cand.hostPermanentId;
          }
          const boundRef = (hostFilter as { boundRef?: string }).boundRef;
          if (boundRef !== undefined) {
            return ctx.selections?.get(boundRef) === cand.hostPermanentId;
          }
          const host = ctx.game.permanentById(cand.hostPermanentId);
          return host === undefined || permanentMatchesFilter(ctx, host, hostFilter, ctx.source);
        };
        const branchMatches = (filter: Filter): boolean => {
          const branchZones =
            filter.zone === undefined ? undefined : Array.isArray(filter.zone) ? filter.zone : [filter.zone];
          if (branchZones !== undefined && !branchZones.includes(zone)) return false;
          // A hostFilter on the common target constrains only hosted candidates; the same
          // target may explicitly pool loose trash/hand cards (BT24-077/079). A hostFilter
          // declared by one OR branch is different: it qualifies that branch itself, so a
          // loose candidate cannot satisfy it (BT13-019's breeding-only Royal Knight branch).
          if (
            filter.hostFilter !== undefined &&
            zone !== "digivolutionCards" &&
            zone !== "linked" &&
            branchSpecificHostFilters.has(filter.hostFilter)
          )
            return false;
          // LM-023 Q5516: an Option's "use cost" can be reduced while it is
          // in hand. This ceiling deliberately queries the shared cost ledger
          // instead of the card's printed play cost.
          if (filter.effectiveUseCostLte !== undefined) {
            const effectiveCost = ctx.fx.effectiveLooseUseCost?.(cand.instanceId, seat);
            if (effectiveCost === undefined || effectiveCost > filter.effectiveUseCostLte) return false;
          }
          // Context predicates are not definition predicates. Apply same-level watcher bounds
          // before delegating to definitionMatches so hand/trash costs discriminate against the
          // played or deleted event subject (EX4-023/EX4-052). A level-less subject or candidate
          // cannot satisfy "the same level" (EX4-023 Q3465).
          if (filter.levelEqTriggerSource === true) {
            const bound = triggerSourceLevel(ctx);
            if (bound === undefined || def.level === undefined || def.level !== bound) return false;
          }
          if (filter.levelLteTriggerSource === true) {
            const bound = triggerSourceLevel(ctx);
            if (bound === undefined || def.level === undefined || def.level > bound) return false;
          }
          // `isSelfRef` belongs to the individual union branch, not the primary filter.
          // EX11-027 can link either this resolving card OR a Maquinamon from hand; applying
          // the primary branch's self gate to the whole union incorrectly removes the hand
          // branch. On stack zones self refers to this Digimon's hosted cards.
          if (filter.isSelfRef === true && cand.instanceId !== ctx.source.instanceId) {
            const selfPermanentId = ctx.source.permanent()?.permanentId;
            const hostIsSelf =
              (zone === "digivolutionCards" || zone === "linked") && cand.hostPermanentId === selfPermanentId;
            if (!hostIsSelf) return false;
          }
          if (filter.dpAtMostScaling !== undefined) {
            const cap =
              (filter.dpAtMost ?? 0) + scaleFactor(ctx, filter.dpAtMostScaling) * (filter.dpAtMostScaling.bonus ?? 1);
            if ((def.dp ?? 0) > cap) return false;
            const { dpAtMost: _baseCap, dpAtMostScaling: _scaledCap, ...staticFilter } = filter;
            return (
              definitionMatches(staticFilter, def) && contextMatches(filter, cand.ownerSeat) && hostMatches(filter)
            );
          }
          return definitionMatches(filter, def) && contextMatches(filter, cand.ownerSeat) && hostMatches(filter);
        };
        if (!allFilters.some(branchMatches)) continue;
        // hostFilter: when sourcing from digivolutionCards, gate on the host permanent's kind
        // (e.g. "from under your Tamers" — BT10-093), OR require the host to BE the source's
        // own permanent ("this Digimon's digivolution cards" — BT9-111, hostFilter.isSelfRef).
        // Resolve it from the matching OR branch as well; cards such as BT13-019 combine
        // trash and breeding-area digivolution-card sources in one target.
        const matchedFilter = allFilters.find(branchMatches);
        if (matchedFilter?.sameColorAsSelectionRef !== undefined) {
          const referenceId = ctx.selections?.get(matchedFilter.sameColorAsSelectionRef);
          const reference = referenceId === undefined ? undefined : ctx.game.permanentById(referenceId);
          if (reference?.topCard === undefined) continue;
          const referenceColors =
            ctx.game.effectiveColors?.(reference) ?? ctx.game.definitionOf(reference.topCard).colors;
          if (!def.colors.some((color) => referenceColors.includes(color))) continue;
        }
        if (
          matchedFilter?.sameColorAsReturned === true &&
          !def.colors.some((color) => ctx.lastReturnedColors?.includes(color) === true)
        )
          continue;
        if (matchedFilter?.faceUp === true && cand.faceUp !== true) continue;
        if (matchedFilter?.faceUp === false && cand.faceUp === true) continue;
        if (matchedFilter?.faceDown === true && cand.faceUp === true) continue;
        if (zone === "security" && (matchedFilter?.position === "top" || matchedFilter?.position === "bottom")) {
          const security = ctx.game.player(seat).security;
          const positioned = matchedFilter.position === "top" ? security[0] : security.at(-1);
          if (positioned?.instanceId !== cand.instanceId) continue;
        }
        if (cand.hostPermanentId && target.filter.position === "top") {
          const host = ctx.game.permanentById(cand.hostPermanentId);
          const topStackCard = host?.stack.at(-1);
          if (topStackCard?.instanceId !== cand.instanceId) continue;
        }
        if (cand.hostPermanentId && target.filter.position === "bottom") {
          const host = ctx.game.permanentById(cand.hostPermanentId);
          // Q4785: "bottom face-down" skips visible sources below the lowest hidden
          // source. Unqualified bottom selection still means the physical stack bottom.
          const bottomStackCard =
            target.filter.faceDown === true ? host?.stack.find((card) => !card.faceUp) : host?.stack.at(0);
          if (bottomStackCard?.instanceId !== cand.instanceId) continue;
        }
        // withinBottomN: candidate must sit among the bottom N stack positions of its host
        // (EX9-073 "its bottom 2 ... digivolution cards" — broader than the single-card
        // `position: "bottom"` above).
        if (cand.hostPermanentId && target.filter.withinBottomN !== undefined) {
          const host = ctx.game.permanentById(cand.hostPermanentId);
          const idx = host?.stack.findIndex((c) => c.instanceId === cand.instanceId) ?? -1;
          if (idx < 0 || idx >= target.filter.withinBottomN) continue;
        }
        // faceDownOrTrait: candidate qualifies when face-down (regardless of trait) OR its
        // definition carries the named trait (EX9-073 "face-down or [Cyborg] trait").
        if (target.filter.faceDownOrTrait !== undefined) {
          const isFaceDown = cand.faceUp !== true;
          const hasTrait = matchNameOrTrait(def, target.filter.faceDownOrTrait);
          if (!isFaceDown && !hasTrait) continue;
        }
        seen.add(cand.instanceId);
        out.push(cand);
      }
    }
  }
  return out;
}

export function findLooseCandidateByInstance(ctx: EffectContext, instanceId: string): LooseCandidate | undefined {
  const zones: ZoneRef[] = ["hand", "trash", "deck", "security", "breeding", "digivolutionCards", "linked"];
  for (const seat of [ctx.source.ownerSeat, ctx.game.opponentOf(ctx.source.ownerSeat)]) {
    for (const zone of zones) {
      const found = looseCardsInZone(ctx, seat, zone).find((candidate) => candidate.instanceId === instanceId);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * Prompt `asker` to pick up to `count` of `candidates` (min = count unless the target is
 * "up to"); returns the chosen instance ids. A trivial choice (<=count candidates and not
 * "up to") is auto-resolved without prompting anyone. `asker` defaults to `ctx.ask` (the
 * effect's controller); a `Trash`/`HandManipulation` action with `chooser: "opponent"`
 * (e.g. "your opponent trashes 1 card in their hand") passes `requireOpponentAsk(ctx)`
 * instead, so the OWNER of the candidate hand picks their own card rather than the
 * controller reaching into it.
 */
export async function pickLoose(
  ctx: EffectContext,
  target: Target,
  candidates: LooseCandidate[],
  cap?: number,
  asker: SeatScopedDecisionApi = ctx.ask,
  visible?: string[],
): Promise<string[]> {
  if (candidates.length === 0) return [];
  const visibleCards = visible
    ?.map((instanceId) => findLooseCandidateByInstance(ctx, instanceId))
    .filter((candidate): candidate is LooseCandidate => candidate !== undefined)
    .map(({ instanceId, cardId }) => ({ instanceId, cardId }));
  // An optional server-computed `cap` (e.g. a Digimon's remaining link headroom) bounds how
  // many cards may be selected, regardless of the IR `count`. It never widens the request.
  const requested = target.count === "all" ? candidates.length : effectiveTargetCount(ctx, target);
  const want = cap === undefined ? requested : Math.min(requested, cap);
  // If differentColors constraint, we need to validate the selection even when every
  // candidate would otherwise be auto-selected.
  const requireDifferentColors = target.filter?.differentColors === true;
  const requireDistinctNames = target.filter?.distinctNames === true || target.distinctNames === true;
  const requireDistinctCardNumbers = target.distinctCardNumbers === true;
  const requireDistinctLevels = target.distinctLevels === true;
  const requiredNamesExact = target.requiredNamesExact ?? [];
  const requiredNamesExactUpTo = target.requiredNamesExactUpTo ?? [];
  if (requiredNamesExact.length > 0) {
    const chosen: string[] = [];
    const used = new Set<string>();
    for (const requiredName of requiredNamesExact) {
      const matching = candidates.filter((candidate) => {
        if (used.has(candidate.instanceId)) return false;
        const def = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
        return def.nameEn === requiredName;
      });
      if (matching.length === 0) return [];
      let picked: string | undefined;
      if (matching.length === 1) {
        picked = matching[0]!.instanceId;
      } else {
        picked = (
          await asker.selectCards(ctx, {
            candidates: matching.map((candidate) => candidate.instanceId),
            min: 1,
            max: 1,
            visible,
            visibleCards,
          })
        )[0];
      }
      if (picked === undefined || used.has(picked)) return [];
      used.add(picked);
      chosen.push(picked);
    }
    return chosen;
  }
  if (requiredNamesExactUpTo.length > 0) {
    const chosen: string[] = [];
    const used = new Set<string>();
    for (const requiredName of requiredNamesExactUpTo) {
      const matching = candidates.filter((candidate) => {
        if (used.has(candidate.instanceId)) return false;
        return ctx.game.definitionOf({ cardId: candidate.cardId } as never).nameEn === requiredName;
      });
      if (matching.length === 0) continue;
      const picked =
        matching.length === 1
          ? matching[0]!.instanceId
          : (
              await asker.selectCards(ctx, {
                candidates: matching.map((candidate) => candidate.instanceId),
                min: 1,
                max: 1,
                visible,
                visibleCards,
              })
            )[0];
      if (picked !== undefined && !used.has(picked)) {
        used.add(picked);
        chosen.push(picked);
      }
    }
    return chosen;
  }
  if (requireDistinctNames) {
    const groups = new Map<string, LooseCandidate[]>();
    for (const candidate of candidates) {
      const def = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
      const key = (def.nameEn ?? candidate.cardId).toLowerCase();
      const group = groups.get(key) ?? [];
      group.push(candidate);
      groups.set(key, group);
    }
    const groupList = [...groups.values()];
    if (groupList.length === 0) return [];
    const distinctWant = target.count === "all" ? groupList.length : Math.min(want, groupList.length);
    if (!target.upTo && groupList.length < distinctWant) return [];
    if (target.upTo) {
      const ids = groupList.flatMap((group) => group.map((candidate) => candidate.instanceId));
      const picked = await asker.selectCards(ctx, {
        candidates: ids,
        min: 0,
        max: distinctWant,
        visible,
        visibleCards,
      });
      const chosen: string[] = [];
      const seenNames = new Set<string>();
      for (const instanceId of picked) {
        const candidate = candidates.find((c) => c.instanceId === instanceId);
        if (candidate === undefined) continue;
        const def = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
        const key = (def.nameEn ?? candidate.cardId).toLowerCase();
        if (seenNames.has(key)) continue;
        seenNames.add(key);
        chosen.push(instanceId);
      }
      return chosen;
    }
    const chosen: string[] = [];
    for (const group of groupList.slice(0, distinctWant)) {
      if (group.length === 1) {
        chosen.push(group[0]!.instanceId);
        continue;
      }
      const picked = await asker.selectCards(ctx, {
        candidates: group.map((c) => c.instanceId),
        min: 1,
        max: 1,
        visible,
        visibleCards,
      });
      const id = picked[0];
      if (id !== undefined) chosen.push(id);
    }
    return chosen;
  }
  if (requireDistinctCardNumbers) {
    const groups = new Map<string, LooseCandidate[]>();
    for (const candidate of candidates) {
      const group = groups.get(candidate.cardId) ?? [];
      group.push(candidate);
      groups.set(candidate.cardId, group);
    }
    const distinctWant = target.count === "all" ? groups.size : Math.min(want, groups.size);
    if (!target.upTo && groups.size < distinctWant) return [];
    const ids = [...groups.values()].flatMap((group) => group.map((candidate) => candidate.instanceId));
    const picked = await asker.selectCards(ctx, {
      candidates: ids,
      min: target.upTo ? 0 : distinctWant,
      max: distinctWant,
      distinctCardIds: true,
      visible,
      visibleCards,
    });
    const chosen: string[] = [];
    const seenCardIds = new Set<string>();
    for (const instanceId of picked) {
      const candidate = candidates.find((item) => item.instanceId === instanceId);
      if (candidate === undefined || seenCardIds.has(candidate.cardId)) continue;
      seenCardIds.add(candidate.cardId);
      chosen.push(instanceId);
    }
    return chosen;
  }
  if (requireDistinctLevels) {
    const chosen: string[] = [];
    const usedLevels = new Set<number>();
    const distinctLevelCount = new Set(
      candidates
        .map((candidate) => ctx.game.definitionOf({ cardId: candidate.cardId } as never).level)
        .filter((level): level is number => level !== undefined),
    ).size;
    const distinctWant = target.count === "all" ? distinctLevelCount : Math.min(want, distinctLevelCount);
    if (!target.upTo && distinctLevelCount < want) return [];
    while (chosen.length < distinctWant) {
      const eligible = candidates.filter((candidate) => {
        const level = ctx.game.definitionOf({ cardId: candidate.cardId } as never).level;
        return level !== undefined && !usedLevels.has(level) && !chosen.includes(candidate.instanceId);
      });
      if (eligible.length === 0) break;
      const picked = await asker.selectCards(ctx, {
        candidates: eligible.map((candidate) => candidate.instanceId),
        min: target.upTo ? 0 : 1,
        max: 1,
        visible,
        visibleCards,
      });
      const instanceId = picked[0];
      if (instanceId === undefined) break;
      const candidate = eligible.find((item) => item.instanceId === instanceId);
      if (candidate === undefined) break;
      const level = ctx.game.definitionOf({ cardId: candidate.cardId } as never).level;
      if (level === undefined) break;
      usedLevels.add(level);
      chosen.push(instanceId);
    }
    return chosen;
  }
  if (target.count === "all" && cap === undefined && !target.upTo && !requireDifferentColors)
    return candidates.map((c) => c.instanceId);
  if (candidates.length <= want && !target.upTo && !requireDifferentColors && target.forceSelection !== true)
    return candidates.slice(0, want).map((c) => c.instanceId);
  const ids = candidates.map((c) => c.instanceId);
  const min = target.upTo ? Math.min(target.minimum ?? 0, candidates.length) : Math.min(want, candidates.length);
  const max = Math.min(want, candidates.length);

  let chosen = await asker.selectCards(ctx, {
    candidates: ids,
    min,
    max,
    differentColors: requireDifferentColors,
    visible,
    visibleCards,
  });

  // Enforce differentColors: if violated, filter to a valid subset.
  // Per CR 4-24-2 a multicolor card only needs ONE color no other pick uses, so two
  // Red/Blue cards are a legal "different colors" pair (one read as red, one as blue).
  if (requireDifferentColors && chosen.length > 1) {
    chosen = filterToDistinctColors(
      chosen.filter((instanceId) => candidates.some((c) => c.instanceId === instanceId)),
      (instanceId) => {
        const cand = candidates.find((c) => c.instanceId === instanceId)!;
        return ctx.game.definitionOf({ cardId: cand.cardId } as never).colors ?? [];
      },
    );
  }

  return chosen;
}
