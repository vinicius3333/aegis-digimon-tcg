// Matching a filter against a CARD DEFINITION, with no board state involved.

import { runtimeCompiledCard } from "../compiledCards.js";
import { COLOR_MAP, KIND_MAP } from "../maps.js";
import { CardColor, CardKind, digiXrosRequirementFor, effectiveStaticNames } from "@aegis/shared";
import type { CardDefinition, Filter } from "@aegis/shared";

export interface DefinitionFacts {
  /** The card id; present on every real `CardDefinition`, used for registry lookups (DigiXros). */
  cardId?: string;
  kinds: CardKind[];
  colors: CardColor[];
  level?: number;
  nameEn: string;
  types?: string[];
  forms?: string[];
  attributes?: string[];
  effectText?: string;
  inheritedEffectText?: string;
  playCost: number;
  /** Printed DP (0 for non-Digimon cards). Used by the dp filter in definitionMatches for loose cards. */
  dp?: number;
  /** source `LinkRequirement` header ("[Link] [Appmon] trait: Cost N"); present iff the card can be linked. */
  linkRequirement?: string;
  /** Synthetic token card (not in deck; spawned by effects). Mirrors `CardDefinition.isToken`. */
  isToken?: boolean;
}

/**
 * Whether a card definition carries a ＜Link＞ requirement of its own (it CAN be linked).
 * `LinkRequirement` field is empty or the `'-'` sentinel for non-linkable cards, and a
 * `[Link] ... : Cost N` string for linkable ones (export normalizes `'-'`/empty away, so a
 * present non-empty value is authoritative). Shared by `definitionMatches` and `mindLink`.
 */
function hasLinkRequirement(def: { linkRequirement?: string }): boolean {
  const req = def.linkRequirement;
  return typeof req === "string" && req.length > 0 && req !== "-";
}

/**
 * Best-effort structured-{@link Filter} extraction from a `GrantStatic grant:
 * { copyEffectsFromDigivolution: { filter: "<raw printed clause>" } }` string (BT16-062,
 * BT22-078, EX10-059) — the compiler captured the printed clause instead of a structured
 * filter. Recognizes the three shapes those three cards actually use: "[X] in ... names"
 * (name match), "[X] trait" (trait match), and "level N". Returns undefined when the text
 * doesn't match a known shape, so the caller can fail loudly instead of silently granting
 * nothing or granting too broadly.
 */
