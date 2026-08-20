import {
  CardColor,
  CardKind,
  getCardDefinition,
  requireCardDefinition,
  hasCardDefinition,
  allCardIds,
  allCards,
  digivolutionRequirementsFor,
  effectiveStaticNames,
  isTokenDefinition,
  intrinsicDigivolutionCostReductionFor,
  type CardDefinition,
  type CardInstance,
  type DigivolutionRequirement,
  type EvoCost,
  type Permanent,
} from "@aegis/shared";
import { tamerOntoDigivolveLevel } from "./tamerOntoDigivolve.js";
import type { GameAccess } from "../effects/EffectContext.js";

/**
 * Engine-side card-data-model access layer.
 *
 * The static card definitions, enums, and the generated reference table live in
 * @aegis/shared (the contract layer both client and server share). This module is
 * the server engine's read-only window onto that table: pure functions, keyed by
 * card id, that the rules engine and every implemented card effect query for static
 * card facts. It owns no game state and mutates nothing.
 *
 * It exists so the engine never reaches into the raw registry ad hoc: lookups that
 * must succeed (a card already in the match) use the throwing variant; derived
 * facts (colors, level, DP, kind, evo costs) have one definition here instead of
 * being recomputed per effect. Source of the data shape: documented behavior /
 * the committed card-data snapshot.
 */

// --- Lookup (thin wrappers over the @aegis/shared registry) ---

/** CardDefinition for `cardId`, or undefined when unknown. */
export function lookupDefinition(cardId: string): CardDefinition | undefined {
  return getCardDefinition(cardId);
}

/**
 * Cost adjustments printed on the card being digivolved INTO that inspect the live base stack.
 * These cannot be installed as battle-area static effects: the source card is still in hand
 * when affordability is calculated. Keep the rule server-authoritative at the digivolve seam.
 */
export function intrinsicDigivolutionCostReduction(evolving: CardDefinition | undefined, base: Permanent): number {
  if (!evolving) return 0;
  return intrinsicDigivolutionCostReductionFor(
    evolving.cardId,
    base.stack.map((card) => card.cardId),
  );
}

/**
 * CardDefinition for `cardId`; throws when unknown. Use this everywhere a card is
 * already part of the match (a CardInstance carries a valid cardId by
 * construction), so a missing definition surfaces as a loud bug, not undefined.
 */
export function definitionOf(cardIdOrInstance: string | CardInstance): CardDefinition {
  const cardId = typeof cardIdOrInstance === "string" ? cardIdOrInstance : cardIdOrInstance.cardId;
  if (typeof cardId !== "string") {
    throw new Error(
      `definitionOf: cardId resolved to ${typeof cardId} (${JSON.stringify(cardId)}). ` +
        `Input was ${typeof cardIdOrInstance}: ${JSON.stringify(cardIdOrInstance).slice(0, 200)}`,
    );
  }
  return requireCardDefinition(cardId);
}

/** True when a definition exists for the id. */
export function isKnownCard(cardId: string): boolean {
  return hasCardDefinition(cardId);
}

/** Every known card id (sorted, from the generated table). */
export function knownCardIds(): string[] {
  return allCardIds();
}

/** Every card definition (sorted by cardId in the generated data). */
export function allDefinitions(): readonly CardDefinition[] {
  return allCards();
}

// --- Derived static facts (operate on a definition or its card id) ---

const resolve = (def: CardDefinition | string): CardDefinition =>
  typeof def === "string" ? requireCardDefinition(def) : def;

/** Colors printed on the card (source cardColors). */
export function colorsOf(def: CardDefinition | string): readonly CardColor[] {
  return resolve(def).colors;
}

/** source cardSource.HasCardColor(color). */
export function hasColor(def: CardDefinition | string, color: CardColor): boolean {
  return resolve(def).colors.includes(color);
}

/**
 * Card level, or undefined for cards that
 * have no level (Tamers, Options, or a level of 0).
 */
