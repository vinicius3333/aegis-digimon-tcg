import { CardKind, isTamer, type CardDefinition } from "@aegis/shared";
import type { Filter } from "@aegis/shared/effects/ir/filters/filter.js";
import type { CardInstance } from "@aegis/shared/schema/CardInstance.js";
import type { Permanent } from "@aegis/shared/schema/Permanent.js";
import { matchNameOrTrait } from "./interpreter/matching/definition.js";

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
 * §17-1-3-2-6/§17-1-3-2-7's category gate, parsed from the printed
 * `CardDefinition.linkRequirement` header ("[Link] [Appmon] trait: Cost 1"). The
 * STRUCTURED `LinkRequirement[]` array on `CompiledCard` (packages/shared/src/effects/ir/requirements.ts)
 * exists but is populated only on the 2 hand-authored cards that reference it in an
 * effect body (BT25-045, EX10-029) — every AUTO-GENERATED card (BT21-009 among them,
 * the fixture this rule check is proven against) carries the requirement ONLY as this
 * flat string, so that array cannot be the source of truth for a check meant to cover
 * all ~70 real link cards. Every observed printed form (`node tools/kb/query.mjs rules
 * "link"` + a full scan of `cards.json.linkRequirement`) is one of four shapes:
 *   "[Link] [<Trait>] trait: Cost N"   -> trait
 *   "[Link] [<Name>] in text: Cost N"  -> name/trait/text union ("has X in its text")
 *   "[Link] [<Name>]: Cost N"          -> name
 *   "[Link] Lv.N or higher: Cost N"    -> level floor
 * The printed cost is enforced at declaration time (existing `canLinkToTargetPermanent`
 * / `linkCostOf` seams), not re-checked here — this gate only re-evaluates the CATEGORY
 * against the live host, which is what §17-1-3-2-6/§17-1-3-2-7 asks a rule-check sweep
 * to keep honest as the host's own traits/name/level can never change after linking.
 */
export function parseLinkCategory(
  req: string,
): { tokens: string[]; match: "trait" | "name" | "text" } | { minLevel: number } | undefined {
  const trait = /^\[Link\]\s*\[(.+?)\]\s*trait\s*:/i.exec(req);
  if (trait?.[1] !== undefined) return { tokens: [trait[1]], match: "trait" };
  const inText = /^\[Link\]\s*\[(.+?)\]\s*in text\s*:/i.exec(req);
  if (inText?.[1] !== undefined) return { tokens: [inText[1]], match: "text" };
  const name = /^\[Link\]\s*\[(.+?)\]\s*:/i.exec(req);
  if (name?.[1] !== undefined) return { tokens: [name[1]], match: "name" };
  const level = /^\[Link\]\s*Lv\.(\d+)\s*or higher\s*:/i.exec(req);
  if (level?.[1] !== undefined) return { minLevel: Number(level[1]) };
  return undefined;
}

/**
 * Whether a link card's printed `<Link>` category ("[Link] [Appmon] trait: Cost 1") admits
 * the host. Unparseable or missing requirements impose no category gate.
 */
export function linkCategoryAllowsHost(hostDef: CardDefinition, linkDef: CardDefinition): boolean {
  const req = linkDef.linkRequirement;
  if (typeof req !== "string" || req.length === 0 || req === "-") return true;
  const parsed = parseLinkCategory(req);
  if (parsed === undefined) return true;
  if ("minLevel" in parsed) return hostDef.level !== undefined && hostDef.level >= parsed.minLevel;
  return matchNameOrTrait(hostDef, parsed);
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
  allowBreedingRecipient = false,
): boolean {
  const def = recipient.topCard ? definitionOf(recipient.topCard) : undefined;
  if (def === undefined) return false;
  if (recipient.inBreeding && !allowBreedingRecipient) return false;
  // CR 4-3-1: a Digi-Egg on the field is a Digimon, so a breeding-area link may take one (KB Q6443).
  const breedingDigiEgg = recipient.inBreeding && def.kinds.includes(CardKind.DigiEgg);
  if (!def.kinds.includes(CardKind.Digimon) && !breedingDigiEgg) return false;
  if (def.isToken) return false;
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
