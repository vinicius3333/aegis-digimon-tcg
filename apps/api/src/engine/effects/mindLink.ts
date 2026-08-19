import { CardKind, isTamer, type CardDefinition } from "@aegis/shared";
import type { Filter } from "@aegis/shared/effects/ir/filters/filter.js";
import type { CardInstance } from "@aegis/shared/schema/CardInstance.js";
import type { Permanent } from "@aegis/shared/schema/Permanent.js";

/**
 * Link target eligibility (KB Q4881): a card may be linked only if it carries the
 * <Link> mechanic. The prerequisite is structured — `CardDefinition.linkRequirement`
 * (e.g. "[Link] [Appmon] trait: Cost 1") — and is NOT mirrored into effectText, so
 * text scanning (textHasKeyword) cannot detect it. The guard reads the structured
 * authoritative semantics here.
 */
export function linkEligible(targetDef: CardDefinition): boolean {
  const req = targetDef.linkRequirement;
  // Mirror the `definitionMatches` hasLinkRequirement gate: a present, non-empty value that is
  // not the `'-'` sentinel. (Export already normalizes `'-'`/empty away, so the sentinel check is
  // defensive; both call sites stay byte-identical.)
  return typeof req === "string" && req.length > 0 && req !== "-";
}

/**
 * Base per-Digimon link limit (documented behavior `Permanent.LinkedMax` seeds `int Max = 1`,
 * documented behavior). Every active `<Link +N>` grant is summed on top of this base.
 */
export const BASE_LINK_MAX = 1;

/** What `linkMax` needs from the engine: the summed `<Link +N>` delta for a permanent. */
export interface LinkMaxDeps {
  linkMaxDelta: (permanentId: string) => number;
}

/**
 * A permanent's EFFECTIVE link limit: the base 1
 * plus the sum of every active `<Link +N>` grant whose continuous entry is keyed to this
 * permanent. A grant keyed
 * to a different permanent does not raise this one's limit. Server-authoritative: the cap
 * is derived here, never supplied by a client.
 */
export function linkMax(permanent: Permanent, deps: LinkMaxDeps): number {
  return BASE_LINK_MAX + deps.linkMaxDelta(permanent.permanentId);
}

/**
 * Dynamic recipient-eligibility for a link (documented behavior `CardSource.CanLinkToTargetPermanent`,
 * documented behavior): a permanent may RECEIVE a link card only when it is a non-token
 * Digimon that is not in the breeding area AND satisfies the link card's structured target
 * condition (`linkRequirement`, re-evaluated against current state, not printed text). The
 * runLink, so this predicate covers the dynamic `linkCondition.digimonCondition` gate.
 * Server-authoritative: an ineligible recipient is excluded from the offered set; a client
 * link intent against it is rejected by exclusion (never trusted — V4/V5).
 */
export function canLinkToTargetPermanent(
  recipient: Permanent,
  filter: Filter,
  matchesFilter: (permanent: Permanent, filter: Filter) => boolean,
  definitionOf: (card: CardInstance) => CardDefinition,
): boolean {
  const def = recipient.topCard ? definitionOf(recipient.topCard) : undefined;
  if (def === undefined || !def.kinds.includes(CardKind.Digimon)) return false;
  if (def.isToken) return false;
  if (recipient.inBreeding) return false;
  return matchesFilter(recipient, filter);
}

/** True when the permanent's digivolution stack contains a face-up Tamer card. */
export function hasTamerInDigivolutionStack(
  permanent: Permanent,
  definitionOf: (card: CardInstance) => CardDefinition,
): boolean {
  for (const card of permanent.stack) {
    if (!card.faceUp) continue;
    if (isTamer(definitionOf(card))) return true;
  }
  return false;
}

/** Mind Link target guard: non-token Digimon with no Tamer in its digivolution cards. */
export function digimonEligibleForMindLink(
  permanent: Permanent,
  filter: Filter,
  matchesFilter: (permanent: Permanent, filter: Filter) => boolean,
  definitionOf: (card: CardInstance) => CardDefinition,
): boolean {
  const def = permanent.topCard ? definitionOf(permanent.topCard) : undefined;
  if (def === undefined || !def.kinds.includes(CardKind.Digimon)) return false;
  if (filter.excludeToken !== false && def.isToken) return false;
  if (hasTamerInDigivolutionStack(permanent, definitionOf)) return false;
  if (filter.digivolutionCards === "none" && permanent.stack.length > 0) return false;
  return matchesFilter(permanent, filter);
}