export function levelOf(def: CardDefinition | string): number | undefined {
  return resolve(def).level;
}

/** Printed Digimon Power (0 for non-Digimon). */
export function dpOf(def: CardDefinition | string): number {
  return resolve(def).dp;
}

/**
 * Memory cost to play (source PlayCost). -1 means the card has no play cost
 * (e.g. a DigiEgg).
 */
export function playCostOf(def: CardDefinition | string): number {
  return resolve(def).playCost;
}

/** True when the card has a payable play cost (PlayCost >= 0 and not an Option). */
export function hasPlayCost(def: CardDefinition | string): boolean {
  const d = resolve(def);
  return !d.kinds.includes(CardKind.Option) && d.playCost >= 0;
}

/** The digivolution requirements printed on the card (source EvoCosts). */
export function evoCostsOf(def: CardDefinition | string): readonly EvoCost[] {
  return resolve(def).evoCosts;
}

// Kind predicates. The card-data-model exposes its own (accepting `string |
// CardDefinition`, consistent with every other helper here) rather than
// re-exporting the shared `CardDefinition`-only versions, so callers have one
// uniform calling convention.
export function isDigimon(def: CardDefinition | string): boolean {
  return resolve(def).kinds.includes(CardKind.Digimon);
}
export function isTamer(def: CardDefinition | string): boolean {
  return resolve(def).kinds.includes(CardKind.Tamer);
}
export function isOption(def: CardDefinition | string): boolean {
  return resolve(def).kinds.includes(CardKind.Option);
}
export function isDigiEgg(def: CardDefinition | string): boolean {
  return resolve(def).kinds.includes(CardKind.DigiEgg);
}

/** A card is a field permanent if it is a Digimon, Tamer, or DigiEgg (source IsPermanent). */
export function isPermanentKind(def: CardDefinition | string): boolean {
  const kinds = resolve(def).kinds;
  return kinds.includes(CardKind.Digimon) || kinds.includes(CardKind.Tamer) || kinds.includes(CardKind.DigiEgg);
}

/** ACE card (source IsACE: OverflowMemory >= 1). */
export function isAce(def: CardDefinition | string): boolean {
  return resolve(def).isAce === true;
}

/** Dual-kind card (source IsDualCard: more than one CardKind). */
export function isDualKind(def: CardDefinition | string): boolean {
  return resolve(def).kinds.length > 1;
}

// --- Digivolution matching (read-only rule helper over static data) ---

/**
 * The EvoCost entry (if any) by which `evolving` may digivolve on top of a base
 * card `base`, per the requirement: the base must include the required color and
 * be EXACTLY the required level (documented behavior `Permanent.Level == EvoCost.Level`,
 * documented behavior). Returns the matching entry so a caller can read its
 * `memoryCost`; returns undefined when no entry is satisfied.
 *
 * This is the pure static-data half of the digivolve legality check (the full
 * check, owned by the `digivolve` subsystem, also reads live memory and the
 * permanent's runtime state). Mirrors the color+level test in
 * the card-data loader.GetEvoCosts / the digivolve flow.
 */
export function matchingEvoCost(
  evolving: CardDefinition | string,
  base: CardDefinition | string,
  derivedColors?: readonly CardColor[],
): EvoCost | undefined {
  const baseDef = resolve(base);
  // Manual §"Token Cards": a token can't be digivolved onto ("Cards can't be stacked with
  // tokens"); it satisfies no EvoCost as a base, regardless of its level/color.
  if (isTokenDefinition(baseDef)) return undefined;
  // Q4242: a Lv.- base (no level) cannot be referenced by level, so it satisfies no
  // level-gated EvoCost — do NOT coerce a missing level to 0 (which would match every entry).
  if (baseDef.level === undefined) return undefined;
  const baseLevel = baseDef.level;
  // The base's EFFECTIVE colors gate the EvoCost color test: its printed colors UNIONED with
  // any continuously-derived "also treated as <color>" grant (static-continuous-effects,
  // LOCKED Q4 — KB BT3-040 Q1075: a card treated as blue can satisfy a "Blue, Level 5"
  // requirement). When no derived colors are supplied this is exactly the printed-color test.
  const effective =
    derivedColors === undefined || derivedColors.length === 0
      ? baseDef.colors
      : [...new Set<CardColor>([...baseDef.colors, ...derivedColors])];
  for (const cost of resolve(evolving).evoCosts) {
    if (effective.includes(cost.color) && baseLevel === cost.level) {
      return cost;
    }
  }
  return undefined;
}

