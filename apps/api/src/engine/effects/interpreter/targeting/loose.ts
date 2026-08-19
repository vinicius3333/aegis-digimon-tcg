// Resolving a Target into loose cards in hand, deck, trash, security, and stacks.

import type { EffectContext, SeatScopedDecisionApi } from "../../EffectContext.js";
import { definitionMatches, matchNameOrTrait } from "../matching/definition.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { effectiveTargetCount } from "./permanents.js";
import { filterToDistinctColors } from "@aegis/shared";
import type { Seat, Target, ZoneRef } from "@aegis/shared";

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
  const collect = (cards: ArrayLike<{ instanceId: string; cardId: string; ownerSeat: Seat }>): void => {
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]!;
      out.push({ instanceId: c.instanceId, cardId: c.cardId, ownerSeat: c.ownerSeat });
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
      // "from under your Tamers/Digimon" — every digivolution card of every battle-area
      // permanent this seat controls (the cards stacked beneath each top card).
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
      break;
    }
    case "underMyTamers":
    case "underTamers":
    // `underTamer` (singular) is another alias used in PlaceUnder target filters (BT19-081).
    case "underTamer": {
      // Cards stacked beneath the controller's Tamer permanents only (not under Digimon).
      // `underTamers`/`underTamer` are zone aliases for `underMyTamers` (BT19-026/BT19-081).
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
    default:
      break;
  }
  return out;
}

/**
 * Resolve a Target's filter to candidate loose instance ids across `zones`. Exported so a
 * card A3 can prove the load-bearing filter-resolution path discriminates (e.g. BT25-089's
 * `hasLinkRequirement` ＜Link＞-capability gate over hand/digivolution link material).
 */
export function candidateLooseInstances(ctx: EffectContext, target: Target, zones: ZoneRef[]): LooseCandidate[] {
  // `orFilters`: a card qualifies if it matches the primary filter OR any alternative
  // ("play 1 [X] or 1 [Y]", BT17-074). Union the controller scope across all alternatives.
  const allFilters = [target.filter, ...(target.orFilters ?? [])];
  const seatSet = new Set<Seat>();
  for (const f of allFilters) for (const s of seatsForController(ctx, f)) seatSet.add(s);
  const seats = [...seatSet];
  const seen = new Set<string>();
  const out: LooseCandidate[] = [];
  for (const seat of seats) {
    for (const zone of zones) {
      for (const cand of looseCardsInZone(ctx, seat, zone)) {
        if (seen.has(cand.instanceId)) continue;
        if (target.filter.isSelfRef === true && cand.instanceId !== ctx.source.instanceId) continue;
        const def = ctx.game.definitionOf({ cardId: cand.cardId } as never);
        if (!allFilters.some((f) => definitionMatches(f, def))) continue;
        // hostFilter: when sourcing from digivolutionCards, gate on the host permanent's kind
        // (e.g. "from under your Tamers" — BT10-093), OR require the host to BE the source's
        // own permanent ("this Digimon's digivolution cards" — BT9-111, hostFilter.isSelfRef).
        // Resolve it from the matching OR branch as well; cards such as BT13-019 combine
        // trash and breeding-area digivolution-card sources in one target.
        const matchedFilter = allFilters.find((filter) => definitionMatches(filter, def));
        if (matchedFilter?.faceUp === true && cand.faceUp !== true) continue;
        if (matchedFilter?.faceUp === false && cand.faceUp === true) continue;
        const hostFilter = matchedFilter?.hostFilter;
        if (zone === "digivolutionCards" && hostFilter && cand.hostPermanentId) {
          if (hostFilter.isSelfRef === true) {
            const self = ctx.source.permanent();
            if (self === undefined || self.permanentId !== cand.hostPermanentId) continue;
          } else {
            const host = ctx.game.permanentById(cand.hostPermanentId);
            if (host && !permanentMatchesFilter(ctx, host, hostFilter, ctx.source)) continue;
          }
        }
        if (cand.hostPermanentId && target.filter.position === "top") {
          const host = ctx.game.permanentById(cand.hostPermanentId);
          const topStackCard = host?.stack.at(-1);
          if (topStackCard?.instanceId !== cand.instanceId) continue;
        }
        if (cand.hostPermanentId && target.filter.position === "bottom") {
          const host = ctx.game.permanentById(cand.hostPermanentId);
          const bottomStackCard = host?.stack.at(0);
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
  const zones: ZoneRef[] = ["hand", "trash", "deck", "security", "breeding", "digivolutionCards"];
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
  if (target.count === "all" && cap === undefined && !requireDifferentColors)
    return candidates.map((c) => c.instanceId);
  if (candidates.length <= want && !target.upTo && !requireDifferentColors)
    return candidates.slice(0, want).map((c) => c.instanceId);
  const ids = candidates.map((c) => c.instanceId);
  const min = target.upTo ? 0 : Math.min(want, candidates.length);
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
