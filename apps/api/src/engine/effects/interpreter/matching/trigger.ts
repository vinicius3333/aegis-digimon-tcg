// Matching a filter against the payload of the firing trigger event.

import type { EffectContext } from "../../EffectContext.js";
import { matchNameOrTrait } from "./definition.js";
import { permanentMatchesFilter, seatsForController } from "./permanent.js";
import type { Filter } from "@aegis/shared";

/**
 * Resolve the permanent whose entry/exit drove a SubTrigger event (the played card, the
 * deleted permanent, the attacker, …) from the freshly bound context's `trigger` payload,
 * and test the captured `sourceFilter` against it. Controller scope ("mine"/"opponent") is
 * checked relative to the watcher's source seat (via `seatsForController`, exactly as the
 * normal target enumeration does); the rest of the filter (kind/colors/level/trait/DP) goes
 * through `permanentMatchesFilter`. An unresolved subject never matches (the event is not
 * about a card this watcher cares for).
 */
export function matchingSubjectPermanentIds(subCtx: EffectContext, filter: Filter): string[] {
  const t = subCtx.trigger;
  const subjectIds =
    t.subjectPermanentIds ??
    [
      t.subjectPermanentId ??
        t.attackerPermanentId ??
        t.deletedPermanentId ??
        t.suspendedPermanentId ??
        t.unsuspendedPermanentId,
    ].filter((id): id is string => id !== undefined);
  if (subjectIds.length === 0) return [];
  // A POSITIVE self-gate: `isSelfRef: true` means the event subject must BE this watcher's own
  // card.PermanentOfThisCard()`). permanentMatchesFilter only enforces the NEGATIVE excludeSelf /
  // isSelfRef===false direction, so the positive restriction lives here at the subject seam.
  // `fromDigivolution: true` gates on the played card having originated from a digivolution
  // stack. The `whenPlayed` fire seam sets TriggerInfo.playedFromZone to "digivolutionCards"
  // when the played instance came from a battle-area permanent's digivolution stack (BT20-028
  // KB Q4321: "when any of your Digimon are played from digivolution cards").
  if (filter.fromDigivolution === true && subCtx.trigger.playedFromZone !== "digivolutionCards") {
    return [];
  }
  // `byEffect: true` gates a "when an EFFECT plays [X]" watcher (KB Q3665/Q6034) — a manual
  // hand/board play never sets TriggerInfo.playedByEffect (see the whenPlayed fire seams in
  // primitives.ts / GameEngine.ts), so it fails this check and the watcher does not fire.
  if (filter.byEffect === true && subCtx.trigger.playedByEffect !== true) {
    return [];
  }
  let effectiveFilter = filter;
  if (filter.zone !== undefined && filter.zone !== "battleArea" && subCtx.trigger.playedFromZone !== undefined) {
    if (subCtx.trigger.playedFromZone !== filter.zone) return [];
    effectiveFilter = { ...filter, zone: undefined };
  }
  const allowedSeats = seatsForController(subCtx, effectiveFilter);
  return subjectIds.filter((subjectId) => {
    const subject = subCtx.game.permanentById(subjectId);
    if (subject === undefined) return false;
    if (filter.isSelfRef === true) {
      const self = subCtx.source.permanent();
      if (self === undefined || self.permanentId !== subject.permanentId) return false;
    }
    if (!allowedSeats.includes(subject.controllerSeat)) return false;
    return permanentMatchesFilter(subCtx, subject, effectiveFilter, subCtx.source);
  });
}

export function subjectMatchesFilter(subCtx: EffectContext, filter: Filter): boolean {
  return matchingSubjectPermanentIds(subCtx, filter).length > 0;
}

/**
 * whenAddSecurity trait gate: did at least one card JUST ADDED to the watcher controller's
 * security stack (TriggerInfo.addedToSecurityInstanceIds) match `filter`, while being FACE UP?
 * EqualsTraits("Zaxon"))`). A ＜Recovery＞-style face-down add never satisfies it. An absent
 * filter (no trait clause) means "any added card" — but the IR always carries the trait filter.
 */
export function triggerAddedSecurityMatches(ctx: EffectContext, filter: Filter | undefined): boolean {
  const ids = ctx.trigger.addedToSecurityInstanceIds;
  if (ids === undefined || ids.length === 0) return false;
  const seat = ctx.trigger.addedToSecuritySeat ?? ctx.source.ownerSeat;
  const security = ctx.game.player(seat).security;
  for (const id of ids) {
    const card = security.find((c) => c.instanceId === id);
    if (card === undefined || card.faceUp !== true) continue;
    if (filter === undefined) return true;
    const def = ctx.game.definitionOf({ cardId: card.cardId } as never);
    if (filter.nameOrTrait && filter.nameOrTrait.length > 0) {
      if (filter.nameOrTrait.some((ref) => matchNameOrTrait(def, ref))) return true;
    }
  }
  return false;
}

/**
 * triggerSubjectHasColor gate: does the permanent that drove this SubTrigger event
 * (TriggerInfo.subjectPermanentId — the just-played / just-digivolved Digimon) carry one of
 * (`permanent.TopCard.CardColors.Contains(CardColor.Red)`), read at activation (fire) time so
 * a Digimon that digivolved to a red stage is checked POST-digivolve (KB Q6290/Q6291). An
 * unresolved subject, a subject with no top card, or an absent color filter never matches.
 */
export function triggerSubjectMatchesColor(ctx: EffectContext, filter: Filter | undefined): boolean {
  const wanted = filter?.colors;
  if (wanted === undefined || wanted.length === 0) return false;
  const subjectId = ctx.trigger.subjectPermanentId;
  if (subjectId === undefined) return false;
  const subject = ctx.game.permanentById(subjectId);
  if (subject?.topCard === undefined) return false;
  const colors = ctx.game.definitionOf(subject.topCard).colors;
  return wanted.some((w) => colors.includes(w as never));
}

export function triggerSubjectMatchesFilter(ctx: EffectContext, filter: Filter | undefined): boolean {
  if (filter === undefined) return false;
  const subjectId = ctx.trigger.subjectPermanentId;
  if (subjectId === undefined) return false;
  const subject = ctx.game.permanentById(subjectId);
  if (subject === undefined) return false;
  return permanentMatchesFilter(ctx, subject, filter, ctx.source);
}