/**
 * Like {@link matchingEvoCost} but IGNORING the printed color of the base — only the
 * EXACT level test is applied. Used by the digivolve color-legality waiver
 * (WaiveColorRequirement, CONTEXT.md LOCKED Q3): when the evolving card's color
 * requirement is waived, an EvoCost entry is satisfied on level alone. The waiver
 * drops ONLY the COLOR test; the level test stays exact (`baseLevel === cost.level`,
 * never relaxes the level gate. The cheapest level-satisfying entry is returned so the
 * waived path never pays more memory than a color-satisfying play would.
 */
export function matchingEvoCostIgnoringColor(
  evolving: CardDefinition | string,
  base: CardDefinition | string,
): EvoCost | undefined {
  // Mirror matchingEvoCost's level semantics exactly: a Lv.- base (no level) is not
  // referenceable by level (Q4242), so it matches no EvoCost. The waiver drops only the
  // COLOR test (LOCKED Q3); it must not also relax the level test for level-less cards.
  const baseDef = resolve(base);
  // Manual §"Token Cards": a token can't be digivolved onto, even under a color waiver.
  if (isTokenDefinition(baseDef)) return undefined;
  if (baseDef.level === undefined) return undefined;
  const baseLevel = baseDef.level;
  let best: EvoCost | undefined;
  for (const cost of resolve(evolving).evoCosts) {
    if (baseLevel === cost.level && (best === undefined || cost.memoryCost < best.memoryCost)) {
      best = cost;
    }
  }
  return best;
}

/** True when `evolving` can be placed on `base` by some printed EvoCost. */
export function canDigivolveOnto(evolving: CardDefinition | string, base: CardDefinition | string): boolean {
  return matchingEvoCost(evolving, base) !== undefined;
}

/**
 * Like {@link canDigivolveOnto} but ALSO considers alternate digivolution
 * requirements (trait/name/text-gated paths like "[Digivolve] Lv.2 w/[Appmon]
 * trait: Cost 0"). Used by the digivolve action validator where alternate
 * paths are a legitimate substitute for the printed EvoCost, but NOT by
 * general-purpose callers (e.g. card-module ad-hoc legality checks) where
 * the alternate requirement might over-match.
 */
export function canDigivolveOntoWithAlternates(
  evolving: CardDefinition | string,
  base: CardDefinition | string,
): boolean {
  return (
    matchingEvoCost(evolving, base) !== undefined ||
    matchingAlternateDigivolutionRequirement(evolving, base) !== undefined
  );
}

/**
 * True when `def` has `trait` anywhere in its forms, attributes, or types.
 * (the Digimon TCG "trait" = forms ∪ attributes ∪ types).
 */
export function cardHasTrait(def: CardDefinition | string, trait: string): boolean {
  const d = resolve(def);
  // Case-insensitive identity: printed text and card data occasionally disagree on the casing of
  // a trait token (e.g. text "[NSP]" vs data "NSp"). Trait values are whole-token identities, so a
  // case-folded equality cannot over-match (it never collapses "App" into "Appmon").
  const want = trait.toLowerCase();
  const ruleTraits = Array.from(
    (d.effectText ?? "").matchAll(/\[Rule\]\s*Trait:\s*Has(?:\s+the)?\s*\[([^\]]+)\]/gi),
    (match) => match[1]!.trim().toLowerCase(),
  );
  return (
    (d.forms ?? []).some((t) => t.toLowerCase() === want) ||
    (d.attributes ?? []).some((t) => t.toLowerCase() === want) ||
    (d.types ?? []).some((t) => t.toLowerCase() === want) ||
    ruleTraits.includes(want)
  );
}