export function parseCopyEffectsFilterText(raw: string): Filter | undefined {
  const nameMatch = raw.match(/\[([^[\]]+)\] in (?:its|their) names?/i);
  const traitMatch = raw.match(/\[([^[\]]+)\] trait/i);
  const levelMatch = raw.match(/level (\d+)/i);
  const filter: Filter = {};
  if (nameMatch) filter.nameOrTrait = [{ tokens: [nameMatch[1]!], match: "name" }];
  else if (traitMatch) filter.nameOrTrait = [{ tokens: [traitMatch[1]!], match: "trait" }];
  if (levelMatch) filter.levels = [Number(levelMatch[1])];
  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Definition-level half of a Filter (kind/color/level/cost/name-trait/keyword).
 * Exported so card A3 tests can prove the load-bearing definition-predicate seam directly
 * (e.g. `hasLevel` excludes Lv.- cards from a level-budget delete).
 */
export function definitionMatches(filter: Filter, def: DefinitionFacts): boolean {
  // Disjunctive sub-filter: "black or has [Legend-Arms] in its traits" — the card matches
  // if ANY sub-filter matches. All other fields on the parent filter still apply (AND).
  if (filter.or && filter.or.length > 0) {
    if (!filter.or.some((f) => definitionMatches(f, def))) return false;
  }
  if (filter.and && filter.and.length > 0) {
    if (!filter.and.every((f) => definitionMatches(f, def))) return false;
  }
  if (filter.not && definitionMatches(filter.not, def)) return false;
  if (filter.kind && filter.kind.length > 0) {
    const wanted = filter.kind.map((k) => KIND_MAP[k]);
    // Tokens are Digimon permanents for target/cost resolution even though their
    // synthetic definitions carry the Token kind rather than the printed
    // Digimon kind.  `allowTokens` is the explicit IR opt-in for that rule.
    const tokenAsDigimon = filter.allowTokens === true && def.isToken === true && wanted.includes(CardKind.Digimon);
    if (!tokenAsDigimon && !wanted.some((k) => def.kinds.includes(k))) return false;
  }
  if (filter.hasDnaDigivolutionRequirement === true) {
    const compiled = def.cardId !== undefined ? runtimeCompiledCard(def.cardId) : undefined;
    if ((compiled?.dnaDigivolveRequirement?.length ?? 0) === 0) return false;
  }
  if (filter.excludeKind && filter.excludeKind.length > 0) {
    const banned = filter.excludeKind
      .map((k) => KIND_MAP[k as keyof typeof KIND_MAP])
      .filter((k): k is CardKind => k !== undefined);
    if (banned.some((k) => def.kinds.includes(k))) return false;
  }
  if (filter.colors && filter.colors.length > 0) {
    const wanted = filter.colors.map((c) => COLOR_MAP[c]);
    if (!wanted.some((c) => def.colors.includes(c))) return false;
  }
  // Color EXCLUSION ("non-red Option", "non-white Digimon"): reject when the card carries ANY of
  if (filter.excludeColors && filter.excludeColors.length > 0) {
    const banned = filter.excludeColors.map((c) => COLOR_MAP[c]);
    if (banned.some((c) => def.colors.includes(c))) return false;
  }
  // Multicolored: two or more colors. With `colors` also set, the card must be
  // multicolored AND include one of those colors (handled by the `colors` check above).
  if (filter.multicolor && def.colors.length < 2) return false;
  if (filter.singleColor === true && def.colors.length !== 1) return false;
  if (filter.levels && filter.levels.length > 0) {
    if (def.level === undefined || !filter.levels.includes(def.level)) return false;
  }
  // "HAS a level" gate (BT17-051 level-budget delete, BT18-019 different-levels select): exclude
  // Lv.- cards (Digi-Eggs / level-less Digimon), where `def.level` is undefined or 0 (KB Q2807).
  if (filter.hasLevel === true && !(def.level !== undefined && def.level > 0)) return false;
  // Static level threshold ("level N or lower/higher"). A `relativeTo:"lastDeleted"` comparison
  // (no static `value`) is resolved against context in permanentMatchesFilter and stripped before
  // delegating here, so a missing `value` at this static seam is a no-op (skip).
  if (filter.levelComparison && filter.levelComparison.value !== undefined) {
    if (def.level === undefined) return false;
    const { op, value } = filter.levelComparison;
    if (op === "lte" && !(def.level <= value)) return false;
    if (op === "gte" && !(def.level >= value)) return false;
    if (op === "eq" && def.level !== value) return false;
  }
  if (filter.playCostLte !== undefined && def.playCost > filter.playCostLte) return false;
  if (filter.playCostGte !== undefined && def.playCost < filter.playCostGte) return false;
  // Disjunctive exact play-cost match ("memory cost of 1 or 7", ST6-04): qualify on any listed value.
  if (filter.playCostOneOf && filter.playCostOneOf.length > 0 && !filter.playCostOneOf.includes(def.playCost))
    return false;
  // `allowTokens` (＜Overclock＞ delete cost, "your Tokens OR your other [Trait] Digimon"):
  // a Token bypasses the trait gate entirely (source `IsToken || ContainsTraits(trait)`).
  // Non-Token cards still must match the trait, so the gate only relaxes for tokens.
  const tokenBypassesTrait = filter.allowTokens === true && def.isToken === true;
  if (!tokenBypassesTrait) {
    if (filter.nameOrTrait && filter.nameOrTrait.length > 0) {
      // A multi-entry `nameOrTrait` array is a UNION (OR): the card qualifies if it matches any ref
      // ("[Greymon] in name OR [Dragon] trait"). The `orPrevious:true` marker is the runtime record's
      // explicit declaration of this OR intent ("[Data] OR [Witchelny] trait" — BT19-029, BT19-055,
      // BT21-054, BT21-080); it agrees with the established union default, so both paths are OR.
      if (!filter.nameOrTrait.some((ref) => matchNameOrTrait(def, ref))) return false;
    }
    if (filter.traits && filter.traits.length > 0) {
      if (!matchNameOrTrait(def, { tokens: filter.traits, match: "trait" })) return false;
    }
    if (filter.traitContains && filter.traitContains.length > 0) {
      const tokens = filter.traitContains.map((token) => token.toLowerCase());
      if (!(def.types ?? []).some((trait) => tokens.some((token) => trait.toLowerCase().includes(token)))) return false;
    }
  }
  // Name-exclusion ("other than [X], [Y]"): reject when the card's name matches any.
  if (filter.excludeNames && filter.excludeNames.length > 0) {
    const name = (def.nameEn ?? "").toLowerCase();
    if (filter.excludeNames.some((n) => name.includes(n.toLowerCase()))) return false;
  }
  // Name/trait/text-spanning exclusion ("other than Digimon with [Dark Masters] in their texts",
  // EX10-035): reject when the card's definition matches any ref via the shared name/trait/text
  // union. A `match:"any"` ref spans name ∪ trait ∪ effect text.
  if (filter.excludeNameOrTrait && filter.excludeNameOrTrait.length > 0) {
    if (filter.excludeNameOrTrait.some((ref) => matchNameOrTrait(def, ref))) return false;
  }
  // Keyword-presence ("with ＜Save＞ in its text", "Digimon with ＜Blocker＞"). Matched
  // against the printed effect text (the source "contains ＜KW＞ in text" check).
  if (filter.keywords && filter.keywords.length > 0) {
    if (!filter.keywords.every((kw) => textHasKeyword(def, kw))) return false;
  }
  // Keyword-exclusion ("without ＜Blocker＞"). Static definition path for loose cards;
  // live permanents also account for granted keywords below.
  if (filter.excludeKeywords && filter.excludeKeywords.length > 0) {
    if (filter.excludeKeywords.some((kw) => textHasKeyword(def, kw))) return false;
  }
  // dp filter for LOOSE CARDS (hand/trash): compare against the card's printed DP.
  // For battle-area permanents the live DP is checked in permanentMatchesFilter instead.
  // When `relativeToSource` is set the comparison needs a live permanent; skip here
  // (permanentMatchesFilter handles it). (CAP-E13, BT20-077: "DP that is 8000 or lower")
  if (filter.dp && filter.dp.value !== undefined && !filter.dp.relativeToSource) {
    const printedDp = def.dp ?? 0;
    const { op, value } = filter.dp;
    if (op === "lte" && !(printedDp <= value)) return false;
    if (op === "gte" && !(printedDp >= value)) return false;
    if (op === "eq" && printedDp !== value) return false;
  }
  // textContains: "in its text" filter matching name ∪ traits ∪ effect text ∪ inherited text.
  // KB Q4366: "in its text" is the full text blob (name, traits, effects, inherited effects,
  // digivolve requirements, etc.). String: single-match; array: OR-match any entry. (CAP-E10)
  if (filter.textContains !== undefined) {
    const fullText = [
      def.nameEn,
      ...(def.types ?? []),
      ...(def.forms ?? []),
      ...(def.attributes ?? []),
      def.effectText ?? "",
      def.inheritedEffectText ?? "",
    ]
      .join(" ")
      .toLowerCase();
    const terms = Array.isArray(filter.textContains) ? filter.textContains : [filter.textContains];
    if (!terms.some((t) => fullText.includes(t.toLowerCase()))) return false;
  }
  if (filter.effectTextContains !== undefined) {
    const effectText = (def.effectText ?? "").toLowerCase();
    const terms = Array.isArray(filter.effectTextContains) ? filter.effectTextContains : [filter.effectTextContains];
    if (!terms.some((term) => effectText.includes(term.toLowerCase()))) return false;
  }
  // ＜Link＞-capability gate (Q6422): the card must carry its own link requirement to be a legal
  // link target. Reads the structured `linkRequirement` definition field (documented behavior `linkCondition !=
  // null`), NOT the printed text — a [Appmon]-trait Digimon with no link requirement is rejected.
  if (filter.hasLinkRequirement === true && !hasLinkRequirement(def)) return false;
  // "with inherited effects" filter — the card must have non-empty inherited effect text
  // (AD1-015, AD1-002). This checks the structured `inheritedEffectText` definition field.
  if (filter.hasInheritedEffects === true && !def.inheritedEffectText) return false;
  // "with DigiXros requirements" filter (BT19-081, BT19-087) — the card must define a
  // `digiXrosRequirement` header in the IR registry. Reads the structured requirement, NOT
  // the printed text (a [Composite]/[Twilight] Digimon without a DigiXros header is rejected).
  // Both spellings are accepted: plural (`hasDigiXrosRequirements`, BT19-081) and singular
  // (`hasDigiXrosRequirement`, CAP-H-05/BT19-087 sourceFilter).
  if (filter.hasDigiXrosRequirements === true || filter.hasDigiXrosRequirement === true) {
    const reqs = def.cardId !== undefined ? digiXrosRequirementFor(def.cardId) : undefined;
    if (reqs === undefined || reqs.length === 0) return false;
  }
  // Token exclusion/inclusion (CAP-H5-05): "<non-Token>" / "your Tokens". A card
  // with `isToken: true` is a spawned-by-effect token Digimon, not a deck-legal card.
  if (filter.excludeToken === true && def.isToken) return false;
  if (filter.includeToken === true && !def.isToken) return false;
  return true;
}

/** Does a card's printed text declare a keyword ability (e.g. ＜Save＞, ＜Blocker＞)? */
export function textHasKeyword(def: { effectText?: string; inheritedEffectText?: string }, keyword: string): boolean {
  const hay = `${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`.toLowerCase();
  // Normalize the keyword to its prose token (handles "DeDigivolve" -> "de-digivolve",
  // "SecurityAttack" -> "security attack", "IceClad" -> "ice clad").
  const token = keyword
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/DeDigivolve/i, "De-Digivolve")
    .replace(/Digi Burst/i, "Digi-Burst")
    .toLowerCase();
  return hay.includes(`＜${token}`) || hay.includes(`<${token}`);
}