/** Match a live permanent against its printed and continuously granted traits. */
export function permanentHasTrait(game: GameAccess, permanent: Permanent, trait: string): boolean {
  if (permanent.topCard === undefined) return false;
  const effective = game.effectiveTraits?.(permanent.permanentId);
  if (effective === undefined) return cardHasTrait(game.definitionOf(permanent.topCard), trait);
  const wanted = trait.toLowerCase();
  return effective.some((candidate) => candidate.toLowerCase() === wanted);
}

/**
 * The alternate digivolution requirement (if any) by which `evolving` may
 * digivolve onto `base`, per the compiled card's `digivolutionRequirement`
 * entries (trait/name/text-gated alternate paths like "[Digivolve] Lv.2
 * w/[Appmon]/[Hero] trait: Cost 0"). Returns the matched entry so a caller can
 * read its `cost`; returns undefined when no alternate requirement is satisfied.
 *
 * Each entry matches when ALL of its stated gates pass:
 * - level: base.level === requirement.level (exact), or within [levelMin, levelMax]
 * - traits: base has at least one of the listed traits (via {@link cardHasTrait})
 * - names: one of the base's effective static names contains one of the listed name tokens
 * - texts: base.effectText contains one of the listed text tokens
 *
 * An entry with no gates (no level/traits/names/texts/baseIsTamer) is a data defect and matches
 * NO base — see {@link requirementHasGate} and the guard in the loop below.
 *
 * The "digivolve from hand onto a <color> Tamer as if it is a level N Digimon" mechanic is
 * handled separately and FIRST: effects.json carries only a STALE gateless `{cost, isAlternate}`
 * for these cards (it would match any base of any color), so the correctly-gated requirement is
 * derived here from the registered `Static` `Digivolve` action's `asLevel` — a Tamer base that
 * shares a color with the evolving card, paying the card's level-N evo cost. For such a card the
 * stale gateless effects.json entry is ignored.
 */
/**
 * Whether an alternate digivolution requirement carries at least one base gate (level, level
 * range, trait, name, text, or Tamer-base). A requirement with none would match every base and
 * is treated as non-matching by {@link matchingAlternateDigivolutionRequirement}.
 */
function requirementHasGate(req: DigivolutionRequirement): boolean {
  return (
    req.level !== undefined ||
    req.levelMin !== undefined ||
    req.levelMax !== undefined ||
    (req.traits !== undefined && req.traits.length > 0) ||
    (req.excludeTraits !== undefined && req.excludeTraits.length > 0) ||
    (req.names !== undefined && req.names.length > 0) ||
    (req.namesExact !== undefined && req.namesExact.length > 0) ||
    (req.texts !== undefined && req.texts.length > 0) ||
    req.baseIsTamer === true
  );
}

/**
 * Options for {@link matchingAlternateDigivolutionRequirement}.
 * @param isBlastDigivolve - when true, entries with `incompatibleWithBlastDigivolve: true`
 *   are excluded (KB Q3056: BT18-102's 10-[Hybrid] stack-count path cannot be used as
 *   the base for a Blast Digivolve).
 */
export interface AlternateDigivolveOptions {
  isBlastDigivolve?: boolean;
  /** Match only this stable index in `digivolutionRequirementsFor`; invalid/nonmatching indexes fail. */
  requirementIndex?: number;
}

/**
 * Whether a requirement carries a base-IDENTITY gate (name/trait/text) rather than only a
 * "is a Tamer"/level shape. Tamer-onto cards (BT17-012) print SPECIFIC named requirements
 * ([Takuya Kanbara]: Cost 2, [Agunimon]: Cost 1) alongside the generic "onto any <color>
 * Tamer as level N" effect; those named paths must win over the generic derived path, while
 * the stale gateless/baseIsTamer-only effects.json entry for such cards must NOT.
 */
function requirementHasIdentityGate(req: DigivolutionRequirement): boolean {
  return (
    (req.names !== undefined && req.names.length > 0) ||
    (req.namesExact !== undefined && req.namesExact.length > 0) ||
    (req.texts !== undefined && req.texts.length > 0) ||
    (req.traits !== undefined && req.traits.length > 0) ||
    (req.excludeTraits !== undefined && req.excludeTraits.length > 0)
  );
}

/**
 * The first requirement in `requirements` whose gates all pass for `baseDef`. When
 * `identityOnly` is true, only requirements carrying a base-identity gate (name/trait/text)
 * are considered — used by the Tamer-onto path so a card's specific named requirements are
 * honored while its stale gateless/baseIsTamer-only entry is not.
 */
function matchGatedRequirement(
  requirements: readonly DigivolutionRequirement[],
  baseDef: CardDefinition,
  baseEffectiveNames: string[],
  options: AlternateDigivolveOptions | undefined,
  identityOnly: boolean,
): DigivolutionRequirement | undefined {
  for (const [requirementIndex, req] of requirements.entries()) {
    if (options?.requirementIndex !== undefined && options.requirementIndex !== requirementIndex) continue;
    // A requirement with NO gate (no level/traits/names/texts/baseIsTamer) is a data defect,
    // not a real "digivolve onto any base" rule — every printed alternate digivolution names a
    // level, trait, name, or Tamer base. The runtime record flattens special-mechanic paths it can't
    // express (Armor / X-Antibody / Blast digivolve) to a gateless `{cost, isAlternate}`; honoring
    // that as "matches any base" let cards stack onto an illegal base of any level (e.g. BT21-021
    // onto a Lv.2). Treat gateless as matching NOTHING — the safe failure is the alternate path
    // being unavailable, never an unrestricted one.
    if (!requirementHasGate(req)) continue;
    if (identityOnly && !requirementHasIdentityGate(req)) continue;
    // Blast Digivolve exclusion (KB Q3056): paths that require a digivolution-stack count
    // (BT18-102's 10-[Hybrid] path) cannot be used as the base for a Blast Digivolve. When
    // called from a Blast Digivolve context, skip these entries so only the standard EvoCost
    // is a valid Blast Digivolve candidate.
    if (options?.isBlastDigivolve && req.incompatibleWithBlastDigivolve) continue;
    // Tamer-base gate: the alternate path digivolves onto a Tamer ("as if the Tamer is a
    if (req.baseIsTamer && !isTamer(baseDef)) continue;
    // Color gate on the base: "onto one of your <color> Tamers" restricts which Tamers qualify.
    if (req.baseColors && req.baseColors.length > 0) {
      if (!req.baseColors.some((c) => baseDef.colors.includes(c as CardColor))) continue;
    }
    if (req.baseColorCountMax !== undefined && baseDef.colors.length > req.baseColorCountMax) continue;
    // Level gate: exact match, or within [levelMin, levelMax].
    if (req.level !== undefined) {
      if (baseDef.level === undefined || baseDef.level !== req.level) continue;
    }
    if (req.levelMin !== undefined) {
      if (baseDef.level === undefined || baseDef.level < req.levelMin) continue;
    }
    if (req.levelMax !== undefined) {
      if (baseDef.level === undefined || baseDef.level > req.levelMax) continue;
    }

    // Trait gate: base must have at least one of the listed traits.
    if (req.traits && req.traits.length > 0) {
      if (!req.traits.some((t) => cardHasTrait(baseDef, t))) continue;
    }

    // Exclude-trait gate: base must NOT carry any listed trait ("from a Digimon without
    // the [X Antibody] trait", EX8-037).
    if (req.excludeTraits && req.excludeTraits.length > 0) {
      if (req.excludeTraits.some((t) => cardHasTrait(baseDef, t))) continue;
    }

    // Name gate: base name must contain at least one token (substring; "[X] in name").
    if (req.names && req.names.length > 0) {
      if (!req.names.some((n) => baseEffectiveNames.some((name) => name.includes(n)))) continue;
    }

    // Exact-name gate: one of the base's effective names must EQUAL one token.
    if (req.namesExact && req.namesExact.length > 0) {
      if (!req.namesExact.some((n) => baseEffectiveNames.some((name) => name === n))) continue;
    }

    // Base play-cost gate: distinguishes same-name reprints ("Play cost 12 [Ceresmon]").
    if (req.basePlayCost !== undefined && baseDef.playCost !== req.basePlayCost) continue;

    // Text gate: base effectText must contain at least one token.
    if (req.texts && req.texts.length > 0) {
      if (!baseDef.effectText || !req.texts.some((t) => baseDef.effectText!.includes(t))) continue;
    }

    return req;
  }

  return undefined;
}