export function matchNameOrTrait(
  def: {
    cardId?: string;
    nameEn: string;
    types?: string[];
    forms?: string[];
    attributes?: string[];
    effectText?: string;
    inheritedEffectText?: string;
    securityEffectText?: string;
    linkEffect?: string;
    linkRequirement?: string;
    dualEffect?: string;
    optionEffect?: string;
  },
  ref: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "text" | "any";
    negate?: boolean;
  },
): boolean {
  // Card references generated from bracketed prose occasionally omit display punctuation
  // present in the canonical English name ("Beelzemon Blast Mode" vs
  // "Beelzemon: Blast Mode"). Names compare on words while preserving substring vs exact
  // semantics; traits keep their existing whitespace/hyphen normalization below.
  const normalizeName = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const names = def.cardId
    ? effectiveStaticNames(def as CardDefinition).map(normalizeName)
    : [normalizeName(def.nameEn ?? "")];
  const normalizeTrait = (value: string) => value.toLowerCase().replace(/[\s-]+/g, "");
  const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])].map(normalizeTrait);
  const text = [
    def.effectText,
    def.inheritedEffectText,
    def.securityEffectText,
    def.linkEffect,
    def.linkRequirement,
    def.dualEffect,
    def.optionEffect,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ")
    .toLowerCase();
  const matches = (ref.tokens ?? []).some((token) => {
    const rawToken = token.toLowerCase();
    const nameToken = normalizeName(token);
    if (ref.match === "name") return names.some((name) => name.includes(nameToken));
    // named "Cerberusmon: Werewolf Mode" does NOT match "Cerberusmon" (KB Q1231/Q1232).
    if (ref.match === "nameExact") return names.some((name) => name === nameToken);
    if (ref.match === "trait") return traits.some((x) => x.includes(normalizeTrait(rawToken)));
    // a card NAMED/TRAITED X "has [X] in its text" too, so "text" is the full union
    // (identical to "any"), not effectText-only.
    return (
      names.some((name) => name.includes(nameToken)) ||
      traits.some((x) => x.includes(normalizeTrait(rawToken))) ||
      text.includes(rawToken)
    );
  });
  // "non-[X]" refs (BT10-069's "non-[DarkKnightmon (X Antibody)] Digimon card"): the
  // candidate qualifies when it does NOT match, instead of when it does.
  return ref.negate ? !matches : matches;
}