export function matchingAlternateDigivolutionRequirement(
  evolving: CardDefinition | string,
  base: CardDefinition | string,
  options?: AlternateDigivolveOptions,
): DigivolutionRequirement | undefined {
  const evolvingId = typeof evolving === "string" ? evolving : evolving.cardId;
  const baseDef = resolve(base);
  // Manual §"Token Cards": a token can't be digivolved onto, including by an alternate
  // (trait/name/text-gated) requirement.
  if (isTokenDefinition(baseDef)) return undefined;
  const baseEffectiveNames = effectiveStaticNames(baseDef);

  // `digivolutionRequirementsFor` (shared) returns the hand-authored override when one exists
  // (e.g. BT7-112's Tamer-gated requirement with its placement cost, REPLACING the gateless
  // generated `{cost:7, isAlternate:true}`), otherwise the compiled effects.json list. This is
  // the same source the client reads, so server legality and client highlighting cannot drift.
  const requirements = digivolutionRequirementsFor(evolvingId) ?? [];

  // Tamer-onto path (BT4-025 etc.): derived from the registered IR, not effects.json.
  const tamerOntoLevel = tamerOntoDigivolveLevel(evolvingId);
  if (tamerOntoLevel !== undefined) {
    // Family-A tamer-onto cards (BT17-012 etc.) print SPECIFIC named digivolution requirements
    // ([Takuya Kanbara]: Cost 2, [Agunimon]: Cost 1) IN ADDITION to the generic "onto any
    // <color> Tamer as level N" effect. Honor a matching named/trait/text requirement first —
    // its specific (cheaper) cost and its named non-Tamer bases (e.g. slide-evolution onto
    // [Agunimon], a Digimon) must not be shadowed by the generic derived path below.
    const named = matchGatedRequirement(requirements, baseDef, baseEffectiveNames, options, true);
    if (named) return named;
    if (!isTamer(baseDef)) return undefined;
    // The base Tamer must share a color with the evolving card ("onto one of your <color>
    // Tamers" — standard digivolve color rule), and the cost is the evolving card's evo cost
    // at the "as if" level for that shared color. The stale gateless/baseIsTamer-only
    // effects.json entry for these cards is intentionally ignored here.
    const evolvingDef = resolve(evolving);
    const evo = evolvingDef.evoCosts.find((c) => c.level === tamerOntoLevel && baseDef.colors.includes(c.color));
    if (evo === undefined) return undefined;
    return { cost: evo.memoryCost, isAlternate: true, baseIsTamer: true };
  }

  if (requirements.length === 0) return undefined;
  return matchGatedRequirement(requirements, baseDef, baseEffectiveNames, options, false);
}
