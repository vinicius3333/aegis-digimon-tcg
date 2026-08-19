import { MEMORY_MIN } from "../MemoryGauge.js";
import {
  CardColor,
  CardKind,
  EffectDuration,
  isTamer,
  EffectTiming,
  effectiveStaticNames,
  getCompiledCard,
  getCardDefinition,
  appFusionCostFor,
  digiXrosRequirementFor,
  filterToDistinctColors,
  requireCardDefinition,
  isDigimon,
  isOption,
  type Action,
  type CardDefinition,
  type CardEffect,
  type CompiledCard,
  type Condition,
  type Cost,
  type EffectTrigger,
  type EffectDurationRef,
  type Filter,
  type Permanent,
  type Scaling,
  type Seat,
  type Target,
  type ZoneRef,
} from "@aegis/shared";
import type {
  EnforcedRestriction,
  ReplacementEventName,
  Restriction,
  SeatScopedDecisionApi,
  SubTriggerEventName,
} from "./EffectContext.js";
import type { CardSource } from "./CardSource.js";
import type { Effect } from "./Effect.js";
import type { EffectContext } from "./EffectContext.js";
import { attackedWithDigimonInCurrentOrPreviousTurn } from "../turnActivity.js";
import { canLinkToTargetPermanent, digimonEligibleForMindLink, linkEligible } from "./mindLink.js";
import type { EffectModule } from "./EffectModule.js";
import {
  activated,
  breeding,
  beforePayCost,
  colorWaiverStatic,
  digivolveCostStatic,
  inTrash,
  onAddHand,
  onDeletion,
  onPlay,
  security,
  staticModifier,
  turnTiming,
  whenAttacking,
  whenDigivolving,
  whenTrashedFromBattleArea,
  type BuilderOptions,
} from "./builders.js";
import { logError } from "../../logger.js";
import { requireOpponentAsk } from "../decisions/decisionApi.js";
import { registerCard, getEffectModule, unregisterCard } from "./registry.js";

// Per-card modules are the runtime source of truth. Hand-written overrides can intentionally
// differ from the generated shared aggregate, so nested actions (for example ActivateMain)
// must resolve the same CompiledCard that was used to register the module's effects.
const registeredCompiledCards = new Map<string, CompiledCard>();
const registeredIrModules = new Map<string, EffectModule>();

export function runtimeCompiledCard(cardId: string): CompiledCard | undefined {
  return registeredCompiledCards.get(cardId) ?? getCompiledCard(cardId);
}

/** Names a card is unconditionally also treated as in every zone. */
export function universalNameAliasesFor(cardId: string): string[] {
  const compiled = runtimeCompiledCard(cardId);
  if (compiled === undefined) return [];

  const aliases = new Set<string>();
  for (const effect of compiled.effects) {
    if (effect.trigger !== "Rule") continue;
    for (const action of effect.actions) {
      if (
        action.kind !== "GrantStatic" ||
        action.grant !== "name" ||
        action.digiXrosOnly === true ||
        action.target.isSelf !== true
      )
        continue;
      for (const token of action.tokens ?? []) aliases.add(token);
    }
  }
  return [...aliases];
}

/** Resolve a loose card's own "when this card is trashed from the deck" body. */
export async function resolveSelfWhenTrashedFromDeck(ctx: EffectContext): Promise<void> {
  const module = getEffectModule(ctx.source.cardId);
  if (module?.onTrashedFromDeck !== undefined) {
    await module.onTrashedFromDeck(ctx);
    return;
  }
  const compiled = runtimeCompiledCard(ctx.source.cardId);
  if (compiled === undefined) return;
  for (const effect of compiled.effects) {
    for (const action of effect.actions ?? []) {
      if (
        action.kind !== "SubTrigger" ||
        action.event !== "whenTrashedFromDeck" ||
        action.sourceFilter?.isSelfRef !== true
      )
        continue;
      if (action.optional === true && !(await ctx.ask.optional(ctx, action.raw ?? "Activate this effect?"))) continue;
      for (const nested of action.actions) await runAction(ctx, nested);
    }
  }
}
import { registerTamerOntoDigivolve } from "../cards/tamerOntoDigivolve.js";
import { registerDigisorption, registerDigisorptionRedirector } from "../cards/digisorptionDigivolve.js";
import { matchingEvoCost, matchingAlternateDigivolutionRequirement } from "../cards/cardData.js";

/**
 * IR interpreter (subsystem: effect-framework / effect-primitives bridge).
 *
 * Turns the declarative CardEffect[] produced by runtime effect records into
 * runtime behavior by dispatching each `Action` to the existing effect
 * primitives (`ctx.fx.*`). It also provides `irCardModule(cardId, compiled)`, a
 * generic EffectModule factory that maps each CardEffect's trigger to an
 * EffectTiming and wires the right timing builder — so a card with a compiled IR
 * record needs no hand-written module.
 *
 * Design constraints (card-module contract / task):
 *   - Breadth over depth for v1: the high-frequency Action kinds are implemented;
 *     everything else (and every RawUnparsed) is routed through `unsupported`,
 *     which logs and (in dev) throws, so gaps are LOUD, never a silent no-op.
 *   - The interpreter only calls primitives that exist on the `Primitives`
 *     interface and resolves targets through read-only GameAccess + the seat-keyed
 *     decision API exposed as `ctx.ask`.
 */

// ---------------------------------------------------------------------------
// Dev/strictness switch
// ---------------------------------------------------------------------------

/**
 * When true, an unsupported action throws (so tests/dev surface the gap); when
 * false (production), it logs and continues so one un-implemented clause cannot crash
 * a live match. Defaults to throwing unless NODE_ENV === "production".
 */
const STRICT = process.env.NODE_ENV !== "production";

/**
 * Keywords whose "gain" performs a VERB (a one-shot action) rather than conferring a
 * passive/continuous ability. Granting these as a continuous keyword would silently
 * drop their effect, so the interpreter routes them to `unsupported` until each
 * verb is wired. Every OTHER keyword (Blocker, Rush, Jamming, Raid, Reboot, Barrier,
 * Evade, Save, Decoy, Security Attack, ...) is a continuous ability recorded in the
 * continuous-effect ledger via `grantKeyword`.
 */
// BlastDigivolve and BlastDNADigivolve are continuous keyword abilities (not verbs)
// and fall through to grantKeyword below. Only genuine verb-keywords belong here.
const ACTION_TYPE_KEYWORDS = new Set<string>([
  "Draw",
  "DeDigivolve",
  "DigiBurst",
  "Recovery",
  "Digisorption",
  "DNADigivolve",
]);

export class UnsupportedEffectError extends Error {
  constructor(
    readonly cardId: string,
    readonly action: Action,
    detail: string,
  ) {
    super(`Unsupported effect on ${cardId}: ${detail}`);
    this.name = "UnsupportedEffectError";
  }
}

function unsupported(ctx: EffectContext, action: Action, detail: string): void {
  const cardId = ctx.source.cardId;
  if (STRICT) throw new UnsupportedEffectError(cardId, action, detail);
  logError(`[interpreter] unsupported action on ${cardId}: ${detail}`, action);
}

// ---------------------------------------------------------------------------
// Duration mapping (IR -> engine EffectDuration)
// ---------------------------------------------------------------------------

function toDuration(ref: EffectDurationRef): EffectDuration {
  switch (ref) {
    case "forTheTurn":
      return EffectDuration.UntilEachTurnEnd;
    case "forTheAttack":
    case "forThisAttack":
      return EffectDuration.UntilEndAttack;
    case "untilYourTurnEnd":
      return EffectDuration.UntilOwnerTurnEnd;
    case "untilOpponentTurnEnd":
      return EffectDuration.UntilOpponentTurnEnd;
    case "endOfOpponentTurn":
      return EffectDuration.UntilOpponentTurnEnd;
    case "untilEndOfAttack":
      return EffectDuration.UntilEndAttack;
    case "untilEndOfBattle":
      return EffectDuration.UntilEndBattle;
    case "permanent":
      // A genuine name/trait/color grant from a resolved effect must survive turn
      // boundaries (WR-03 / ENG-02); it is never cleared by the boundary sweep.
      return EffectDuration.Permanent;
    default:
      return EffectDuration.UntilEachTurnEnd;
  }
}

// ---------------------------------------------------------------------------
// Filter primitives shared by permanent- and definition-level matching
// ---------------------------------------------------------------------------

const KIND_MAP: Record<NonNullable<Filter["kind"]>[number], CardKind> = {
  Digimon: CardKind.Digimon,
  Tamer: CardKind.Tamer,
  Option: CardKind.Option,
  DigiEgg: CardKind.DigiEgg,
};

const COLOR_MAP: Record<NonNullable<Filter["colors"]>[number], CardColor> = {
  Red: CardColor.Red,
  Blue: CardColor.Blue,
  Yellow: CardColor.Yellow,
  Green: CardColor.Green,
  White: CardColor.White,
  Black: CardColor.Black,
  Purple: CardColor.Purple,
};

/**
 * `GrantStatic grant: { kind: "Protection", protections: [...] }` token vocabulary (BT16-055,
 * P-162, ST17-07). Each protection decomposes to a single ALREADY enforced restriction kind;
 * `byOpponentEffectsOnly` mirrors the printed wording exactly (some protections are scoped to
 * "your opponent's effects", others — "isn't affected by <De-Digivolve> effects" — are not).
 */
const PROTECTION_TOKEN_MAP: Record<string, { restriction: EnforcedRestriction; byOpponentEffectsOnly?: boolean }> = {
  dpReduction: { restriction: "dpImmune", byOpponentEffectsOnly: true },
  deDigivolve: { restriction: "cantBeDeDigivolved" },
  deletion: { restriction: "beDeleted", byOpponentEffectsOnly: true },
  returnToHandOrDeck: { restriction: "beReturned", byOpponentEffectsOnly: true },
};

/**
 * `GrantStatic grant: "protection"` string-form token vocabulary (BT24-055, EX7-041, ST13-14).
 * Distinct key spellings from {@link PROTECTION_TOKEN_MAP} (the compiler's other encoding of the
 * same concept), but every printed instance is opponent-scoped, unlike some
 * `PROTECTION_TOKEN_MAP` entries.
 */
const PROTECTION_STRING_TOKEN_MAP: Record<string, EnforcedRestriction> = {
  beDeDigivolved: "cantBeDeDigivolved",
  beDeletedByEffects: "beDeleted",
  beReturnedToHandOrDeck: "beReturned",
};

interface DefinitionFacts {
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
function parseCopyEffectsFilterText(raw: string): Filter | undefined {
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
    if (!wanted.some((k) => def.kinds.includes(k))) return false;
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
function textHasKeyword(def: { effectText?: string; inheritedEffectText?: string }, keyword: string): boolean {
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
  const text = (def.effectText ?? "").toLowerCase();
  const matches = ref.tokens.some((token) => {
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

/**
 * Whether a card matching the trait `filter` is in the SOURCE permanent's digivolution stack
 * (BT7-024 "while a card with [Hybrid] in its traits is in this Digimon's digivolution cards").
 * Matches each stack card's definition against `filter.nameOrTrait` via the shared
 * `matchNameOrTrait` (Form ∪ Attribute ∪ Type union). Returns false when there is no source
 * permanent or no trait filter (conservative; we never invent a gate).
 */
function selfStackMatchesTrait(ctx: EffectContext, filter: Filter | undefined): boolean {
  if (filter === undefined) return false;
  const hasPredicate =
    (filter.nameOrTrait?.length ?? 0) > 0 || (filter.or?.length ?? 0) > 0 || (filter.and?.length ?? 0) > 0;
  if (!hasPredicate) return false;
  const self = ctx.source.permanent();
  if (self === undefined) return false;
  return self.stack.some((card) => definitionMatches(filter, ctx.game.definitionOf(card)));
}

/**
 * Whether the SOURCE permanent's TOP card's trait union (Form ∪ Attribute ∪ Type) matches the
 * trait token(s) in `filter.nameOrTrait` (EX12-004 "this Digimon with the [TB] trait"). Only the
 * top card is checked — the permanent's live identity, not its digivolution stack. Returns false
 * when there is no source permanent (off-field) or no filter (conservative; we never invent a gate).
 */
function selfTopMatchesTrait(ctx: EffectContext, filter: Filter | undefined): boolean {
  const refs = filter?.nameOrTrait;
  if (refs === undefined || refs.length === 0) return false;
  const self = ctx.source.permanent();
  if (self?.topCard === undefined) return false;
  const def = ctx.game.definitionOf(self.topCard);
  return refs.some((ref) => matchNameOrTrait(def, ref));
}

/**
 * Whether the SOURCE permanent's (the inherited host's) TOP card carries the text token(s) in
 * against the union via the shared `matchNameOrTrait`. Returns false when there is no source
 * permanent (off-field) or no filter (conservative; we never invent a gate).
 */
function selfTopMatchesText(ctx: EffectContext, filter: Filter | undefined): boolean {
  const refs = filter?.nameOrTrait;
  if (refs === undefined || refs.length === 0) return false;
  const self = ctx.source.permanent();
  if (self?.topCard === undefined) return false;
  const def = ctx.game.definitionOf(self.topCard);
  return refs.some((ref) => matchNameOrTrait(def, ref));
}

function sourceTopDefinition(ctx: EffectContext) {
  const topCard = ctx.source.permanent()?.topCard;
  if (topCard !== undefined) return ctx.game.definitionOf(topCard);
  // [On Deletion] conditions are evaluated after the permanent has moved to trash.
  // The live source can no longer recover its host, so use the authoritative top-card
  // snapshot captured by the deletion producer (for example, "this Digimon has 2 or
  // more colors" on an inherited effect).
  return ctx.trigger.deletedTopCardId === undefined
    ? undefined
    : ctx.game.definitionOf({ cardId: ctx.trigger.deletedTopCardId } as never);
}

function compareNumber(actual: number, op: Condition["op"] | undefined, expected: number): boolean {
  switch (op) {
    case "lt":
      return actual < expected;
    case "lte":
      return actual <= expected;
    case "eq":
      return actual === expected;
    case "gt":
      return actual > expected;
    default:
      return actual >= expected;
  }
}

function sourceStackHasSameLevelCards(ctx: EffectContext, minCount: number): boolean {
  const self = ctx.source.permanent();
  if (self === undefined) return false;
  const levelCounts = new Map<number, number>();
  const cards = [self.topCard, ...self.stack].filter((card): card is NonNullable<typeof card> => card !== undefined);
  for (const card of cards) {
    const level = ctx.game.definitionOf(card).level;
    if (typeof level !== "number") continue;
    const next = (levelCounts.get(level) ?? 0) + 1;
    if (next >= minCount) return true;
    levelCounts.set(level, next);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Target / filter resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a filter's controller scope to concrete seats relative to the source. Uses
 * the explicit `controller` when set; otherwise falls back to the runtime-only
 * `controllerDefault` hint (the prose default for an un-possessived target) so seat
 * enumeration still narrows even though the structural signature carried no owner
 * predicate. An unset/`any` scope spans both seats.
 */
function seatsForController(ctx: EffectContext, filter: Filter): Seat[] {
  const mine = ctx.source.ownerSeat;
  const opp = ctx.game.opponentOf(mine);
  const scope = filter.controller ?? filter.controllerDefault;
  switch (scope) {
    case "mine":
      return [mine];
    case "opponent":
      return [opp];
    case "any":
    case undefined:
      return [mine, opp];
    default:
      return [mine, opp];
  }
}

/** Does a permanent's top card satisfy the (battle-area) filter? */
/**
 * The level bound for a `levelComparison.relativeTo:"lastDeleted"` filter: the printed level of
 * the Digimon just deleted in this resolution. Prefer the effect-result capture set by a
 * `deleteOwn` cost / Delete action (BT8-107). Fall back to the SubTrigger deletion subject, whose
 */
function lastDeletedLevelBound(ctx: EffectContext): number | undefined {
  if (ctx.lastDeletedLevel !== undefined) return ctx.lastDeletedLevel;
  const id = ctx.trigger.deletedPermanentId ?? ctx.trigger.subjectPermanentId;
  if (id === undefined) return undefined;
  const perm = ctx.game.permanentById(id);
  if (perm?.topCard === undefined) return undefined;
  const level = ctx.game.definitionOf(perm.topCard).level;
  return level !== undefined && level > 0 ? level : undefined;
}

export function permanentMatchesFilter(
  ctx: EffectContext,
  permanent: Permanent,
  filter: Filter,
  source: CardSource,
): boolean {
  if (permanent.topCard === undefined) return false;
  // A permanent filter naming a field zone must distinguish the breeding area from
  // the battle area. Cost-modifier predicates receive both kinds of permanent directly,
  // so relying on the caller's candidate scan would let battle-area-only reducers apply
  // in breeding (BT2-088 Q1038).
  if (filter.zone === "battleArea" && permanent.inBreeding) return false;
  if (filter.zone === "breeding" && !permanent.inBreeding) return false;
  if (filter.excludeSelf || filter.isSelfRef === false) {
    const self = source.permanent();
    if (self !== undefined && self.permanentId === permanent.permanentId) {
      if (filter.excludeSelf) return false;
    }
  }
  // `isSelfRef: true` restricts the filter to THIS card's own permanent. Most targets carrying
  // it short-circuit in `candidatePermanents` before reaching here; the exception is a union
  // (`orFilters`) where "this Digimon" is one alternative among several (BT21-013: place the
  // card under this Digimon OR under a red Tamer with inherited effects).
  if (filter.isSelfRef === true) {
    const self = source.permanent();
    if (self === undefined || self.permanentId !== permanent.permanentId) return false;
  }
  // boundRef: restrict to permanents in the named effect-result binding (written by PlayPerLevel
  // or another producing action via `bindResultAs`). An unbound or empty ref matches nothing.
  if (filter.boundRef !== undefined) {
    const bound = ctx.boundPlayed?.get(filter.boundRef);
    if (!bound || !bound.has(permanent.permanentId)) return false;
  }
  if (
    typeof filter.playCost === "object" &&
    filter.playCost !== null &&
    "lteBindResult" in filter.playCost &&
    typeof filter.playCost.lteBindResult === "string"
  ) {
    const bound = ctx.boundPlayed?.get(filter.playCost.lteBindResult);
    const boundId = bound?.values().next().value as string | undefined;
    const boundPermanent = boundId === undefined ? undefined : ctx.game.permanentById(boundId);
    if (boundPermanent?.topCard === undefined) return false;
    const maximum = ctx.game.definitionOf(boundPermanent.topCard).playCost;
    const candidateCost = ctx.game.definitionOf(permanent.topCard).playCost;
    if (maximum === undefined || candidateCost === undefined || candidateCost > maximum) return false;
    const { playCost: _boundPlayCost, ...rest } = filter;
    filter = rest;
  }
  // excludeSelectionRef: drop a permanent bound earlier under SelectBind/Target.bindAs (the
  // positive counterpart of boundRef). Used for "choose N exemptions, then delete all other
  // Digimon" (EX11-011).
  if (filter.excludeSelectionRef !== undefined) {
    const refs = Array.isArray(filter.excludeSelectionRef) ? filter.excludeSelectionRef : [filter.excludeSelectionRef];
    for (const ref of refs) {
      if (ctx.selections?.get(ref) === permanent.permanentId) return false;
    }
  }
  // Host/target predicate for stack-card costs that refer to "that Digimon" from the
  // enclosing trigger (e.g. cards under the Digimon that attacked). This is useful inside
  // `hostFilter` for loose `digivolutionCards` candidates.
  if (filter.isTriggerSource === true) {
    const triggerId =
      ctx.trigger.subjectPermanentId ?? ctx.trigger.attackerPermanentId ?? ctx.trigger.deletedPermanentId;
    if (triggerId === undefined || permanent.permanentId !== triggerId) return false;
    const { isTriggerSource: _omit, ...rest } = filter;
    filter = rest;
  }
  // Disjunctive sub-filter ("black or has [Legend-Arms] in its traits"): the permanent matches
  // the OR group if it satisfies ANY alternative. Each alternative is a full Filter, so it is
  // evaluated against the LIVE permanent (recursing) — an alternative may itself constrain DP,
  // suspended state, kind, etc. The remaining (non-`or`) fields on the parent still apply (AND),
  // so strip `or` before delegating to the field-by-field checks to avoid re-evaluating it.
  if (filter.or && filter.or.length > 0) {
    if (!filter.or.some((alt) => permanentMatchesFilter(ctx, permanent, alt, source))) return false;
    const { or: _or, ...rest } = filter;
    filter = rest;
  }
  const def = ctx.game.definitionOf(permanent.topCard);

  // `placedInBattleAreaByEffect`: an Option only becomes a battle-area permanent when a
  // "place this card in the battle area" effect put it there (normal Option use trashes it), so
  // a battle-area Option permanent always satisfies this — a non-Option never does (Cap-E-006).
  if (filter.placedInBattleAreaByEffect === true && !def.kinds.includes(CardKind.Option)) {
    return false;
  }

  // DP threshold needs the live permanent, so it lives here (not in definitionMatches).
  // Strip dp from filter after evaluation so definitionMatches doesn't double-check using
  // the printed (static) dp, which may differ from currentDP after ModifyDP effects.
  if (filter.dp) {
    const cmp = filter.dp;
    let bound: number | undefined;
    if (cmp.relativeToSource) {
      bound = source.permanent()?.currentDP;
    } else if (cmp.valueFrom !== undefined) {
      const boundIds = ctx.boundPlayed?.get(cmp.valueFrom);
      const boundId = boundIds?.values().next().value as string | undefined;
      const boundPermanent = boundId !== undefined ? ctx.game.permanentById(boundId) : undefined;
      bound = boundPermanent?.currentDP;
    } else {
      bound = cmp.value;
    }
    if (bound === undefined) return false;
    if (cmp.op === "lte" && !(permanent.currentDP <= bound)) return false;
    if (cmp.op === "gte" && !(permanent.currentDP >= bound)) return false;
    if (cmp.op === "eq" && permanent.currentDP !== bound) return false;
    const { dp: _dp, ...rest } = filter;
    filter = rest;
  }

  // Runtime DP threshold bound to the permanent suspended by this effect's immediately preceding
  // suspend payment/action (BT16-048: return a Digimon with DP <= the Digimon this effect
  // suspended). If multiple were suspended, use the maximum DP to preserve "up to" benefit.
  if (filter.dpLessOrEqualToSuspendedDigimon === true) {
    const bound = (ctx.lastSuspendedPermanentIds ?? [])
      .map((id) => ctx.game.permanentById(id)?.currentDP)
      .filter((dp): dp is number => dp !== undefined)
      .reduce<number | undefined>((max, dp) => (max === undefined ? dp : Math.max(max, dp)), undefined);
    if (bound === undefined || permanent.currentDP > bound) return false;
    const { dpLessOrEqualToSuspendedDigimon: _dpBound, ...rest } = filter;
    filter = rest;
  }

  // Selection-relative threshold ("DP/level/play cost <op> the chosen Digimon's"): compare the
  // candidate's live attribute to the bound selection's. An unresolved ref excludes the
  if (filter.relativeTo) {
    const rel = filter.relativeTo;
    const boundId = ctx.selections?.get(rel.selectionRef);
    const boundPerm = boundId !== undefined ? ctx.game.permanentById(boundId) : undefined;
    if (boundPerm === undefined) return false;
    const attrOf = (p: Permanent): number | undefined => {
      if (rel.attr === "dp") return p.currentDP;
      if (rel.attr === "digivolutionCount") return p.stack.length;
      const cardDef = p.topCard ? ctx.game.definitionOf(p.topCard) : undefined;
      if (rel.attr === "level") return cardDef?.level ?? undefined;
      if (rel.attr === "playCost") return cardDef?.playCost ?? undefined;
      return undefined;
    };
    const lhs = attrOf(permanent);
    const rhs = attrOf(boundPerm);
    if (lhs === undefined || rhs === undefined) return false;
    if (rel.op === "lte" && !(lhs <= rhs)) return false;
    if (rel.op === "gte" && !(lhs >= rhs)) return false;
    if (rel.op === "eq" && lhs !== rhs) return false;
  }

  // Runtime-scaled level threshold ("delete 1 level 4 or lower; add 1 to the level cap for
  // each of your other Digimon" — BT16-079). This is a target-cap adjustment, distinct from
  // DeleteLevelBudget's "sum of levels" semantics. Strip the comparison afterward so
  // definitionMatches does not re-apply the unscaled base threshold.
  if (filter.levelComparison?.value !== undefined && filter.levelComparison.scaling !== undefined) {
    const level = def.level;
    if (level === undefined) return false;
    const { op, value, scaling } = filter.levelComparison;
    const bound = value + scaleFactor(ctx, scaling);
    if (op === "lte" && !(level <= bound)) return false;
    if (op === "gte" && !(level >= bound)) return false;
    if (op === "eq" && level !== bound) return false;
    const { levelComparison: _lc, ...rest } = filter;
    filter = rest;
  }

  // Dynamic level threshold bound to a just-deleted Digimon ("delete an opponent's Digimon with
  // level <= the deleted Digimon's level" — BT8-107 cost-deleted, BT17-071 SubTrigger subject;
  // definitionMatches does not re-apply it with a missing `value`. An unresolved bound (no
  if (filter.levelComparison?.relativeTo === "lastDeleted") {
    const bound = lastDeletedLevelBound(ctx);
    const level = def.level;
    if (bound === undefined || level === undefined) return false;
    const { op } = filter.levelComparison;
    if (op === "lte" && !(level <= bound)) return false;
    if (op === "gte" && !(level >= bound)) return false;
    if (op === "eq" && level !== bound) return false;
    const { levelComparison: _lc, ...rest } = filter;
    return permanentMatchesFilter(ctx, permanent, rest, source);
  }

  // Dynamic level cap ("level 4 or lower. For each of your other Digimon, add 1 to the
  // maximum level you can choose", BT16-079). Apply the runtime scaling to the static bound,
  // then strip the dynamic comparison before delegating to definitionMatches.
  if (filter.levelComparison?.scaling !== undefined && filter.levelComparison.value !== undefined) {
    const level = def.level;
    if (level === undefined) return false;
    const { op, value, scaling } = filter.levelComparison;
    const bound = value + scaleFactor(ctx, scaling);
    if (op === "lte" && !(level <= bound)) return false;
    if (op === "gte" && !(level >= bound)) return false;
    if (op === "eq" && level !== bound) return false;
    const { levelComparison: _lc, ...rest } = filter;
    return permanentMatchesFilter(ctx, permanent, rest, source);
  }

  // Dynamic level upper bound from a named context variable (string) or a static numeric cap
  // (BT19-002 "levelLte: 'returnedDigimonLevel'" — the cap is the returned Digimon's level stored
  // by the preceding return cost's `storeAs`). A string key missing from namedCounts excludes all.
  if (filter.levelLte !== undefined) {
    const bound = typeof filter.levelLte === "string" ? ctx.namedCounts?.get(filter.levelLte) : filter.levelLte;
    if (bound === undefined || def.level === undefined || !(def.level <= bound)) return false;
  }
  if (filter.levelLteTriggerSource === true) {
    const bound = ctx.trigger.playedLevel;
    if (bound === undefined || def.level === undefined || def.level > bound) return false;
  }
  if (filter.levelEqTriggerSource === true) {
    const bound = ctx.trigger.playedLevel;
    if (bound === undefined || def.level === undefined || def.level !== bound) return false;
  }
  if (filter.playCostLteTriggerSource === true) {
    const bound = ctx.trigger.playedPlayCost;
    if (bound === undefined || def.playCost > bound) return false;
    const { playCostLteTriggerSource: _bound, ...rest } = filter;
    filter = rest;
  }
  if (filter.levelEq !== undefined) {
    const bound = typeof filter.levelEq === "string" ? ctx.namedCounts?.get(filter.levelEq) : filter.levelEq;
    if (bound === undefined || def.level === undefined || def.level !== bound) return false;
  }

  // Alternative generated shape for "level <= the number of cards in your or their security
  // stack" (BT16-063). A candidate is legal if it fits at least one of the two counts, which is
  // equivalent to checking against the maximum count.
  {
    const levelShape = filter.level as { lte?: { kind?: string } } | undefined;
    if (levelShape?.lte?.kind === "chooseEitherSecurityCount") {
      const mine = ctx.game.player(ctx.source.ownerSeat).security.length;
      const opp = ctx.game.player(ctx.game.opponentOf(ctx.source.ownerSeat)).security.length;
      const bound = Math.max(mine, opp);
      if (def.level === undefined || def.level > bound) return false;
      const { level: _level, ...rest } = filter;
      filter = rest;
    }
  }

  // Suspended-state filter ("1 of your opponent's suspended Digimon") — live state.
  if (filter.suspended === true && !permanent.isSuspended) return false;
  if (filter.suspended === false && permanent.isSuspended) return false;
  // Unsuspended-state filter ("opponent has no unsuspended Digimon") — live state.
  if (filter.unsuspended && permanent.isSuspended) return false;

  if ((filter.digivolutionCards === "none" || filter.digivolutionCards === "hasNone") && permanent.stack.length > 0)
    return false;
  if (filter.digivolutionCards === "hasAny" && permanent.stack.length === 0) return false;
  // "WITH digivolution cards" alias (BT17-098): at least one card under the top.
  if (filter.hasDigivolutionCards === true && permanent.stack.length === 0) return false;

  // Digivolution-stack KIND gate ("a Digimon with a Tamer card in its digivolution cards",
  // BT17-090): at least one stacked card must be of one of the requested kinds. Distinct from
  // the count-only `digivolutionCards:"hasAny"`.
  if (filter.digivolutionStackKind && filter.digivolutionStackKind.length > 0) {
    const wanted = filter.digivolutionStackKind.map((k) => KIND_MAP[k as keyof typeof KIND_MAP]);
    const hit = permanent.stack.some((card) => {
      const stackDef = ctx.game.definitionOf(card);
      return wanted.some((k) => k !== undefined && stackDef.kinds.includes(k));
    });
    if (!hit) return false;
  }

  // Digivolution-stack name/trait gate: unlike the ordinary `nameOrTrait` predicate (which
  // inspects the permanent's TOP card), this requires a matching card UNDER that top card.
  if (filter.digivolutionStackNameOrTrait && filter.digivolutionStackNameOrTrait.length > 0) {
    const hit = permanent.stack.some((card) =>
      definitionMatches({ nameOrTrait: filter.digivolutionStackNameOrTrait }, ctx.game.definitionOf(card)),
    );
    if (!hit) return false;
  }

  // Digivolution-stack NAME exclusion ("[Diaboromon] without [Doomsday Clock] in its
  // digivolution cards", BT17-100): reject if any stacked card's name matches an excluded token.
  if (filter.excludeCardsNamed && filter.excludeCardsNamed.length > 0) {
    const excluded = filter.excludeCardsNamed.map((n) => n.toLowerCase());
    const hasExcluded = permanent.stack.some((card) => {
      const name = (ctx.game.definitionOf(card).nameEn ?? "").toLowerCase();
      return excluded.some((n) => name.includes(n));
    });
    if (hasExcluded) return false;
  }

  // Same-name-as-source filter ("another Digimon with the same name as this Digimon", BT2-053).
  // Compares the candidate's live top-card name to the SOURCE permanent's live top-card name
  // (the evolved-into form, not the printed card id — KB Q1023). An off-field source matches none.
  if (filter.isSameName === true) {
    const selfTop = source.permanent()?.topCard;
    if (selfTop === undefined) return false;
    const selfName = (ctx.game.definitionOf(selfTop).nameEn ?? "").toLowerCase();
    const candName = (def.nameEn ?? "").toLowerCase();
    if (selfName === "" || selfName !== candName) return false;
  }

  // Comparative digivolution-stack-size filter relative to the effect source ("a Digimon with as
  // many or fewer digivolution cards as this Digimon" — AD1-025, BT16-027). Compare the candidate's
  // stack size to the source Digimon's; an unresolvable source excludes the candidate.
  if (filter.digivolutionCardsCompareToSource) {
    const sourceStack = source.permanent()?.stack.length;
    if (sourceStack === undefined) return false;
    const op = filter.digivolutionCardsCompareToSource;
    if (op === "lte" && !(permanent.stack.length <= sourceStack)) return false;
    if (op === "gte" && !(permanent.stack.length >= sourceStack)) return false;
    if (op === "eq" && permanent.stack.length !== sourceStack) return false;
  }

  // Dynamic play-cost cap relative to the effect source's stack size ("play costs less than or
  // equal to this Digimon's digivolution cards" — BT7-065). This compares the candidate's printed
  // play cost to the source permanent's current digivolution-card count.
  if (filter.playCostLteSourceDigivolutionCards === true) {
    const sourceStack = source.permanent()?.stack.length;
    if (sourceStack === undefined || def.playCost > sourceStack) return false;
    const { playCostLteSourceDigivolutionCards: _cap, ...rest } = filter;
    filter = rest;
  }

  // Absolute digivolution-stack-size upper bound ("1 or fewer digivolution cards" — BT20-055,
  // CAP-H-02). Distinct from digivolutionCards:"none" (stack.length === 0).
  if (filter.digivolutionCardsAtMost !== undefined && permanent.stack.length > filter.digivolutionCardsAtMost)
    return false;

  // Absolute digivolution-stack-size lower bound ("4 or more digivolution cards" — BT1-085).
  if (filter.digivolutionCardsAtLeast !== undefined && permanent.stack.length < filter.digivolutionCardsAtLeast)
    return false;

  // Runtime-scaled play-cost cap ("delete a play cost 3 or lower Digimon; for each [X] in
  // your trash add 1 to the maximum" — EX5-054). The effective cap is the static base plus
  // the scaled bonus; check it against the candidate's printed play cost, then strip the cap
  // fields so definitionMatches does not re-apply the static-only bound.
  if (filter.playCostLteScaling) {
    const base = filter.playCostLte ?? 0;
    const cap = base + scaleFactor(ctx, filter.playCostLteScaling);
    if ((def.playCost ?? 0) > cap) return false;
    const { playCostLte: _baseCap, playCostLteScaling: _scaledCap, ...rest } = filter;
    return definitionMatches(rest, def);
  }

  // Color predicates on a LIVE permanent must observe "also treated as <color>" grants.
  // Definition-only filters still use printed colors, but board predicates such as `youHave`
  // and effect targets see the permanent's effective set (printed union active grants).
  if (
    (filter.colors && filter.colors.length > 0) ||
    (filter.excludeColors && filter.excludeColors.length > 0) ||
    filter.multicolor === true
  ) {
    const effective = typeof ctx.game.effectiveColors === "function" ? ctx.game.effectiveColors(permanent) : def.colors;
    if (filter.colors && filter.colors.length > 0) {
      const wanted = filter.colors.map((color) => COLOR_MAP[color]);
      if (!wanted.some((color) => effective.includes(color))) return false;
    }
    if (filter.excludeColors && filter.excludeColors.length > 0) {
      const banned = filter.excludeColors.map((color) => COLOR_MAP[color]);
      if (banned.some((color) => effective.includes(color))) return false;
    }
    if (filter.multicolor === true && new Set(effective).size < 2) return false;
    const { colors: _colors, excludeColors: _excludeColors, multicolor: _multicolor, ...rest } = filter;
    return definitionMatches(rest, def);
  }

  // Kind filter with effective-type grants ("treat as Digimon"): a Tamer permanent
  // granted Digimon kind should pass a kind:["Digimon"] filter (HARD-01). When
  // GameAccess.effectiveKinds is available, check effective kinds first; fall back
  // to the static CardDefinition.kinds when it isn't (test fakes / lightweight calls).
  if (filter.kind?.includes("Digimon")) {
    const effective = ctx.game.effectiveKinds?.(permanent.permanentId);
    if (effective !== undefined) {
      const wanted = filter.kind.map((k) => KIND_MAP[k]);
      if (!wanted.some((k) => effective.includes(k))) return false;
      // Strip kind from filter so definitionMatches doesn't double-check against static def.kinds
      const { kind: _k, ...rest } = filter;
      return definitionMatches(rest, def);
    }
  }

  // Keyword-presence on a LIVE permanent ("Digimon with ＜Security Attack＞") must see
  // keywords conferred by ＜...+/-＞ grants, not only the printed text (KB BT12-040 Q2172).
  // Ask GameAccess first: its engine binding resolves the permanent's complete live keyword
  // set, including inherited/static stack keywords (for example ST5-11 conferring Blocker),
  // while `fx.grantedKeywords` only contains ledger grants. Keep both reads because lightweight
  // interpreter tests may supply a primitive grant store without a fully bound GameAccess.
  // Delegate the remaining definition-only predicates with the keyword clause stripped so it
  // is not re-checked against printed text alone.
  if (filter.keywords && filter.keywords.length > 0) {
    const granted = new Set((ctx.fx.grantedKeywords?.(permanent.permanentId) ?? []).map((g) => g.keyword));
    const hasKeyword = (kw: string): boolean =>
      ctx.game.hasKeyword?.(permanent.permanentId, kw) === true || granted.has(kw) || textHasKeyword(def, kw);
    if (!filter.keywords.every(hasKeyword)) return false;
    const { keywords: _omit, ...rest } = filter;
    return definitionMatches(rest, def);
  }
  if (filter.excludeKeywords && filter.excludeKeywords.length > 0) {
    const granted = new Set((ctx.fx.grantedKeywords?.(permanent.permanentId) ?? []).map((g) => g.keyword));
    const hasKeyword = (kw: string): boolean =>
      ctx.game.hasKeyword?.(permanent.permanentId, kw) === true || granted.has(kw) || textHasKeyword(def, kw);
    if (filter.excludeKeywords.some(hasKeyword)) return false;
    const { excludeKeywords: _omit, ...rest } = filter;
    return definitionMatches(rest, def);
  }

  return definitionMatches(filter, def);
}

/**
 * True when `permanent` is immune to effects from `source` (Comprehensive Rules
 * §15-15-5: "isn't affected by effects" grants — BT19-089's Option-sourced immunity,
 * BT16-063's Digimon-sourced immunity, and CAP-C-06's blanket opponent immunity). Only
 * ever excludes an OPPONENT's effect; a controller's own effects are never blocked by
 * these grants.
 */
function isPermanentUnaffectable(
  ctx: EffectContext,
  source: CardSource,
  permanent: Permanent,
  relevantSourceKinds: readonly string[],
): boolean {
  if (source.ownerSeat === permanent.controllerSeat) return false;
  if (relevantSourceKinds.some((k) => ctx.fx.isBeAffectedBySourceKind!(permanent.permanentId, k))) return true;
  return ctx.fx.isUnaffectableByOpponentEffects?.(permanent.permanentId) === true;
}

/**
 * Candidate battle-area permanents matching a target's filter.
 *
 * `includeUnaffectable` (default false, every existing call site): when true, a
 * permanent that is immune to this source's effects is still INCLUDED in the pool —
 * Comprehensive Rules §15-15-5-3: "'Isn't affected by effects' cards can still be
 * chosen for effects ... but it isn't affected by that effect." Only
 * `resolvePermanentTargets` (the target-CHOICE seam) sets this; it separately filters
 * immune permanents back out of the ids it actually returns for the effect to act on,
 * so the immune permanent is choosable but never affected.
 */
export function candidatePermanents(
  ctx: EffectContext,
  target: Target,
  opts?: { includeUnaffectable?: boolean },
): Permanent[] {
  const source = ctx.source;
  // A target that IS a prior binding ("place [the chosen Digimon] under ..."): resolve to the
  // stored permanent, no fresh selection. An unbound/gone ref yields nothing.
  if (target.fromSelectionRef !== undefined) {
    const boundId = ctx.selections?.get(target.fromSelectionRef);
    const p = boundId !== undefined ? ctx.game.permanentById(boundId) : undefined;
    return p ? [p] : [];
  }
  // useTriggerSource: resolve to the permanent that triggered the enclosing replacement
  // (the leaving/affected Digimon) rather than scanning the board. Used by BT19-053's
  // SecurityManipulation source so the LEAVING Royal Base Digimon is placed as security.
  if (target.filter?.useTriggerSource === true) {
    const triggerId = ctx.trigger.deletedPermanentId ?? ctx.trigger.subjectPermanentId;
    const p = triggerId !== undefined ? ctx.game.permanentById(triggerId) : undefined;
    return p ? [p] : [];
  }
  // `filter` is required by the IR type, but the JSON is written by several tools (the
  // prose compiler plus a number of patch scripts) and nothing validates their output
  // before the interpreter consumes it. A target that arrives without one must resolve to
  // no candidates, never throw: a TypeError here aborts the whole intent, so one malformed
  // action silently disables every later action in the same effect.
  if (target.isSelf || target.filter?.isSelfRef) {
    const self = source.permanent();
    return self ? [self] : [];
  }
  if (target.filter === undefined) return [];
  // A target may carry `orFilters`: a candidate qualifies if it matches the primary `filter`
  // OR any alternative ("play 1 [X] or 1 [Y]", BT17-074). Each alternative may scope a different
  // controller, so enumerate seats across the whole union.
  const allFilters = [target.filter, ...(target.orFilters ?? [])];
  const seatSet = new Set<Seat>();
  for (const f of allFilters) for (const s of seatsForController(ctx, f)) seatSet.add(s);
  // Determine which source-kind-qualified immunity grants can exclude this target: the
  // immuneToOpponentOptionEffects grant (beAffected+fromSourceKind:Option, BT19-089) and the
  // immuneToOpponentDigimonEffects grant (beAffected+fromSourceKind:Digimon, BT16-063 "isn't
  // affected by the effects of your opponent's Digimon"). Both are stored identically on the
  // continuous ledger and consulted the same way — qualify by whichever kind(s) the source card
  // actually declares.
  const sourceKinds = source.definition.kinds as readonly string[];
  const relevantSourceKinds =
    ctx.fx.isBeAffectedBySourceKind !== undefined ? sourceKinds.filter((k) => k === "Option" || k === "Digimon") : [];
  const result: Permanent[] = [];
  const isBreedingFilter = (filter: Filter): boolean => filter.zone === "breeding";
  const isBattleAreaFilter = (filter: Filter): boolean => filter.zone === undefined || filter.zone === "battleArea";
  for (const seat of seatSet) {
    const p = ctx.game.player(seat);
    if (allFilters.some(isBreedingFilter) && p.breeding !== undefined) {
      if (allFilters.some((f) => isBreedingFilter(f) && permanentMatchesFilter(ctx, p.breeding!, f, source))) {
        result.push(p.breeding);
      }
    }
    for (const permanent of p.battleArea) {
      if (!allFilters.some((f) => isBattleAreaFilter(f) && permanentMatchesFilter(ctx, permanent, f, source))) continue;
      if (!opts?.includeUnaffectable && isPermanentUnaffectable(ctx, source, permanent, relevantSourceKinds)) continue;
      result.push(permanent);
    }
  }
  return narrowToSuperlative(ctx, result, target.filter.superlative);
}

/**
 * SERVER-SIDE superlative play-cost narrowing (threat T-08-01): keep only the minimum
 * (`lowestPlayCost`) or maximum (`highestPlayCost`) printed-play-cost permanents in the eligible
 * pool (ties: all extrema). Candidates with no play cost are excluded; if NONE has a play cost the
 * set is empty (KB BT23-024 Q6025/Q6026 "all restricted, none exempt"). Because target resolution
 * (and thus client-intent validation in resolvePermanentTargets) runs over this narrowed pool, a
 * client naming a permanent outside the superlative set is rejected.
 */
function narrowToSuperlative(
  ctx: EffectContext,
  pool: Permanent[],
  superlative:
    | "highestPlayCost"
    | "lowestPlayCost"
    | "highestDP"
    | "lowestDP"
    | "highestLevel"
    | "lowestLevel"
    | "highestDigivolutionCards"
    | "lowestDigivolutionCards"
    | undefined,
): Permanent[] {
  if (superlative === undefined || pool.length === 0) return pool;

  // Digivolution-card count superlatives: compare the number of cards under each
  // candidate's top card. Ties keep every extremum, matching other superlatives.
  if (superlative === "highestDigivolutionCards" || superlative === "lowestDigivolutionCards") {
    const extremum =
      superlative === "lowestDigivolutionCards"
        ? Math.min(...pool.map((permanent) => permanent.stack.length))
        : Math.max(...pool.map((permanent) => permanent.stack.length));
    return pool.filter((permanent) => permanent.stack.length === extremum);
  }

  // Level superlatives: compare printed Digimon level (documented behavior IsMinLevel/IsMaxLevel over
  // permanent.Level, scoped to permanents that HasLevel — Tamers/Options/0-level cards are
  // excluded; ties keep every extremum, per IsMinLevel `permanent.Level == Levels.Min()`).
  if (superlative === "highestLevel" || superlative === "lowestLevel") {
    const withLevel: { permanent: Permanent; level: number }[] = [];
    for (const permanent of pool) {
      if (permanent.topCard === undefined) continue;
      const level = ctx.game.definitionOf(permanent.topCard).level;
      if (level === undefined || level <= 0) continue;
      withLevel.push({ permanent, level });
    }
    if (withLevel.length === 0) return [];
    const extremum =
      superlative === "lowestLevel"
        ? Math.min(...withLevel.map((e) => e.level))
        : Math.max(...withLevel.map((e) => e.level));
    return withLevel.filter((e) => e.level === extremum).map((e) => e.permanent);
  }

  if (superlative === "highestDP" || superlative === "lowestDP") {
    const withDp: { permanent: Permanent; dp: number }[] = [];
    for (const permanent of pool) {
      // DP must be defined and positive to be comparable (Tamers/Options have 0/undefined DP)
      if (permanent.currentDP === undefined || permanent.currentDP <= 0) continue;
      withDp.push({ permanent, dp: permanent.currentDP });
    }
    if (withDp.length === 0) return [];
    const extremum =
      superlative === "lowestDP" ? Math.min(...withDp.map((e) => e.dp)) : Math.max(...withDp.map((e) => e.dp));
    return withDp.filter((e) => e.dp === extremum).map((e) => e.permanent);
  }

  // Play cost superlatives (existing behavior)
  const withCost: { permanent: Permanent; cost: number }[] = [];
  for (const permanent of pool) {
    if (permanent.topCard === undefined) continue;
    const cost = ctx.game.definitionOf(permanent.topCard).playCost;
    if (cost === undefined) continue;
    withCost.push({ permanent, cost });
  }
  if (withCost.length === 0) return [];
  const extremum =
    superlative === "lowestPlayCost"
      ? Math.min(...withCost.map((e) => e.cost))
      : Math.max(...withCost.map((e) => e.cost));
  return withCost.filter((e) => e.cost === extremum).map((e) => e.permanent);
}

/**
 * Raise a deletion target's printed numeric DP cap by the controller's active
 * DP-deletion-maximum bonus (the consumer side of the subsystem; producers are
 * `DeletionMaxDpModifier`). Per KB Q2721/Q2722 this applies ONLY to a printed numeric
 * `<= N` cap, never a DP-relative threshold (`relativeToSource`/`relativeTo`). A zero
 * bonus (the common case) returns the target unchanged.
 */
function raiseDeletionDpCap(ctx: EffectContext, target: Target): Target {
  const dp = target.filter.dp;
  if (!dp || dp.op !== "lte" || dp.value === undefined || dp.relativeToSource) return target;
  const bonus = ctx.fx.deletionMaxDpBonus?.(ctx.source.ownerSeat, ctx.source.permanent()?.permanentId) ?? 0;
  if (bonus === 0) return target;
  return { ...target, filter: { ...target.filter, dp: { ...dp, value: dp.value + bonus } } };
}

/**
 * Resolve "choose any number ... whose total DP adds up to N or less" targets.
 *
 * `Target.totalDpCap` predates the dedicated `DeleteByDPBudget` action, but several
 * live card modules still emit it (EX2-011, ST7-12, BT9-094, BT12-014). Treat it as
 * the same aggregate DP-deletion family: the generic deletion-maximum modifier
 * raises the budget (EX2-011 KB Q3296), while a relative DP threshold is irrelevant.
 * The first pick is mandatory whenever at least one Digimon fits; subsequent picks
 * are optional and are offered only while their combined live DP stays in budget.
 */
async function resolveTotalDpCapTargets(ctx: EffectContext, target: Target): Promise<string[]> {
  const baseBudget = target.totalDpCap;
  if (baseBudget === undefined) return [];
  const sourcePermanentId = ctx.source.permanent()?.permanentId;
  const modifier = ctx.fx.deletionMaxDpBonus?.(ctx.source.ownerSeat, sourcePermanentId) ?? 0;
  const budget = baseBudget + modifier;
  const candidates = candidatePermanents(ctx, target, { includeUnaffectable: true })
    .map((permanent) => ({ permanentId: permanent.permanentId, dp: permanent.currentDP }))
    .filter(({ dp }) => dp > 0 && dp <= budget)
    .sort((left, right) => left.dp - right.dp || left.permanentId.localeCompare(right.permanentId));
  if (candidates.length === 0) {
    ctx.lastResolvedPermanentIds = [];
    return [];
  }

  const first = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map(({ permanentId }) => permanentId),
    min: 1,
    max: 1,
  });
  const firstCandidate = candidates.find(({ permanentId }) => permanentId === first[0]);
  if (firstCandidate === undefined) {
    ctx.lastResolvedPermanentIds = [];
    return [];
  }

  const selected = [firstCandidate.permanentId];
  let spent = firstCandidate.dp;
  for (const candidate of candidates) {
    if (candidate.permanentId === firstCandidate.permanentId) continue;
    if (spent + candidate.dp > budget) continue;
    const useCandidate = await ctx.ask.optional(
      ctx,
      `Delete ${candidate.permanentId} (DP ${candidate.dp}, spent ${spent}/${budget})?`,
    );
    if (!useCandidate) continue;
    selected.push(candidate.permanentId);
    spent += candidate.dp;
  }

  const affectable = filterAffectable(ctx, selected);
  ctx.lastResolvedPermanentIds = affectable;
  return affectable;
}

/**
 * Carve the survivor(s) `target.except` spares out of a `count: "all"` mass-delete
 * ("delete all of your opponent's Digimon except 1" — BT20-102, EX11-046). `selector`
 * narrows the except pool via the same superlative machinery `Filter.superlative`
 * already uses (`"highestPlayCost"` ties into `narrowToSuperlative`'s existing
 * no-play-cost-candidates-means-empty-pool rule, KB BT23-024 Q6025/Q6026 / EX11-046
 * Q5895); `"any"` leaves the pool unnarrowed. Interactive when the narrowed pool has
 * more members than `except.count` — mirrors the printed "Choose 1 ..." on both cards.
 * `chooser:"opponent"` routes the survivor decision to the defending player (EX3-063:
 * "your opponent chooses 1 of their Digimon"). Without it, the effect controller chooses.
 */
async function resolveExceptSurvivors(ctx: EffectContext, target: Target): Promise<string[]> {
  const except = target.except;
  if (except === undefined) return [];
  const superlative = except.selector === "highestPlayCost" ? ("highestPlayCost" as const) : undefined;
  const filter: Filter = { ...except.filter, superlative };
  return resolvePermanentTargets(ctx, {
    filter,
    count: except.count,
    ...(except.chooser !== undefined ? { chooser: except.chooser } : {}),
  });
}

/**
 * Resolve a target to concrete permanentIds, prompting the controller to choose
 * when there are more candidates than the count and the choice is non-trivial.
 * Returns [] when nothing matches.
 */
async function resolvePermanentTargets(
  ctx: EffectContext,
  target: Target,
  opts?: {
    /**
     * Extra per-candidate legality the filter alone cannot express, applied BEFORE the
     * prompt so the controller is never offered a pick the verb would then reject
     * server-side (e.g. a digivolve base with no legal card to digivolve into).
     */
    eligible?: (permanentId: string) => boolean;
  },
): Promise<string[]> {
  // SourceRef: resolve to the permanent that triggered this SubTrigger event.
  // Falls back to attackerPermanentId so that "trash its bottom N digivolution cards"
  // inside a whenOpponentAttacks watcher correctly targets the attacking Digimon
  // (whenOpponentAttacks fires with attackerPermanentId, not subjectPermanentId).
  if (!target) return [];
  // sameTarget: reuse the permanent(s) chosen by the immediately preceding action
  // rather than prompting again ("1 of your Digimon gains X … that Digimon also gains Y").
  if (target.sameTarget) return ctx.lastResolvedPermanentIds ?? [];
  if (target.sourceRef === "triggerSubject") {
    const subjectIds = ctx.trigger.subjectPermanentIds;
    if (subjectIds !== undefined && subjectIds.length > 1) {
      const allowed = new Set(subjectIds);
      const subjectTarget: Target = { ...target, sourceRef: undefined };
      const visibleCandidates = candidatePermanents(ctx, subjectTarget, { includeUnaffectable: true }).filter(
        (permanent) => allowed.has(permanent.permanentId),
      );
      const wanted = effectiveTargetCount(ctx, subjectTarget);
      const max = Math.min(wanted, visibleCandidates.length);
      if (max === 0) return [];
      const chosen =
        visibleCandidates.length > max
          ? await ctx.ask.chooseTargets(ctx, {
              candidates: visibleCandidates.map((permanent) => permanent.permanentId),
              min: max,
              max,
            })
          : visibleCandidates.map((permanent) => permanent.permanentId);
      const result = filterAffectable(ctx, chosen);
      ctx.lastResolvedPermanentIds = result;
      return result;
    }
    const id = ctx.trigger.subjectPermanentId ?? ctx.trigger.deletedPermanentId ?? ctx.trigger.attackerPermanentId;
    if (id) return [id];
  }
  if (target.sourceRef === "triggerDefender") {
    const id = ctx.trigger.defenderPermanentId ?? ctx.trigger.targetPermanentId;
    if (id) return [id];
  }
  // §15-15-5-3: a permanent immune to this source's effects is still a legal,
  // CHOOSABLE candidate — it simply isn't affected once selected. Gather the pool
  // inclusively so it can be offered/counted, then strip immune ids from whatever this
  // function actually returns (every branch below), so the effect never acts on one.
  const eligible = opts?.eligible;
  const visibleCandidates = candidatePermanents(ctx, target, { includeUnaffectable: true });
  const candidates =
    eligible === undefined ? visibleCandidates : visibleCandidates.filter((p) => eligible(p.permanentId));
  if (candidates.length === 0) {
    ctx.lastResolvedPermanentIds = [];
    return [];
  }
  if (target.count === "all") {
    const all = filterAffectable(
      ctx,
      candidates.map((p) => p.permanentId),
    );
    ctx.lastResolvedPermanentIds = all;
    return all;
  }
  if (target.isSelf || target.filter?.isSelfRef || target.fromSelectionRef !== undefined) {
    const result = filterAffectable(
      ctx,
      candidates.map((p) => p.permanentId),
    );
    ctx.lastResolvedPermanentIds = result;
    return result;
  }

  const want = effectiveTargetCount(ctx, target);
  if (candidates.length <= want && !target.upTo) {
    const result = filterAffectable(
      ctx,
      candidates.map((p) => p.permanentId),
    );
    ctx.lastResolvedPermanentIds = result;
    return result;
  }
  // Choice required: ask the printed chooser to pick (min = want unless "up to"). The FULL
  // (immune-inclusive) pool is offered so an immune permanent can be chosen.
  const ids = candidates.map((p) => p.permanentId);
  let visibleIds = visibleCandidates.map((p) => p.permanentId);
  if (target.filter?.suspended !== undefined) {
    const visibleFilter = { ...target.filter };
    delete visibleFilter.suspended;
    visibleIds = candidatePermanents(ctx, { ...target, filter: visibleFilter }, { includeUnaffectable: true }).map(
      (p) => p.permanentId,
    );
  }
  const min = target.upTo ? 0 : Math.min(want, candidates.length);
  const max = Math.min(want, candidates.length);
  const asker = target.chooser === "opponent" ? requireOpponentAsk(ctx) : ctx.ask;
  const chosen = await asker.chooseTargets(ctx, { candidates: ids, visible: visibleIds, min, max });
  const affectableChosen = filterAffectable(ctx, chosen);
  ctx.lastResolvedPermanentIds = affectableChosen;
  return affectableChosen;
}

/**
 * Drop permanentIds the source cannot affect (§15-15-5-3) from a list already chosen/
 * counted as legal targets — the second half of the `includeUnaffectable` seam in
 * `resolvePermanentTargets`.
 */
function filterAffectable(ctx: EffectContext, permanentIds: readonly string[]): string[] {
  const source = ctx.source;
  const sourceKinds = source.definition.kinds as readonly string[];
  const relevantSourceKinds =
    ctx.fx.isBeAffectedBySourceKind !== undefined ? sourceKinds.filter((k) => k === "Option" || k === "Digimon") : [];
  return permanentIds.filter((id) => {
    const p = ctx.game.permanentById(id);
    return p === undefined || !isPermanentUnaffectable(ctx, source, p, relevantSourceKinds);
  });
}

function effectiveTargetCount(ctx: EffectContext, target: Target): number {
  if (target.count === "all") return Number.POSITIVE_INFINITY;
  const encodedCount = target.count as unknown as {
    kind?: string;
    condition?: Condition;
    then?: number;
    else?: number;
  };
  if (
    typeof encodedCount === "object" &&
    encodedCount !== null &&
    encodedCount.kind === "conditional" &&
    encodedCount.condition !== undefined
  ) {
    return evaluateCondition(ctx, encodedCount.condition) ? (encodedCount.then ?? 1) : (encodedCount.else ?? 1);
  }
  const mod = target.countModifier;
  const baseCount = target.count ?? 1;
  if (mod === undefined) return baseCount;
  if (mod.condition !== undefined && !evaluateCondition(ctx, mod.condition)) return baseCount;
  const units = mod.scaling !== undefined ? scaleFactor(ctx, mod.scaling) : 1;
  return Math.max(0, baseCount + units * mod.amount);
}

/** The top-card instance ids of resolved permanents (for trash/return verbs). */
function topInstanceIds(ctx: EffectContext, permanentIds: string[]): string[] {
  const ids: string[] = [];
  for (const pid of permanentIds) {
    const p = ctx.game.permanentById(pid);
    if (p?.topCard) ids.push(p.topCard.instanceId);
  }
  return ids;
}

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
const DEFAULT_PLAY_ZONES: ZoneRef[] = ["hand"];

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
function looseCardsInZone(ctx: EffectContext, seat: Seat, zone: ZoneRef): LooseCandidate[] {
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

function findLooseCandidateByInstance(ctx: EffectContext, instanceId: string): LooseCandidate | undefined {
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
async function pickLoose(
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

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

/**
 * Count cards/permanents matching a filter across the right seats.
 * When `filter.zone` is "trash", counts loose card instances in the trash that match
 * `definitionMatches` (no permanent wrapper). Otherwise counts battle-area permanents
 * (the default for conditions like `youHave` and `opponentHas`).
 */
function countMatching(ctx: EffectContext, filter: Filter): number {
  const seats = seatsForController(ctx, filter);
  let n = 0;
  // `filter.zone` may name several LOOSE-CARD zones to sum across (e.g. "in your trash
  // or your Digimon's digivolution cards" — EX9-054/EX9-005 Negamon archetype). A single
  // zone is treated as a one-element list so the existing single-zone behavior is
  // unchanged. Only these three zones hold loose cards outside the permanent model;
  // "battleArea" (the default for `youHave`/`opponentHas`, e.g. BT2-031) and any other
  // zone value must fall through to the default per-permanent scan below — special-
  // casing on `zone !== undefined` alone silently dropped that scan to 0 (regression).
  const looseCardZones: readonly string[] = ["trash", "hand", "security", "digivolutionCards"];
  if (filter.zone === "breeding") {
    for (const seat of seats) {
      const permanent = ctx.game.player(seat).breeding;
      if (permanent !== undefined && permanentMatchesFilter(ctx, permanent, filter, ctx.source)) n++;
    }
    return n;
  }
  if (filter.zone !== undefined) {
    const zones = Array.isArray(filter.zone) ? filter.zone : [filter.zone];
    if (zones.some((z) => looseCardZones.includes(z))) {
      for (const zone of zones) {
        if (zone === "trash") {
          for (const seat of seats) {
            const trash = ctx.game.player(seat).trash;
            for (const card of trash) {
              if (definitionMatches(filter, ctx.game.definitionOf(card))) n++;
            }
          }
        } else if (zone === "hand") {
          for (const seat of seats) {
            const hand = ctx.game.player(seat).hand;
            for (const card of hand) {
              if (definitionMatches(filter, ctx.game.definitionOf(card))) n++;
            }
          }
        } else if (zone === "security") {
          for (const seat of seats) {
            const security = ctx.game.player(seat).security;
            for (const card of security) {
              if (filter.faceUp === true && card.faceUp !== true) continue;
              if (filter.faceUp === false && card.faceUp === true) continue;
              if (definitionMatches(filter, ctx.game.definitionOf(card))) n++;
            }
          }
        } else if (zone === "digivolutionCards") {
          // All of the controller's battle-area permanents' digivolution-stack cards, not
          // just the source's own stack (distinct from Scaling unit "digivolutionCards").
          for (const seat of seats) {
            for (const permanent of ctx.game.player(seat).battleArea) {
              for (const card of permanent.stack) {
                if (definitionMatches(filter, ctx.game.definitionOf(card))) n++;
              }
            }
          }
        }
      }
      return n;
    }
  }
  for (const seat of seats) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (permanentMatchesFilter(ctx, permanent, filter, ctx.source)) n++;
    }
  }
  return n;
}

/** Distinct colors among battle-area permanents matching a filter. */
function countColors(ctx: EffectContext, filter: Filter): number {
  const seats = seatsForController(ctx, filter);
  const colors = new Set<CardColor>();
  for (const seat of seats) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (!permanentMatchesFilter(ctx, permanent, filter, ctx.source)) continue;
      if (permanent.topCard === undefined) continue;
      for (const c of ctx.game.definitionOf(permanent.topCard).colors) colors.add(c);
    }
  }
  return colors.size;
}

/** Total linked cards across the battle-area permanents matching a filter (BT25-075). */
function countLinkCards(ctx: EffectContext, filter: Filter): number {
  const seats = seatsForController(ctx, filter);
  let n = 0;
  for (const seat of seats) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (!permanentMatchesFilter(ctx, permanent, filter, ctx.source)) continue;
      n += permanent.linked?.length ?? 0;
    }
  }
  return n;
}

/**
 * The multiplier a `for each/every` clause contributes: count the relevant pool
 * (cards / colors / security / trash / digivolution cards), divide by `per`, floor.
 * Returns 0 when nothing is counted (so "for each X" with no X does nothing).
 */
function scaleFactor(ctx: EffectContext, scaling: Scaling): number {
  let raw = 0;
  const filter = scaling.filter ?? {};
  // `deletedByThisEffect` overrides the normal counting source: count the permanents
  // actually deleted by the preceding DeleteByDPBudget action in this resolution (CAP-A3).
  if (filter.deletedByThisEffect) {
    const ids = ctx.lastDeletedByThisEffectIds ?? [];
    const per = scaling.per > 0 ? scaling.per : 1;
    return Math.floor(ids.length / per);
  }
  switch (scaling.unit) {
    case "cards":
      if (filter.zone === "revealed") {
        raw = (ctx.lastRevealedCards ?? []).filter((card) =>
          definitionMatches(filter, ctx.game.definitionOf({ cardId: card.cardId } as never)),
        ).length;
      } else {
        raw = countMatching(ctx, filter);
      }
      break;
    case "colors":
      raw = countColors(ctx, filter);
      break;
    case "distinctNames": {
      // "For each of your red Tamers with DIFFERENT NAMES" (BT21-082) — documented behavior
      // `Combinations.GetUniqueNameCardCount`. Same-named permanents collapse to one, so a
      // second copy of the same Tamer adds nothing. KB Q4595: the source counts itself.
      const names = new Set<string>();
      for (const seat of seatsForController(ctx, filter)) {
        for (const permanent of ctx.game.player(seat).battleArea) {
          if (!permanentMatchesFilter(ctx, permanent, filter, ctx.source)) continue;
          if (permanent.topCard === undefined) continue;
          names.add((ctx.game.definitionOf(permanent.topCard).nameEn ?? "").toLowerCase());
        }
      }
      raw = names.size;
      break;
    }
    case "security": {
      const seats = seatsForController(ctx, { ...filter, controller: filter.controller ?? "mine" });
      for (const seat of seats) {
        const stack = ctx.game.player(seat).security;
        // Honor faceUp:true on the scaling filter — count only face-up security cards
        // (BT19-096 "for each of your face-up security cards").
        raw += filter.faceUp === true ? stack.filter((c) => c.faceUp === true).length : stack.length;
      }
      break;
    }
    case "trash": {
      const seats = seatsForController(ctx, { ...filter, controller: filter.controller ?? "mine" });
      for (const seat of seats) {
        const trash = ctx.game.player(seat).trash;
        raw += Array.from(trash).filter((c) => definitionMatches(filter, ctx.game.definitionOf(c))).length;
      }
      break;
    }
    case "digivolutionCards": {
      const self = ctx.source.permanent();
      raw = self ? self.stack.filter((card) => definitionMatches(filter, ctx.game.definitionOf(card))).length : 0;
      break;
    }
    case "selfFaceDownDigivolutionCards": {
      // EX9-061 "for every 2 of this Digimon's face-down digivolution cards" — unlike
      // "digivolutionCards", only stack cards NOT face-up count.
      const self = ctx.source.permanent();
      raw = self ? self.stack.filter((c) => c.faceUp !== true).length : 0;
      break;
    }
    case "digivolutionCardsOfFiltered": {
      // Count the digivolution-stack of ONE battle-area permanent that matches `filter`
      // (the one with the LARGEST stack when multiple qualify — maximizes the player's benefit
      // and avoids a prompt in the common single-match case). This is distinct from
      // `digivolutionCards` which always reads the SOURCE permanent's stack (BT19-100:
      // "for each of 1 of your [Mother D-Reaper]'s digivolution cards").
      const candidates = candidatePermanents(ctx, { filter, count: "all" } as Target);
      raw = candidates.reduce((max, p) => Math.max(max, p.stack.length), 0);
      break;
    }
    case "digivolutionCardColors": {
      // Distinct colors among the SOURCE permanent's digivolution-stack cards (BT18-018).
      const self = ctx.source.permanent();
      if (self) {
        const colors = new Set<CardColor>();
        for (const card of self.stack) {
          for (const c of ctx.game.definitionOf(card).colors) colors.add(c);
        }
        raw = colors.size;
      }
      break;
    }
    case "selfAndDigivolutionCardColors": {
      const self = ctx.source.permanent();
      if (self?.topCard) {
        const colors = new Set<CardColor>(ctx.game.definitionOf(self.topCard).colors);
        for (const card of self.stack) {
          for (const color of ctx.game.definitionOf(card).colors) colors.add(color);
        }
        raw = colors.size;
      }
      break;
    }
    case "linkCards": {
      // Total linked cards across the battle-area permanents matching the filter ("for each of
      // your link cards", BT25-075). Counts the cards in each matching permanent's `linked` list.
      raw = countLinkCards(ctx, filter);
      break;
    }
    case "namedCount": {
      raw = scaling.countSource !== undefined ? (ctx.namedCounts?.get(scaling.countSource) ?? 0) : 0;
      break;
    }
    case "deletedThisEffect": {
      raw = ctx.deletedThisEffectIds?.length ?? ctx.lastDeletedByThisEffectIds?.length ?? 0;
      break;
    }
    default:
      raw = 0;
  }
  const per = scaling.per > 0 ? scaling.per : 1;
  const scaled = Math.floor(raw / per);
  // A `floor` clamps the multiplier UP (BT7-040: 0 security => cost 1, not 0).
  return scaling.floor !== undefined && scaled < scaling.floor ? scaling.floor : scaled;
}

/** Evaluate a parsed Condition. An unrecognized ("raw") condition is treated as
 *  unmet so the interpreter never guesses a gate it could not parse. */
function evaluateCondition(ctx: EffectContext, cond: Condition): boolean {
  const mine = ctx.source.ownerSeat;
  const opp = ctx.game.opponentOf(mine);
  switch (cond.kind) {
    case "true":
      return true;
    case "attackTargetsPlayer":
      return (
        ctx.trigger.attackerPermanentId !== undefined &&
        ctx.trigger.targetPermanentId === undefined &&
        ctx.trigger.defenderPermanentId === undefined
      );
    case "attackTargetMatchesFilter": {
      // System-A timing effects historically use targetPermanentId, while the combat
      // SubTrigger bus publishes the same declared target as defenderPermanentId.
      // Both are captured before Blocker redirection, so either shape describes the
      // originally attacked permanent rather than a later effective blocker.
      const targetId = ctx.trigger.targetPermanentId ?? ctx.trigger.defenderPermanentId;
      const target = targetId !== undefined ? ctx.game.permanentById(targetId) : undefined;
      if (target === undefined || cond.filter === undefined) return false;
      const candidates = candidatePermanents(ctx, { filter: cond.filter, count: "all" });
      return candidates.some((permanent) => permanent.permanentId === targetId);
    }
    case "lastTargetDpAtLeast": {
      const ids = ctx.lastResolvedPermanentIds ?? [];
      return (
        ids.length > 0 &&
        ids.every((id) => (ctx.game.permanentById(id)?.currentDP ?? -Infinity) >= (cond.value ?? Infinity))
      );
    }
    case "selfHasKeyword": {
      const permanent = ctx.source.permanent();
      return permanent !== undefined && cond.keyword !== undefined
        ? (ctx.game.hasKeyword?.(permanent.permanentId, cond.keyword) ?? false)
        : false;
    }
    case "selfHasOnPlayEffect": {
      const topCard = ctx.source.permanent()?.topCard;
      if (topCard === undefined) return false;
      return /\[On Play\]/i.test(ctx.game.definitionOf(topCard).effectText ?? "");
    }
    case "youDigivolvedThisTurn":
      return ctx.game.digivolvedThisTurn?.(mine) ?? false;
    case "opponentDidNotAttackWithDigimonThisTurn":
      return !attackedWithDigimonInCurrentOrPreviousTurn(ctx.game.state, opp);
    // The condition kind sets the DEFAULT side, but an explicit `controller` in the IR
    // filter wins: the runtime record emits e.g. `youHave {controller:"opponent"}` for a
    // CanSelectPermanentCondition ("there is an opponent permanent to target"), and that
    // explicit side must not be clobbered back to the kind's default.
    case "youHave":
      return cond.filter ? countMatching(ctx, { controller: "mine", ...cond.filter }) >= (cond.count ?? 1) : false;
    case "opponentHas": {
      const threshold = cond.countMin ?? cond.count ?? 1;
      return cond.filter ? countMatching(ctx, { controller: "opponent", ...cond.filter }) >= threshold : false;
    }
    case "youHaveNone":
      return cond.filter ? countMatching(ctx, { controller: "mine", ...cond.filter }) === 0 : false;
    case "ifOpponentDeclined":
      return ctx.lastOpponentDeclined === true;
    case "opponentHasNone":
      return cond.filter ? countMatching(ctx, { controller: "opponent", ...cond.filter }) === 0 : false;
    case "memoryAtLeast": {
      const value = cond.value ?? 0;
      if (cond.controller === "mine" || cond.controller === "self" || cond.controller === "opponent") {
        const seat = cond.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
        const memory = seat === ctx.game.state.turnSeat ? ctx.game.state.memory : -ctx.game.state.memory;
        return memory >= value;
      }
      return ctx.game.state.memory >= value;
    }
    case "memoryAtMost": {
      const value = cond.value ?? 0;
      if (cond.controller === "mine" || cond.controller === "self" || cond.controller === "opponent") {
        const seat = cond.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
        const memory = seat === ctx.game.state.turnSeat ? ctx.game.state.memory : -ctx.game.state.memory;
        return memory <= value;
      }
      return ctx.game.state.memory <= value;
    }
    case "securityAtLeast":
      return ctx.game.player(mine).security.length >= (cond.value ?? 0);
    case "securityAtMost":
      return ctx.game.player(mine).security.length <= (cond.value ?? 0);
    case "securityAtMostSelfFaceDownDigivolutionCards": {
      // EX9-029 / KB Q4783: "you have as many or fewer security cards as this Digimon has
      // face-down digivolution cards". An off-field source has an empty stack (0), not "always
      const self = ctx.source.permanent();
      const faceDownCount = self?.stack.filter((c) => c.faceUp !== true).length ?? 0;
      return ctx.game.player(mine).security.length <= faceDownCount;
    }
    case "handAtMost":
      return ctx.game.player(mine).hand.length <= (cond.value ?? 0);
    case "handAtLeast":
      return ctx.game.player(mine).hand.length >= (cond.value ?? 0);
    case "zoneCount": {
      // Generic resource-count gate: "if you/your opponent have N or more/fewer cards
      // in your/their hand|trash|security|deck". Sizes the seat's zone and compares.
      const seat = cond.seat === "opponent" ? opp : mine;
      const player = ctx.game.player(seat);
      const zone = cond.zone ?? "hand";
      const size = player[zone].length;
      const value = cond.value ?? 0;
      if (cond.op === "eq") return size === value;
      if (cond.op === "lt") return size < value;
      if (cond.op === "gt") return size > value;
      return cond.op === "lte" ? size <= value : size >= value;
    }
    case "zoneColorCount": {
      // "Your Tamers have N or more total colors" counts each distinct printed color once,
      // even when multiple Tamers share it (KB Q4456). The condition's zone is intentionally
      // fixed to battle-area permanents: colors are a property of cards in play, not loose zones.
      const seat = cond.seat === "opponent" ? opp : mine;
      const colors = new Set<CardColor>();
      for (const permanent of ctx.game.player(seat).battleArea) {
        if (permanent.topCard === undefined) continue;
        const definition = ctx.game.definitionOf(permanent.topCard);
        if (cond.cardType !== undefined && !definition.kinds.includes(cond.cardType as never)) continue;
        for (const color of definition.colors) colors.add(color);
      }
      const value = cond.value ?? 0;
      switch (cond.op) {
        case "lte":
          return colors.size <= value;
        case "lt":
          return colors.size < value;
        case "gt":
          return colors.size > value;
        default:
          return colors.size >= value;
      }
    }
    case "securityCompare": {
      // "If you have fewer/more security cards than your opponent" (P-127/P-129) —
      // cross-player relative comparison of YOUR security-stack size vs the OPPONENT's
      //.
      const mineCount = ctx.game.player(mine).security.length;
      const oppCount = ctx.game.player(opp).security.length;
      return cond.op === "gt" ? mineCount > oppCount : mineCount < oppCount;
    }
    case "totalSecurityCount": {
      // "There are N or fewer total cards in both players' security stacks" (BT13/EX5
      // inherited Vaccine line). Sums both stacks, then applies the encoded comparison.
      const total = ctx.game.player(mine).security.length + ctx.game.player(opp).security.length;
      return compareNumber(total, cond.op, cond.value ?? 0);
    }
    case "totalDigimonCount":
    case "totalDigimonGte": {
      // "There are N or more Digimon in play" counts BOTH players' battle areas (BT9-110
      // Q1924). Tamers and Options are excluded even though they share the same permanent zone.
      let total = 0;
      for (const seat of [mine, opp]) {
        total += ctx.game.player(seat).battleArea.filter((permanent) => {
          if (permanent.topCard === undefined) return false;
          return (ctx.game.definitionOf(permanent.topCard).kinds as string[]).includes(CardKind.Digimon);
        }).length;
      }
      return compareNumber(total, cond.kind === "totalDigimonGte" ? "gte" : cond.op, cond.value ?? 3);
    }
    case "permanentCount": {
      // "If you/your opponent have N or more/fewer permanents matching [filter]" (BT21-010).
      // Counts the seat's battle-area permanents matching the filter; with `distinctNames`,
      // collapses same-named permanents to one ("3+ [Hero] Tamers with different names").
      const seat = cond.seat === "opponent" ? opp : mine;
      const filter = { ...(cond.filter ?? {}), controller: cond.seat === "opponent" ? "opponent" : "mine" } as Filter;
      let count: number;
      if (cond.filter?.distinctNames === true) {
        const names = new Set<string>();
        for (const permanent of ctx.game.player(seat).battleArea) {
          if (!permanentMatchesFilter(ctx, permanent, filter, ctx.source)) continue;
          if (permanent.topCard === undefined) continue;
          names.add((ctx.game.definitionOf(permanent.topCard).nameEn ?? "").toLowerCase());
        }
        count = names.size;
      } else {
        count = countMatching(ctx, filter);
      }
      const value = cond.value ?? 0;
      return cond.op === "lte" || cond.op === "lt" ? count <= value : count >= value;
    }
    case "boardCountCompare": {
      // Cross-player board comparison: "your opponent has as many or more/fewer total
      // Digimon and Tamers as you". Counts battle-area permanents matching the same filter
      // on both sides, then compares opponent vs mine by default.
      const filter = cond.filter ?? { kind: ["Digimon", "Tamer"] };
      const leftSeat = cond.left === "mine" ? "mine" : "opponent";
      const rightSeat = cond.right === "opponent" ? "opponent" : "mine";
      const left = countMatching(ctx, { ...filter, controller: leftSeat } as Filter);
      const right = countMatching(ctx, { ...filter, controller: rightSeat } as Filter);
      switch (cond.op) {
        case "lt":
          return left < right;
        case "lte":
          return left <= right;
        case "eq":
          return left === right;
        case "gt":
          return left > right;
        default:
          return left >= right;
      }
    }
    case "selfHasMinTrash": {
      // "While you have N or more cards in your trash" (BT2-111). Counts the controller's (or
      // `filter.controllerDefault`'s) trash, honoring a card-definition `filter` if present.
      const seat = cond.filter?.controllerDefault === "opponent" ? opp : mine;
      const trash = ctx.game.player(seat).trash;
      const matching = cond.filter
        ? Array.from(trash).filter((c) => definitionMatches(cond.filter!, ctx.game.definitionOf(c))).length
        : trash.length;
      return matching >= (cond.count ?? 0);
    }
    case "selfHasTrait": {
      // "This Digimon with the [X] trait" (EX12-004). Matches the SOURCE permanent's LIVE top
      // card's trait union (Form ∪ Attribute ∪ Type) against `filter.nameOrTrait`. Only the top
      // card is checked (the permanent's current identity); stack cards below are not included
      // (use `selfDigivolutionStackHasTrait` for that). An off-field source or absent filter
      // returns false (conservative — we never invent a gate).
      return selfTopMatchesTrait(ctx, cond.filter);
    }
    case "selfHasName": {
      // "This Digimon is [X]" — exact current top-card name check.
      const def = sourceTopDefinition(ctx);
      if (def === undefined) return false;
      const topName = (def.nameEn ?? "").toLowerCase();
      return (cond.names ?? []).some((name) => topName === name.toLowerCase());
    }
    case "selfColorCount": {
      // "This Digimon has N or more colors" — use the deleted HOST's effective-color
      // snapshot for inherited On Deletion effects; otherwise read the live/current top.
      const deletedColors = ctx.trigger.deletedEffectiveColorsByInstanceId?.[ctx.source.instanceId];
      if (deletedColors !== undefined) {
        return compareNumber(new Set(deletedColors).size, cond.op, cond.value ?? 0);
      }
      const def = sourceTopDefinition(ctx);
      if (def === undefined) return false;
      return compareNumber(new Set(def.colors ?? []).size, cond.op, cond.value ?? 0);
    }
    case "selfLevelIs": {
      // "This Digimon is level N" — exact current top-card level.
      const def = sourceTopDefinition(ctx);
      return typeof def?.level === "number" && def.level === (cond.value ?? -1);
    }
    case "selfLevelAtLeast": {
      // "This Digimon is level N or higher" — lower-bound current top-card level.
      const def = sourceTopDefinition(ctx);
      return typeof def?.level === "number" && def.level >= (cond.value ?? Number.POSITIVE_INFINITY);
    }
    case "stackHasSameLevelCards":
      return sourceStackHasSameLevelCards(ctx, cond.count ?? cond.countMin ?? 2);
    case "selfHasNoDigivolutionCards": {
      // "If this Digimon has no digivolution cards" (BT19-101) — true only when the SOURCE
      // permanent is on the field with an empty stack (played directly, not digivolved into).
      const self = ctx.source.permanent();
      return self !== undefined && self.stack.length === 0;
    }
    case "ifThisEffectDidNotSuspend":
      return (ctx.lastSuspendedPermanentIds?.length ?? 0) === 0;
    case "selfHasInDigivolutionCards": {
      // "[X] is in this Digimon's digivolution cards" (BT19-073 AllTurns gate). True when the
      // SOURCE permanent has at least one digivolution stack card whose name or trait matches
      // any of `cond.nameOrTrait`. Mirrors `selfDigivolutionStackHasTrait` but driven by the
      // condition's own `nameOrTrait` field rather than `filter.nameOrTrait`. Off-field source
      // or absent refs => false (conservative).
      const refs = cond.nameOrTrait;
      if (!refs || refs.length === 0) return false;
      const selfPerm = ctx.source.permanent();
      if (selfPerm === undefined) return false;
      return selfPerm.stack.some((card) => {
        const stackDef = ctx.game.definitionOf(card);
        return refs.some((ref) => matchNameOrTrait(stackDef, ref));
      });
    }
    case "bindingEmpty": {
      // True when the named binding in `cond.ref` holds zero cards — i.e. the prior
      // SecurityManipulation (or similar) action trashed/moved nothing. An absent or
      // never-written binding is treated as empty (conservative: the gate passes only when the
      // action provably did something). BT18-101 EndOfAllTurns: delete Digimon + Tamer only
      // when trashing opponent's top security moved 0 cards (opponent had no security).
      if (!cond.ref) return true; // no ref means always-empty (degenerate case)
      const binding = ctx.boundPlayed?.get(cond.ref);
      return binding === undefined || binding.size === 0;
    }
    case "bindingExists": {
      // True when a previous action in this same resolution wrote at least one card/permanent
      // into the named binding. Used for "if this effect digivolved/played/moved a card, then..."
      // branches where a specific produced object gates a downstream action.
      if (!cond.ref) return false;
      const binding = ctx.boundPlayed?.get(cond.ref);
      return binding !== undefined && binding.size > 0;
    }
    case "bindingContains": {
      // True when the named binding contains at least one card whose definition matches
      // `cond.filter`. This is used after a movement action binds the exact instance ids it moved
      // (e.g. "if this effect returned a white level 7 card"). We search current zones because the
      // card has already moved by the time the downstream condition runs.
      if (!cond.ref || !cond.filter) return false;
      const binding = ctx.boundPlayed?.get(cond.ref);
      if (binding === undefined || binding.size === 0) return false;
      for (const instanceId of binding) {
        const card = findLooseCandidateByInstance(ctx, instanceId);
        if (card === undefined) continue;
        const def = ctx.game.definitionOf({ cardId: card.cardId } as never);
        if (definitionMatches(cond.filter, def)) return true;
      }
      return false;
    }
    case "isYourTurn":
      return ctx.game.state.turnSeat === mine;
    case "isOpponentsTurn":
      return ctx.game.state.turnSeat === opp;
    case "phaseIs":
      return cond.phase !== undefined && ctx.game.state.phase === cond.phase;
    case "duringAttack":
      return ctx.trigger.attackerPermanentId !== undefined;
    case "selfDigivolutionStackHasTrait":
      // "While a card with [X] in its traits is in THIS Digimon's digivolution cards" (BT7-024).
      // Reads the SOURCE permanent's stack and matches each card against the trait token(s) in
      // `filter.nameOrTrait`, using the same Form ∪ Attribute ∪ Type union as every other trait
      // match. An unset filter never matches (we do not guess).
      return selfStackMatchesTrait(ctx, cond.filter);
    case "selfDigivolutionStackHasColor": {
      const self = ctx.source.permanent();
      const colors = cond.filter?.colors ?? [];
      return (
        self !== undefined &&
        self.stack.some((card) => {
          const definition = ctx.game.definitionOf(card);
          return colors.some((color) => definition.colors.includes(COLOR_MAP[color]));
        })
      );
    }
    case "selfDigivolutionStackHasNonColor": {
      const self = ctx.source.permanent();
      const colors = cond.filter?.colors ?? [];
      return (
        self !== undefined &&
        colors.length > 0 &&
        self.stack.some((card) => {
          const definition = ctx.game.definitionOf(card);
          return colors.every((color) => !definition.colors.includes(COLOR_MAP[color]));
        })
      );
    }
    case "selfDigivolutionStackDistinctColorCount": {
      const self = ctx.source.permanent();
      if (self === undefined) return false;
      const matchingCards = self.stack.filter(
        (card) => cond.filter === undefined || definitionMatches(cond.filter, ctx.game.definitionOf(card)),
      );
      const distinctColors = new Set(matchingCards.flatMap((card) => ctx.game.definitionOf(card).colors));
      return compareNumber(distinctColors.size, cond.op, cond.value ?? 0);
    }
    case "selfTopHasText":
      // "While THIS permanent's top card has [X] in its text" (EX11-070's inherited [All Turns]
      // name/traits/effect text (KB Q5942), so an "any"/"text"-match ref is used. An off-field
      // source or absent filter never matches (we do not guess a gate).
      return selfTopMatchesText(ctx, cond.filter);
    case "selfIsSuspended": {
      // "While/if this Digimon is suspended" (EX3-042, EX8-043) — reads the SOURCE
      // permanent's suspended flag. An off-field source never matches.
      return ctx.source.permanent()?.isSuspended === true;
    }
    case "selfUnsuspended": {
      // "While this is unsuspended" (P-199) — true only when the SOURCE permanent is on the
      // field and NOT suspended. An off-field source never matches.
      const sp = ctx.source.permanent();
      return sp !== undefined && sp.isSuspended !== true;
    }
    case "selfDpAtLeast":
      return (ctx.source.permanent()?.currentDP ?? -1) >= (cond.value ?? 0);
    case "selfDigivolutionCountAtLeast": {
      // "If this Digimon has N or more digivolution cards" — the SOURCE permanent's stack size
      // (BT22-007 "10 or more digivolution cards", KB Q4858). An off-field source => 0 => false.
      const self = ctx.source.permanent();
      return (self?.stack.length ?? 0) >= (cond.value ?? 0);
    }
    case "selfDigivolutionStackCountAtLeast": {
      // "If N or more cards matching [filter] are in THIS Digimon's digivolution cards" (BT11-065
      // "4+ [Vemmon]"). Counts SOURCE-permanent stack cards whose definition matches a
      // full definition filter (name/trait, kind, color, level, etc.). An off-field source or
      // absent filter => 0 => false.
      const self = ctx.source.permanent();
      const filter = cond.filter;
      if (self === undefined || filter === undefined) return false;
      const count = self.stack.filter((card) => {
        const def = ctx.game.definitionOf(card);
        return definitionMatches(filter, def);
      }).length;
      return count >= (cond.count ?? 1);
    }
    case "notEnteredThisTurn": {
      // ＜Delay＞ option gate: the SOURCE permanent must be on
      // the field AND have entered on a turn OTHER than the current one. An off-field source
      // never qualifies (the option must still be a battle-area permanent to be trashed for cost).
      const self = ctx.source.permanent();
      return self !== undefined && self.enterFieldTurnCount !== ctx.game.state.turnCount;
    }
    case "sourceWasFaceUpSecurity":
      return ctx.trigger.securityWasFaceUp === true;
    case "allOf":
      // Logical AND: every conjunct must hold (P-116: three distinct named Digimon in
      // play). An empty/missing list never passes (we do not guess an unparsed gate).
      return (cond.conditions?.length ?? 0) > 0 && cond.conditions!.every((c) => evaluateCondition(ctx, c));
    case "anyOf":
      // Logical OR: at least one disjunct must hold ("[X] is in this Digimon's digivolution
      // cards OR you have a Digimon with [Y]"). Empty/missing list never passes.
      return (cond.conditions?.length ?? 0) > 0 && cond.conditions!.some((c) => evaluateCondition(ctx, c));
    case "not":
      // Logical negation for "otherwise/instead" branches. Require a child condition; a
      // malformed missing child must not become an unconditional true branch.
      return cond.condition !== undefined && !evaluateCondition(ctx, cond.condition);
    case "orConditions":
      // Explicit OR combinator — identical semantics to "anyOf". Used when the runtime record
      // encodes a logical OR between heterogeneous sub-conditions (e.g. BT21-010's
      // "2 or fewer security cards OR 3+ [Hero] Tamers with different names").
      return (cond.conditions?.length ?? 0) > 0 && cond.conditions!.some((c) => evaluateCondition(ctx, c));
    // --- effect-result-binding gates: read the ctx outcome bound by a PRIOR action in this
    // resolution. An UNSET binding means the producing action never ran; treat that the same as
    // the negative outcome (no delete / no use / no digivolve) so the gate is conservative. ---
    case "ifThisEffectDidNotDelete":
      // True when the prior Delete removed 0 (an immune/prevented target counts as not deleted —
      // KB BT23-069 Q5338). Unset (no Delete ran) => 0 => true.
      return (ctx.lastDeleteCount ?? 0) === 0;
    case "ifThisEffectUsed":
      // True when an Option-use happened this resolution (bool set by the 08-06 use verb).
      return ctx.lastOptionUsed === true;
    case "ifThisEffectDigivolved":
      // True when the prior digivolve happened (KB BT19-084 Q3146-Q3150).
      return ctx.lastDigivolveResult === true;
    case "ifThisEffectActed":
      // True when the prior place/trash branch actually moved >=1 card (BT16-094 "if you did
      // either"). Unset (no producing action ran) => false (conservative).
      return ctx.lastEffectActed === true;
    case "ifThisEffectDidNotAct":
      // Complement of ifThisEffectActed: true when the prior action moved 0 cards — "your opponent
      // may trash 1 Option card; if they do not, you gain 2 memory" (EX4-070, KB Q3514). Unset
      // (no producing action ran) => true (nothing acted).
      return ctx.lastEffectActed !== true;
    case "namedCountAtLeast":
      // "if N or more cards were returned/trashed by this effect" — reads the tally a prior action
      // wrote via trackCount into ctx.namedCounts (BT7-015: 7+ cards returned). Unset => 0 => false.
      return (ctx.namedCounts?.get(cond.countSource ?? "") ?? 0) >= (cond.count ?? 1);
    case "triggerSecurityIsYours":
      // whenAddSecurity: the stack that grew is the watcher controller's own (documented behavior
      return ctx.trigger.addedToSecuritySeat === mine;
    case "triggerAddedSecurityHasTrait":
      // whenAddSecurity: at least one card just added to security is FACE-UP and matches the
      // A face-down add (＜Recovery＞) never satisfies the gate.
      return triggerAddedSecurityMatches(ctx, cond.filter);
    case "triggerByYourEffect":
      // whenDigivolutionTrashed: the firing trash was driven by the watcher controller's own
      // effect (KB P-004 "when YOU trash a digivolution card"). An opponent-driven trash of the
      // same opponent Digimon must not fire this.
      return ctx.trigger.byEffectSeat === mine;
    case "triggerEnteredByEffect":
      // OnPlay/WhenDigivolving: this card entered the battle area BY AN EFFECT (the entry was
      // gating BT25-084's "after, if played or digivolved by an effect". A manual entry and every
      // non-entry timing (e.g. When Attacking) leave it unset, so the gate fails.
      return ctx.trigger.enteredByEffect === mine;
    case "triggerPlayedByEffectSource":
      return cond.sourceCardId !== undefined && ctx.trigger.playedByEffectSourceCardId === cond.sourceCardId;
    case "isDnaDigivolving":
      // WhenDigivolving: the digivolve that reached this window was a DNA digivolve (two materials
      // merged). The DNA-digivolve fire seam sets TriggerInfo.isDnaDigivolve; a single digivolve and
      // every non-digivolve timing leave it unset, so a DNA-only branch (BT20-045, P-221, EX9-021)
      // resolves only on the DNA path.
      return ctx.trigger.isDnaDigivolve === true;
    case "digivolvedFromZone":
      return ctx.trigger.digivolvedFromZone === cond.zone;
    case "playedFromZone":
      return ctx.trigger.playedFromZone === cond.zone;
    case "digiXrosCount":
      // OnPlay/WhenDigivolving: the DigiXros that triggered this window used at least `minimum`
      // material cards (BT19-063 "DigiXrosing with 2 cards"). The DigiXros fire seam carries the
      // material count in TriggerInfo.digiXrosMaterialCount; a non-DigiXros play leaves it unset,
      // so the gate fails (a plain play can never satisfy a DigiXros material-count check).
      return (ctx.trigger.digiXrosMaterialCount ?? 0) >= (cond.minimum ?? 1);
    case "triggerOptionCostAtLeast":
      // whenOptionUsed: the used Option's ORIGINAL use cost is >= value (BT19-040 "an Option card
      // with a cost of 2 or more"). KB Q5471-Q5473: the gate reads the card's cost itself, not a
      // paid/reduced cost. Unset payload (cost unknown) is conservative => does not fire.
      return (ctx.trigger.usedOptionCost ?? -1) >= (cond.value ?? 0);
    case "triggerSubjectHasColor":
      // whenPlayed/whenOneOfYoursDigivolves fire-time gate: the permanent that drove the event
      // (TriggerInfo.subjectPermanentId) has one of `filter.colors` on its top card. Read at
      // fire-time, POST-digivolve (the subject is the digivolved Digimon — KB BT25-026 Q6290/Q6291).
      // An unresolved subject or unset color filter never matches (we do not guess).
      return triggerSubjectMatchesColor(ctx, cond.filter);
    case "triggerSubjectMatchesFilter":
      return triggerSubjectMatchesFilter(ctx, cond.filter);
    case "triggerDigivolvedSameLevel": {
      const subject =
        ctx.trigger.subjectPermanentId !== undefined
          ? ctx.game.permanentById(ctx.trigger.subjectPermanentId)
          : undefined;
      const currentLevel = subject !== undefined ? ctx.game.definitionOf(subject.topCard).level : undefined;
      return currentLevel !== undefined && currentLevel === ctx.trigger.previousDigivolutionLevel;
    }
    case "triggerDeletedLevelAtLeast": {
      const cardId = ctx.trigger.deletedTopCardId;
      const definition = cardId !== undefined ? getCardDefinition(cardId) : undefined;
      return definition !== undefined && (definition.level ?? -1) >= (cond.value ?? 0);
    }
    case "triggerAttackerIsSelf":
      return ctx.source.permanent()?.permanentId === ctx.trigger.attackerPermanentId;
    case "triggerAttackerMatchesFilter": {
      const attackerId = ctx.trigger.attackerPermanentId;
      if (attackerId === undefined || cond.filter === undefined) return false;
      return candidatePermanents(ctx, { filter: cond.filter, count: "all" }, { includeUnaffectable: true }).some(
        (permanent) => permanent.permanentId === attackerId,
      );
    }
    case "triggerDefenderIsSelf":
      return ctx.source.permanent()?.permanentId === ctx.trigger.defenderPermanentId;
    case "triggerDefenderMatchesFilter": {
      const defenderId = ctx.trigger.defenderPermanentId;
      if (defenderId === undefined || cond.filter === undefined) return false;
      return candidatePermanents(ctx, { filter: cond.filter, count: "all" }, { includeUnaffectable: true }).some(
        (permanent) => permanent.permanentId === defenderId,
      );
    }
    case "triggerRemovedSecuritySeat": {
      const seat = cond.seat === "opponent" ? opp : mine;
      return ctx.trigger.removedFromSecuritySeat === seat;
    }
    case "triggerRemovalCause":
      return ctx.trigger.removalCause === cond.removalCause;
    case "triggerSourceNotDeletedAtSameTiming": {
      // whenDeletesInBattle fireCondition: the trigger source (the attacker that deleted the
      // opponent's Digimon) must NOT have been deleted at the same timing. The combat controller
      // only fires the `whenDeletesInBattle` watcher when the attacker survived (`attackerSurvived`
      // is true at the fire seam), so in practice this condition is always true when reachable.
      // We still check the board to handle edge cases where the permanent may have left after the
      // event fired (KB Q4364/Q4367: simultaneous deletion → cannot activate). (CAP-E11, BT20-044)
      const attackerId = ctx.trigger.attackerPermanentId;
      if (attackerId === undefined) return false;
      return ctx.game.permanentById(attackerId) !== undefined;
    }
    case "selfHasNameContaining": {
      // "This Digimon has [X] in its name" (BT20-080): true when the SOURCE permanent's
      // current top-card name contains any of `cond.names` as a substring. Off-field source
      // or absent names list => false (conservative). Uses case-insensitive substring match.
      const selfTop = ctx.source.permanent()?.topCard;
      const definition =
        selfTop !== undefined
          ? ctx.game.definitionOf(selfTop)
          : ctx.trigger.deletedTopCardId !== undefined
            ? ctx.game.definitionOf({ cardId: ctx.trigger.deletedTopCardId } as never)
            : undefined;
      if (definition === undefined) return false;
      const topName = (definition.nameEn ?? "").toLowerCase();
      const names = cond.names ?? [];
      const excluded = cond.excludeNames ?? [];
      return (
        names.some((n) => topName.includes(n.toLowerCase())) && !excluded.some((n) => topName.includes(n.toLowerCase()))
      );
    }
    case "raw":
      {
        if (/this card had digivolution cards/i.test(cond.raw ?? "")) {
          return (ctx.trigger.deletedWasStackInstanceIds?.length ?? 0) > 0;
        }
        const gained = /you gain(?:ed)?\s+(\d+)\s+or\s+more memory by this effect/i.exec(cond.raw ?? "");
        if (gained) return (ctx.lastMemoryGainAmount ?? 0) >= Number(gained[1]);
        const selfLevelAtLeast = /this Digimon is level\s+(\d+)\s+or higher/i.exec(cond.raw ?? "");
        if (selfLevelAtLeast) {
          const top = ctx.source.permanent()?.topCard;
          const level = top === undefined ? undefined : ctx.game.definitionOf(top).level;
          return level !== undefined && level >= Number(selfLevelAtLeast[1]);
        }
        if (/this Digimon is suspended/i.test(cond.raw ?? "")) {
          return ctx.source.permanent()?.isSuspended === true;
        }
        {
          // Multicolor inherited conditions (BT16-001–004 and peers) refer to the
          // host Digimon's effective colors, including continuous color grants.
          const m = /this Digimon has (\d+) or more colors/i.exec(cond.raw ?? "");
          if (m) {
            const self = ctx.source.permanent();
            const top = self?.topCard;
            if (self === undefined || top === undefined) return false;
            const definition = ctx.game.definitionOf(top);
            const colors = ctx.game.effectiveColors?.(self) ?? definition.colors;
            return new Set(colors).size >= Number(m[1]);
          }
        }
        {
          const m = /this Digimon is \[([^\]]+)\]/i.exec(cond.raw ?? "");
          if (m) {
            const self = ctx.source.permanent();
            const top = self?.topCard;
            return top !== undefined && (ctx.game.definitionOf(top).nameEn ?? "").toLowerCase() === m[1]!.toLowerCase();
          }
        }
        {
          const m = /this Digimon has (.+?) in its name/i.exec(cond.raw ?? "");
          if (m) {
            const self = ctx.source.permanent();
            const top = self?.topCard;
            if (top === undefined) return false;
            const name = (ctx.game.definitionOf(top).nameEn ?? "").toLowerCase();
            const names = [...m[1]!.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1]!.toLowerCase());
            return names.some((token) => name.includes(token));
          }
        }
        if (/deleted outside of a battle/i.test(cond.raw ?? "")) {
          return ctx.trigger.removalCause !== "byBattle";
        }
        if (/attacked a Digimon with higher DP than this Digimon/i.test(cond.raw ?? "")) {
          const self = ctx.source.permanent();
          const targetId = ctx.trigger.targetPermanentId ?? ctx.trigger.defenderPermanentId;
          const target = targetId !== undefined ? ctx.game.permanentById(targetId) : undefined;
          return self?.currentDP !== undefined && target?.currentDP !== undefined && target.currentDP > self.currentDP;
        }
        // Counter-window gate: "one of their Digimon is attacking" is true only while the
        // combat controller has an in-flight attacker bound to the trigger context (BT15-049).
        if (/one of their Digimon is attacking/i.test(cond.raw ?? "")) {
          return ctx.trigger.attackerPermanentId !== undefined;
        }
        {
          const m = /this Digimon has the \[([^\]]+)\] trait/i.exec(cond.raw ?? "");
          if (m) {
            const self = ctx.source.permanent();
            if (self === undefined) return false;
            return self.stack.some((card) =>
              matchNameOrTrait(ctx.game.definitionOf(card), { tokens: [m[1]!], match: "trait" }),
            );
          }
        }
        {
          const rawHasTrait = /this Digimon has (.+?) trait/i.exec(cond.raw ?? "");
          if (rawHasTrait) {
            const self = ctx.source.permanent();
            const top = self?.topCard;
            if (top === undefined) return false;
            const def = ctx.game.definitionOf(top);
            const tokens = [...rawHasTrait[1]!.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1]!);
            return tokens.some((token) => matchNameOrTrait(def, { tokens: [token], match: "trait" }));
          }
        }
        // "this Digimon had [X] or [Y] in its name" (BT13-062/EX5-045): on-deletion
        // inherited effects must inspect the deleted host's top card, not the inherited
        // source card that remains as the trigger owner.
        {
          const m = /this Digimon had (?:\[([^\]]+)\](?:\s+or\s+)?)+ in its name/i.exec(cond.raw ?? "");
          if (m) {
            const deleted = ctx.trigger.deletedTopCardId;
            const def = deleted !== undefined ? ctx.game.definitionOf({ cardId: deleted } as never) : undefined;
            const name = (def?.nameEn ?? "").toLowerCase();
            const names = [...(cond.raw ?? "").matchAll(/\[([^\]]+)\]/g)].map((x) => x[1]!.toLowerCase());
            return names.some((token) => name.includes(token));
          }
        }
      }
      // Known runtime record-raw phrases that map onto effect-result bindings the parser
      // did not normalize: "this effect digivolved" (BT16-024's place-as-security gate)
      // is the digivolve-result binding, identical to ifThisEffectDigivolved.
      if (/this effect digivolved/i.test(cond.raw ?? "")) return ctx.lastDigivolveResult === true;
      // "this effect placed" (AD1-020): gates on the preceding PlaceUnder having moved >=1 card.
      if (/this effect placed/i.test(cond.raw ?? "")) return ctx.lastEffectActed === true;
      // "you did" (BT21-012, BT16-094) / "you do" (BT11-057, BT10-106, BT11-083, BT6-068,
      // BT9-108, ST10-01 — present-tense "If you do, ..." printed text): generic "if the
      // preceding optional/conditional action actually performed its verb (play, trash,
      // place, etc.)". Both tenses normalize to the same raw phrase family and share the
      // same effect-result binding. `\b` around "do"/"did" keeps this from matching the
      // unrelated "you don't have..." negative-condition family (word boundary fails
      // inside "don't").
      if (/\byou (did|do)\b/i.test(cond.raw ?? "")) return ctx.lastEffectActed === true;
      // "N or more [TRAIT] trait cards under this Tamer/Digimon" (AD1-020 memory gate):
      // delegate to selfDigivolutionStackCountAtLeast logic.
      {
        const m = /(\d+)\s+or\s+more\s+\[([^\]]+)\]\s+trait\s+cards\s+under\s+this/i.exec(cond.raw ?? "");
        if (m) {
          const self = ctx.source.permanent();
          if (self === undefined) return false;
          const count = self.stack.filter((card) => {
            const def = ctx.game.definitionOf(card);
            return matchNameOrTrait(def, { tokens: [m[2]!], match: "trait" });
          }).length;
          return count >= Number(m[1]);
        }
      }
      // "this Digimon had [TRAIT] trait" (BT17-053's [On Deletion] token-play precondition,
      // (available even after the permanent has left the field) and match its trait union.
      {
        const m = /this Digimon had \[([^\]]+)\] trait/i.exec(cond.raw ?? "");
        if (m) {
          const def = requireCardDefinition(ctx.source.cardId);
          return def !== undefined && matchNameOrTrait(def, { tokens: [m[1]!], match: "trait" });
        }
      }
      // "N or more cards with different names in this/its digivolution cards" (EX6-006's
      // reduce-by-4 threshold and its [Breeding][End of Opponent's Turn] delete-cost gate):
      // count distinct card names in the SOURCE permanent's own digivolution stack. KB Q3696
      // confirms the effect's own host card counts toward this total (it is itself a stack
      // card when this is an inherited use), so no special-casing is needed beyond a plain
      // distinct-name count of `self.stack`.
      {
        const m =
          /(\d+)\s+or\s+more\s+cards\s+with\s+different\s+names\s+in\s+(?:its|this Digimon'?s)\s+digivolution\s+cards/i.exec(
            cond.raw ?? "",
          );
        if (m) {
          const self = ctx.source.permanent();
          if (self === undefined) return false;
          const names = new Set(
            self.stack.map((card) => (ctx.game.definitionOf(card).nameEn ?? card.cardId).toLowerCase()),
          );
          return names.size >= Number(m[1]);
        }
      }
      // "this effect deleted" (EX6-006's [Start of Your Main Phase] egg-clause: mandatory
      // Delete always runs per KB Q3694, so this reads whether it actually removed >=1
      // permanent). Positive counterpart of the structured `ifThisEffectDidNotDelete`.
      if (/^this effect deleted$/i.test((cond.raw ?? "").trim())) return (ctx.lastDeleteCount ?? 0) > 0;
      // "this effect didn't trash" (BT18-034, BT18-101, BT19-043, EX7-067's "then" clause):
      // gates on the preceding trash-capable action (SecurityManipulation trashTop, or
      // TrashDigivolution) having actually removed >=1 card. Negative counterpart of "you did".
      if (/this effect didn'?t trash|this effect did not trash/i.test(cond.raw ?? ""))
        return ctx.lastEffectActed !== true;
      return false;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Cost payment
// ---------------------------------------------------------------------------

/**
 * Conservative feasibility precheck for an action's cost, used to avoid prompting "you may…"
 * for an optional cost-bearing action the controller cannot actually perform, and (CR
 * §15-8-4-3-1) to refuse DECLARING an activation-type effect whose cost can't be paid. Returns
 * false ONLY when the cost is provably unpayable; unknown cost shapes return true so a payable
 * option is never hidden. Currently covers own-Digimon deletion, security-stack costs (BT15-003
 * "by trashing the top or bottom card of your security stack" with an empty stack),
 * `securityToHand`, and `payMemory`; extend as other provable cases arise.
 */
function canPayCost(ctx: EffectContext, cost: Cost): boolean {
  if (cost.kind === "trashBottomFaceDownUnderTamer") {
    const seat = cost.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
    return ctx.game.player(seat).battleArea.some((permanent) => {
      if (permanent.topCard === undefined || !isTamer(ctx.game.definitionOf(permanent.topCard))) return false;
      return permanent.stack.some((card) => !card.faceUp);
    });
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
    return n > 0 && available >= n;
  }
  if (cost.kind === "trash" && cost.target?.filter.zone === "digivolutionCards") {
    const candidates = candidateLooseInstances(ctx, cost.target, ["digivolutionCards"]);
    const required = cost.target.count === "all" ? candidates.length : cost.target.count;
    if (required <= 0) return false;
    if (cost.target.filter.sameHost !== true) return candidates.length >= required;
    const counts = new Map<string, number>();
    for (const candidate of candidates) {
      if (candidate.hostPermanentId === undefined) continue;
      counts.set(candidate.hostPermanentId, (counts.get(candidate.hostPermanentId) ?? 0) + 1);
    }
    return [...counts.values()].some((count) => count >= required);
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
    // A placement cost needs both halves to exist before an optional activation is
    // offered: enough matching loose cards in the declared source zones and a legal
    // destination host. EX3-066 otherwise asked to place a Cyborg with an empty
    // hand/trash, then opened a guaranteed no-op selection.
    if (cost.targetIsPermanent === true) return true;
    const zones: ZoneRef[] = (cost.target.from?.length ?? 0) > 0 ? (cost.target.from as ZoneRef[]) : ["hand"];
    const candidates = candidateLooseInstances(ctx, cost.target, zones);
    const required = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
    if (required <= 0 || (!cost.target.upTo && candidates.length < required)) return false;

    if (cost.destination === "security" || cost.destination === "battleArea") return true;
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
      return candidatePermanents(ctx, { filter: cost.host.filter, count: cost.host.count }).length > 0;
    }
    return ctx.source.permanent() !== undefined;
  }
  return true;
}

/**
 * Pay an action's cost. Returns true if paid (or no cost); false if unpayable.
 * When `out` is supplied, records the number of cards actually paid (for a variable
 * "up to N" cost whose paid count drives the parent action's scaling — BT7-040).
 */
async function relocateByEffect(
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
  switch (cost.kind) {
    case "trashBottomFaceDownUnderTamer": {
      const seat = cost.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      const candidates = ctx.game.player(seat).battleArea.filter((permanent) => {
        if (permanent.topCard === undefined || !isTamer(ctx.game.definitionOf(permanent.topCard))) return false;
        return permanent.stack.some((card) => !card.faceUp);
      });
      if (candidates.length === 0) return false;
      const chosenId =
        candidates.length === 1
          ? candidates[0]!.permanentId
          : (await ctx.ask.chooseTargets(ctx, {
              candidates: candidates.map((permanent) => permanent.permanentId),
              min: 1,
              max: 1,
            }))[0];
      if (chosenId === undefined) return false;
      const chosen = ctx.game.permanentById(chosenId);
      const bottomFaceDown = chosen?.stack.find((card) => !card.faceUp);
      if (bottomFaceDown === undefined) return false;
      const moved = await ctx.fx.trashDigivolutionCards(chosenId, [bottomFaceDown.instanceId], {
        byEffectSeat: ctx.source.ownerSeat,
        byEffectCardId: ctx.source.cardId,
      });
      return moved.length === 1;
    }
    case "suspend": {
      // "by suspending this Tamer" etc.
      const ids = cost.target
        ? await resolvePermanentTargets(ctx, cost.target, {
            eligible: (permanentId) => ctx.game.permanentById(permanentId)?.isSuspended === false,
          })
        : (() => {
            const self = ctx.source.permanent();
            return self !== undefined && !self.isSuspended ? [self.permanentId] : [];
          })();
      if (ids.length === 0) return false;
      await ctx.fx.suspend(ids, {
        byEffectSeat: ctx.source.ownerSeat,
        deferTriggers: opts?.deferSuspendTriggers,
      });
      ctx.lastSuspendedPermanentIds = ids;
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
    case "trash": {
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
        const n = cost.target.count === "all" ? ctx.game.player(seat).security.length : cost.target.count;
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
        await ctx.fx.trashFromSecurity(seat, n, { fromTop: !isBottom });
        return true;
      }
      // "By trashing 1 of your Digimon's link cards" (BT25-073) — the cost trashes a ＜Link＞
      // card sitting in a HOST permanent's `linked` list. `filter.zone === "linked"` selects
      // the link cards; the remaining filter fields (kind/controller/isSelfRef) constrain the
      // HOST permanent, NOT the link card itself. Enumerate the matching hosts' link cards, let
      // the controller pick, then route through `ctx.fx.trash` — which removes each chosen card
      // from its host's `.linked` ArraySchema and moves it to the OWNER's trash (firing
      // whenLinkTrashed). An empty pool fails the cost (unmet optional-processing condition).
      if (cost.target.filter.zone === "linked") {
        const linkTarget = cost.target;
        const { zone: _linkZone, ...hostFilter } = linkTarget.filter;
        const selfHost = linkTarget.filter.isSelfRef === true;
        const hosts: Permanent[] = [];
        if (selfHost) {
          const self = ctx.source.permanent();
          if (self !== undefined) hosts.push(self);
        } else {
          for (const seat of seatsForController(ctx, linkTarget.filter)) {
            for (const permanent of ctx.game.player(seat).battleArea) {
              if (permanentMatchesFilter(ctx, permanent, hostFilter, ctx.source)) hosts.push(permanent);
            }
          }
        }
        const candidates: LooseCandidate[] = [];
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
        const chosen = await pickLoose(ctx, { ...linkTarget, count: n }, candidates);
        if (chosen.length < n) return false;
        await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        if (out) out.paidCount = chosen.length;
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
        trashStackZone === "underMyTamers" ||
        trashStackZone === "underTamers" ||
        trashStackZone === "underTamer" ||
        trashStackZone === "underThisTamer" ||
        trashStackZone === "digivolutionCardsUnderTamers";
      if (trashesStackCards) {
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
          let eligible: LooseCandidate[] = Array.from(host.stack)
            .filter((card) => definitionMatches(cost.target!.filter, ctx.game.definitionOf(card)))
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
        const zones = trashStackZone === undefined ? ["digivolutionCards" as const] : [trashStackZone];
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
          if (cost.bindHostAs !== undefined) {
            ctx.selections ??= new Map();
            ctx.selections.set(cost.bindHostAs, hostId);
          }
        }
        const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
        if (chosen.length < n) return false;
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
        for (const [hostId, ids] of byHost) {
          await ctx.fx.trashDigivolutionCards(hostId, ids, { byEffectSeat: ctx.source.ownerSeat });
        }
        if (loose.length > 0) await ctx.fx.trash(loose, { byEffectSeat: ctx.source.ownerSeat });
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
          const chosen = await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: 1, max: cap });
          if (chosen.length < 1) return false;
          await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
          if (out) out.paidCount = chosen.length;
          return true;
        }
        const want = cost.target.count === "all" ? candidates.length : (cost.target.count ?? 1);
        if (candidates.length < want) return false;
        const chosen = await pickLoose(ctx, { ...handTarget, count: want }, candidates);
        if (chosen.length < want) return false;
        await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        if (out) out.paidCount = chosen.length;
        return true;
      }
      const ids = topInstanceIds(ctx, await resolvePermanentTargets(ctx, cost.target));
      if (ids.length === 0) return false;
      await ctx.fx.trash(ids, { byEffectSeat: ctx.source.ownerSeat });
      return true;
    }
    case "return": {
      if (!cost.target) return false;
      // Combined trash-OR-digivolution-cards return cost ("by returning 4 [Negamon] from your
      // trash or your Digimon's digivolution cards to the bottom of the Digi-Egg deck" —
      // EX9-057). All-or-nothing across the pooled candidates from both zones; always returns
      // to the DECK (never hand — the digivolutionCards-only branch's `cost.to` toggle does not
      // apply to this combined form since the printed destination is always stated explicitly).
      if (Array.isArray(cost.target.filter.zone) && cost.target.filter.zone.length > 1) {
        const zones = cost.target.filter.zone as ZoneRef[];
        const candidates = candidateLooseInstances(ctx, cost.target, zones);
        const n = cost.target.count === "all" ? candidates.length : cost.target.count;
        if (n <= 0 || candidates.length < n) return false;
        const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
        if (chosen.length < n) return false;
        await ctx.fx.returnToDeck(chosen, { toTop: /to the top/i.test(cost.raw ?? "") });
        if (out) out.paidCount = chosen.length;
        return true;
      }
      // Stack-card return cost ("by returning 2 [Vemmon] from that Digimon's digivolution
      // cards to the bottom of the deck", BT18-092): these are loose stack instances, not
      // battle-area permanent top cards. Resolve them through the loose-card path so
      // returnToDeck can remove the selected stack cards from their hosts.
      if (cost.target.filter.zone === "digivolutionCards") {
        const candidates = candidateLooseInstances(ctx, cost.target, ["digivolutionCards"]);
        const n = cost.target.count === "all" ? candidates.length : cost.target.count;
        if (n <= 0 || candidates.length < n) return false;
        const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
        if (chosen.length < n) return false;
        if (cost.to === "deckBottom") {
          await ctx.fx.returnToDeck(chosen, { toTop: false });
        } else {
          await ctx.fx.returnToHand(chosen);
        }
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
          await ctx.fx.returnToDeck(chosen, { toTop: /to the top/i.test(cost.raw ?? "") });
          if (out) out.paidCount = chosen.length;
          return true;
        }
        if (cost.target.upTo === true) {
          const max = typeof cost.target.count === "number" ? cost.target.count : candidates.length;
          const cap = Math.min(max, candidates.length);
          if (cap < 1) return false;
          let chosen = await ctx.ask.selectCards(ctx, {
            candidates: candidates.map((candidate) => candidate.instanceId),
            min: 1,
            max: cap,
          });
          if (chosen.length < 1) return false;
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
          const toTop = /to the top/i.test(cost.raw ?? "");
          await ctx.fx.returnToDeck(toTop ? [...chosen].reverse() : chosen, { toTop });
          if (out) out.paidCount = chosen.length;
          return true;
        }
        const n = cost.target.count === "all" ? candidates.length : cost.target.count;
        if (n <= 0 || candidates.length < n) return false;
        const chosen = await ctx.ask.selectCards(ctx, {
          candidates: candidates.map((c) => c.instanceId),
          min: n,
          max: n,
        });
        if (chosen.length < n) return false;
        await ctx.fx.returnToDeck(chosen, { toTop: /to the top/i.test(cost.raw ?? "") });
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
      if (cost.to === "deckBottom") {
        await ctx.fx.returnToDeck(ids, { toTop: false });
      } else {
        await ctx.fx.returnToHand(ids);
      }
      return true;
    }
    case "deleteOwn": {
      if (!cost.target) return false;
      const ids = await resolvePermanentTargets(ctx, cost.target);
      if (ids.length === 0) return false;
      // Capture the deleted Digimon's level BEFORE removal so a
      // subsequent target filter's `levelComparison.relativeTo:"lastDeleted"` can bound on it
      // (BT8-107: "delete 1 of your Digimon to delete 1 of your opponent's with level <= it").
      let maxLevel: number | undefined;
      for (const id of ids) {
        const perm = ctx.game.permanentById(id);
        const level = perm?.topCard ? ctx.game.definitionOf(perm.topCard).level : undefined;
        if (level !== undefined && level > 0) maxLevel = Math.max(maxLevel ?? 0, level);
      }
      if (maxLevel !== undefined) ctx.lastDeletedLevel = maxLevel;
      await ctx.fx.deletePermanent(ids);
      return true;
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
    case "playFromDigivolutionCards": {
      // BT19-102: choose a Digimon, then choose a matching card from that Digimon's
      // digivolution cards and play it for free. The host selection is explicit rather
      // than inferred from the card filter because the subsequent Delete target is a
      // separate choice and may include a different permanent.
      if (!cost.target || !cost.hostTarget) return false;
      const hostCandidates = await resolvePermanentTargets(ctx, cost.hostTarget);
      if (hostCandidates.length === 0) return false;
      const hostId =
        hostCandidates.length === 1
          ? hostCandidates[0]
          : (await ctx.ask.chooseTargets(ctx, { candidates: hostCandidates, min: 1, max: 1 }))[0];
      if (hostId === undefined) return false;
      const host = ctx.game.permanentById(hostId);
      if (host === undefined) return false;
      const candidates: LooseCandidate[] = host.stack
        .map((card) => ({
          instanceId: card.instanceId,
          cardId: card.cardId,
          ownerSeat: card.ownerSeat,
          hostPermanentId: host.permanentId,
          faceUp: card.faceUp,
        }))
        .filter((candidate) =>
          definitionMatches(cost.target!.filter, ctx.game.definitionOf({ cardId: candidate.cardId } as never)),
        );
      const chosen = await pickLoose(ctx, { ...cost.target, count: 1 }, candidates);
      if (chosen.length !== 1) return false;
      const played = await ctx.fx.playInstances(chosen, { payCost: false });
      if (played.length === 0) return false;
      if (out) out.paidCount = played.length;
      return true;
    }
    case "place": {
      // BT22-043/044 self-restack: "By placing this [CS] Digimon's top stacked card as its
      // bottom digivolution card" rotates the SOURCE permanent's OWN top card to the bottom of
      if (cost.raw && /bottom digivolution card/i.test(cost.raw) && /top\s+(?:stacked\s+)?card/i.test(cost.raw)) {
        const selfPerm = ctx.source.permanent();
        if (selfPerm === undefined) return false;
        const rotated = ctx.fx.placeOwnTopAtStackBottom(selfPerm.permanentId);
        if (rotated && out) out.paidCount = 1;
        return rotated;
      }
      // Routed place-as-cost (cost.destination set): the chosen card(s) go to the
      // security stack or a chosen/own digivolution stack at top/bottom, instead of
      // the default "under the source" placeUnder below. Source zones come from
      // cost.target.from (defaulting to hand); the cost is all-or-nothing.
      if (cost.destination !== undefined) {
        if (!cost.target) return false;
        if (cost.targetIsPermanent === true) {
          const sourceIds = await resolvePermanentTargets(ctx, cost.target);
          if (sourceIds.length === 0) return false;
          let hostPermId: string | undefined;
          if (cost.host !== null && typeof cost.host === "object") {
            const destIds = await resolvePermanentTargets(ctx, { filter: cost.host.filter, count: cost.host.count });
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
          } else {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return false;
            hostPermId = selfPerm.permanentId;
          }
          if (hostPermId === undefined) return false;
          if (cost.bindHostAs !== undefined) {
            ctx.selections ??= new Map();
            ctx.selections.set(cost.bindHostAs, hostPermId);
          }
          for (const sourcePermanentId of sourceIds) {
            await relocateByEffect(ctx, hostPermId, sourcePermanentId, {
              belowTop: cost.position !== "bottom",
            });
          }
          if (out) out.paidCount = sourceIds.length;
          return true;
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
          const destIds = await resolvePermanentTargets(ctx, { filter: cost.host.filter, count: cost.host.count });
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
        } else {
          const selfPerm = ctx.source.permanent();
          if (selfPerm === undefined) return false;
          hostPermId = selfPerm.permanentId;
        }
        if (hostPermId === undefined) return false;
        if (cost.bindHostAs !== undefined) {
          ctx.selections ??= new Map();
          ctx.selections.set(cost.bindHostAs, hostPermId);
        }
        if (cost.position === "choice") {
          // "top or bottom" — prompt the controller per placed card via the shared
          // binary-choice helper ctx.ask.chooseOption (index 0 = top, 1 = bottom).
          for (const instanceId of picked) {
            const idx = await ctx.ask.chooseOption(ctx, ["top", "bottom"]);
            await ctx.fx.placeUnder(hostPermId, [instanceId], { belowTop: idx === 0 });
          }
        } else {
          await ctx.fx.placeUnder(hostPermId, picked, { belowTop: cost.position !== "bottom" });
        }
        if (cost.storeAs !== undefined && picked.length > 0) {
          const pickedCard = srcCandidates.find((c) => c.instanceId === picked[0]);
          const def = pickedCard !== undefined ? ctx.game.definitionOf(pickedCard as never) : undefined;
          const level = def?.level;
          if (level !== undefined && level > 0) {
            if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
            ctx.namedCounts.set(cost.storeAs, level);
          }
        }
        if (out) out.paidCount = picked.length;
        return true;
      }
      // "By placing N card(s) from your hand as this Digimon's bottom digivolution
      // card(s)" (EX9-037/EX9-038, EX11-018). Source zones come from cost.target.from
      // (emitted by the compiler); absent, defaults to hand. Destination comes from
      // cost.underFilter when set ("under one of your Tamers"); absent, uses the source
      // permanent itself. Exotic variants (BT24-040, BT9-044, BT23-073) still lack a
      // derivable destination when neither underFilter nor a battle-area source exists.
      const self = ctx.source.permanent();
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
      if (cost.underFilter) {
        const destTarget: Target = { filter: cost.underFilter, count: 1 };
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
        if (self === undefined || !inBattleArea) return false;
        hostId = self.permanentId;
      }
      if (hostId === undefined) return false;
      await ctx.fx.placeUnder(hostId, chosen, { belowTop: false });
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

async function payOneCostOption(ctx: EffectContext, costs: readonly Cost[]): Promise<boolean> {
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
  return payCost(ctx, cost);
}

// ---------------------------------------------------------------------------
// Action dispatch
// ---------------------------------------------------------------------------

/**
 * Run a single Action against the live context.
 * Returns `true` when the action was an optional that was declined AND
 * `abortOnDecline` is set — the caller should stop processing further actions.
 */
async function runAction(ctx: EffectContext, action: Action): Promise<boolean> {
  // Per-action gate.
  if (action.kind !== "RawUnparsed" && action.kind !== "ConditionalBranch" && action.condition) {
    if (!evaluateCondition(ctx, action.condition)) return false;
  }
  // "You may" — ask the controller. Skip the prompt when the action carries a cost that is
  // provably unpayable (e.g. a "by trashing your security" cost with an empty security stack):
  // offering "you may…" for an effect the controller cannot perform is misleading. The cost
  // path below still runs, fails cleanly, and yields the same abort semantics — just no prompt.
  if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    // A color waiver is a legality permission, not an effect activation. Printed
    // "you may use this card without meeting its color requirements" means the
    // player may choose to USE the card; asking again while recomputing a hand
    // card makes the permission inert in continuous contexts (EX1-071, BT6 Options).
    action.kind !== "WaiveColorRequirement" &&
    action.optional
  ) {
    // An optional hatch is meaningful only when it can move the top Digi-Egg into
    // an empty breeding slot. Do this before opening the confirmation so the UI
    // never offers an action that the Hatch primitive would immediately no-op.
    if (action.kind === "Hatch") {
      const owner = ctx.game.player(ctx.source.ownerSeat);
      if (owner.breeding !== undefined || owner.eggDeck.length === 0) return false;
    }
    // Do not offer an optional play when no legal loose card exists. Besides avoiding a
    // meaningless UI prompt, this is required for nested entry windows: Nokia played from
    // security must finish resolving when the controller has no Agumon/Gabumon to play.
    if (
      action.kind === "PlayWithoutCost" &&
      !action.target?.isSelf &&
      action.target?.filter?.isSelfRef !== true &&
      action.fromOwnDigivolutionStack !== true
    ) {
      const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
      const candidates = candidateLooseInstances(ctx, action.target, zones).filter(
        (candidate) => !ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, candidate.cardId, "play"),
      );
      if (candidates.length === 0) return false;
    }
    // A PlaceUnder confirmation is actionable only when both sides of the move exist:
    // at least one eligible loose card and at least one legal destination host. Without
    // this preflight, cards such as BT8-104 published a "Place 1 card(s) under" decision
    // even with no X-Antibody card in hand, leaving the UI to confirm a guaranteed no-op.
    if (action.kind === "PlaceUnder" && !canAttemptPlaceUnder(ctx, action)) return false;
    // A targeted PlaceInBattleAreaSelf shape is actually "place 1 matching Option from
    // hand" (the Four Great Dragons On Deletion family), not literal self-placement.
    // Skip its optional confirmation when the source zone has no legal candidate.
    if (action.kind === "PlaceInBattleAreaSelf" && action.target !== undefined) {
      const zones = action.target.from ?? action.target.source ?? action.target.zone ?? "hand";
      const candidates = candidateLooseInstances(
        ctx,
        action.target,
        (Array.isArray(zones) ? zones : [zones]) as ZoneRef[],
      );
      if (candidates.length === 0) return false;
    }
    // A Return confirmation is actionable only when at least one legal source exists.
    // This covers optional recovery from trash (EX3-068) as well as optional bounce:
    // never ask the player to confirm a move that has no selectable card or permanent.
    if (action.kind === "Return" && !action.target.isSelf && action.target.filter.isSelfRef !== true) {
      const zone = action.target.filter.zone;
      const looseZones = action.from ?? (zone !== undefined && zone !== "battleArea" ? [zone] : undefined);
      // Only preflight loose-zone recovery here. A battle-area Return may have an
      // activation cost that changes target legality (BT16-048 suspends the Digimon
      // whose DP becomes the bounce ceiling), so its candidates must be resolved
      // after payment by the normal action path.
      if (looseZones !== undefined && candidateLooseInstances(ctx, action.target, looseZones).length === 0)
        return false;
    }
    // A "may digivolve" prompt is meaningful only when at least one matching source and
    // destination form a legal digivolution. In particular, "without paying the cost" does
    // not waive printed requirements (P-092 Q4182); do this before asking so the UI never
    // confirms an evolution the resolver will immediately discard.
    if (action.kind === "Digivolve" && !canAttemptDigivolve(ctx, action)) return false;
    const costUnpayable = action.cost !== undefined && !canPayCost(ctx, action.cost as Cost);
    if (!costUnpayable) {
      const yes = await ctx.ask.optional(ctx, describeAction(action));
      if (!yes) {
        if ((action as Action & { preserveOncePerTurnOnDecline?: boolean }).preserveOncePerTurnOnDecline === true) {
          ctx.oncePerTurnActivationDeclined = true;
        }
        return action.abortOnDecline === true;
      }
    }
  }
  // Pay a per-action cost first; abort the action if it cannot be paid. An OPTIONAL
  // resolves with no payment when they do. A Replacement carries its cost as the
  // prevention/cost-reduction gate paid by its OWN machinery (preventCheck), NOT up
  // front at install time, so it is excluded here.
  // The paid count of an "up to N" cost (BT7-040 <Digi-Burst up to 4>) drives this action's
  // scaling (-3000 per card actually trashed); a fixed-count cost leaves it undefined.
  const costPayment = { paidCount: 0 };
  let deferredCostSuspensions: string[] = [];
  // PlayPerLevel owns its own cost validation and payment (level-sum budget logic that the
  // standard payCost path cannot express); skip the generic cost gate so it is not double-paid.
  if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "PlayPerLevel" &&
    (action.costOptions?.length ?? 0) > 0
  ) {
    const paid = await payOneCostOption(ctx, action.costOptions as Cost[]);
    if (!paid) return action.abortOnDecline === true;
  } else if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "PlayPerLevel" &&
    action.cost
  ) {
    if (action.cost.optional) {
      const willPay = await ctx.ask.optional(ctx, `Pay cost: ${action.cost.raw ?? action.cost.kind}?`);
      if (willPay) await payCost(ctx, action.cost, costPayment);
    } else {
      const deferSuspendTriggers = action.kind === "Attack" && action.cost.kind === "suspend";
      const paid = await payCost(ctx, action.cost, costPayment, { deferSuspendTriggers });
      if (paid && deferSuspendTriggers) deferredCostSuspensions = [...(ctx.lastSuspendedPermanentIds ?? [])];
      if (!paid) {
        // An unpayable ACTIVATION cost ("By [paying X], [effect]. Then …") means the entire
        // ability does nothing, so abort the REMAINING actions of this effect too — otherwise
        // a downstream "Then …" payload (or a self-place security continuation) would resolve
        // for free off a cost-bearing head action that silently failed. Explicit
        // `abortOnDecline` means the IR author intended this cost/action to gate the
        // remaining clause as well. Two legacy activation-cost shapes also gate their whole
        // clause even when the IR omitted `abortOnDecline`: <Digi-Burst N> (trash from THIS
        const isDigiBurstCost =
          action.cost.kind === "trash" &&
          action.cost.target?.filter.zone === "digivolutionCards" &&
          action.cost.target.filter.isSelfRef === true;
        const isSecurityTrashCost = action.cost.kind === "trash" && action.cost.target?.filter.zone === "security";
        return action.abortOnDecline === true || isDigiBurstCost || isSecurityTrashCost;
      }
    }
  }
  if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "PlayPerLevel"
  ) {
    const extraCosts = [
      ...((action.additionalCosts ?? []) as Cost[]),
      ...(action.additionalCost !== undefined ? [action.additionalCost as Cost] : []),
    ];
    for (const extraCost of extraCosts) {
      const paid = await payCost(ctx, extraCost, costPayment);
      if (!paid) return action.abortOnDecline === true;
    }
  }
  // An "up to N" <Digi-Burst> cost scales its action by the number of cards actually paid
  //. The runtime record omits the `scaling` hint for
  // this case, so the paid count is the sole scale factor — overriding the residual-stack read
  // scaleFactor would otherwise return for a `digivolutionCards` unit.
  const digiBurstScale =
    action.kind !== "RawUnparsed" && action.cost?.kind === "trash" && action.cost.target?.upTo === true
      ? costPayment.paidCount
      : undefined;
  // The upTo-Digi-Burst paid count and a `scaling` ("for each") hint are two
  // independent multipliers; the current catalog never carries both (BT7-040 is the
  // only upTo-Digi-Burst and has no scaling). Silently letting the paid count win
  // would drop a real scaling factor and produce a wrong multiplier — surface it
  // loudly instead of guessing how to combine them.
  if (digiBurstScale !== undefined && action.kind !== "RawUnparsed" && action.scaling) {
    unsupported(ctx, action, "upTo Digi-Burst cost combined with a scaling hint is ambiguous");
  }
  // Scaling ("for each/every"): compute the multiplier from live state and apply it
  // to the amount (Draw/GainMemory/ModifyDP/ModifySecurityDP) or the target count
  // (Delete/Trash/Return/... ). A factor of 0 means the action does nothing.
  // A `usePaidCount` scaling reads the count of cards actually paid by THIS action's cost
  // ("for every Tamer this effect suspended", BT17-041) rather than re-counting the board.
  const paidCountScale =
    action.kind !== "RawUnparsed" && action.scaling?.usePaidCount === true
      ? Math.floor(costPayment.paidCount / (action.scaling.per > 0 ? action.scaling.per : 1))
      : undefined;
  const scale =
    digiBurstScale !== undefined
      ? digiBurstScale
      : paidCountScale !== undefined
        ? paidCountScale
        : action.kind !== "RawUnparsed" && action.scaling
          ? scaleFactor(ctx, action.scaling)
          : undefined;
  // A scale of 0 makes a "for each X" action do nothing — EXCEPT a SET cost-modifier,
  // where a count of 0 is a meaningful absolute cost (e.g. "cost = your security count"
  // with an empty security stack sets the cost to 0). That case resolves its own value.
  const isSetCostModifier = action.kind === "CostModifier" && action.mode === "set";
  const isDeleteLevelCeilingScaling = action.kind === "Delete" && action.scaling?.levelCeilingAdd !== undefined;
  if (scale !== undefined && scale === 0 && !isSetCostModifier && !isDeleteLevelCeilingScaling) return false;

  switch (action.kind) {
    case "Draw": {
      const seat = action.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      const drawn = await ctx.fx.draw(seat, scale === undefined ? action.amount : action.amount * scale);
      // Bind "If you do" to an ACTUAL draw. Drawing from an empty deck does not satisfy the
      // clause (ST10-01), while one or more cards drawn does and enables the following action.
      ctx.lastEffectActed = drawn.length > 0;
      return false;
    }
    case "GainMemory": {
      const amount = scale === undefined ? action.amount : action.amount * scale;
      ctx.lastMemoryGainAmount = amount;
      const seat = ctx.source.ownerSeat;
      if (action.at === "endOfTurn") {
        // Deferred one-shot ("at the end of your turn, lose 3 memory" — BT1-021). Installed
        // anchor-less so it still fires if this source is deleted first (KB Q882/Q883).
        ctx.fx.delayedGainMemory?.(seat, amount);
        return false;
      }
      ctx.fx.gainMemoryForSeat(seat, amount, { isTamerEffect: isTamer(ctx.source.definition) });
      return false;
    }
    case "SetMemory":
      ctx.fx.setMemory(action.value);
      return false;
    case "SetTurnEndMemory":
      ctx.fx.setTurnEndMinMemory?.(ctx.source.ownerSeat, action.minimum);
      return false;
    case "TrashTopDeck": {
      // No dedicated "mill" primitive; reveal then trash the revealed top N.
      const seats: Seat[] =
        action.controller === "both"
          ? [ctx.source.ownerSeat, ctx.game.opponentOf(ctx.source.ownerSeat)]
          : action.controller === "opponent"
            ? [ctx.game.opponentOf(ctx.source.ownerSeat)]
            : [ctx.source.ownerSeat];
      let totalTrashed = 0;
      const maximum = action.amount * (scale ?? 1);
      const minimum = Math.min(action.minimum ?? maximum, maximum);
      const amount =
        action.upTo === true && minimum < maximum
          ? minimum +
            (await ctx.ask.chooseOption(
              ctx,
              Array.from(
                { length: maximum - minimum + 1 },
                (_, index) => `Trash ${minimum + index} card${minimum + index === 1 ? "" : "s"}`,
              ),
            ))
          : maximum;
      for (const seat of seats) {
        const revealed = await ctx.fx.reveal(seat, amount);
        if (revealed.length > 0) {
          const ids = revealed.map((c) => c.instanceId);
          await ctx.fx.trash(ids, { byEffectSeat: ctx.source.ownerSeat });
          totalTrashed += ids.length;
          await ctx.fx.fireOnDiscardLibrary(seat, ids);
          // Fire whenTrashedFromDeck once per trashed card so a card-specific watcher
          // (BT19-097 "when THIS card is trashed from the deck") can match by card ID.
          for (const card of revealed) {
            await ctx.fx.fireWhenTrashedFromDeck(card.cardId, card.instanceId, ctx.source.cardId);
          }
        }
      }
      if (action.trackCount !== undefined) {
        ctx.namedCounts ??= new Map();
        ctx.namedCounts.set(action.trackCount, totalTrashed);
      }
      return false;
    }
    case "Delete": {
      const survivorIds = await resolveExceptSurvivors(ctx, action.target);
      let target = action.target;
      if (action.dpCeilingScaling && target.filter.dp?.value !== undefined) {
        target = {
          ...target,
          filter: {
            ...target.filter,
            dp: {
              ...target.filter.dp,
              value:
                target.filter.dp.value + scaleFactor(ctx, action.dpCeilingScaling) * action.dpCeilingScaling.amount,
            },
          },
        };
      }
      target = raiseDeletionDpCap(ctx, target);
      if (action.playCostCeiling !== undefined) {
        const ceiling = action.playCostCeiling;
        const units = scaleFactor(ctx, ceiling);
        target = {
          ...target,
          filter: {
            ...target.filter,
            playCostLte: ceiling.base + units * ceiling.raise,
          },
        };
      }
      if (scale !== undefined && action.scaling?.levelCeilingAdd === undefined && typeof target.count === "number") {
        target = { ...target, count: target.count * scale };
      }
      if (
        scale !== undefined &&
        action.scaling?.levelCeilingAdd !== undefined &&
        target.filter.levelComparison?.value !== undefined
      ) {
        target = {
          ...target,
          filter: {
            ...target.filter,
            levelComparison: {
              ...target.filter.levelComparison,
              value: target.filter.levelComparison.value + scale * action.scaling.levelCeilingAdd,
            },
          },
        };
      }
      const resolved =
        target.totalDpCap !== undefined
          ? await resolveTotalDpCapTargets(ctx, target)
          : await resolvePermanentTargets(ctx, target);
      const ids = survivorIds.length > 0 ? resolved.filter((id) => !survivorIds.includes(id)) : resolved;
      if (action.at === "endOfTurn") {
        for (const id of ids) ctx.fx.delayedDeletePlayed?.(id);
        ctx.lastDeleteCount = 0;
        return false;
      }
      // Bind the delete OUTCOME on ctx (effect-result binding): the count actually removed, read
      // by a subsequent "if this effect didn't delete" Condition (KB BT23-069 Q5338). A resolve
      // that chose 0 targets (none eligible) is also "didn't delete" => bind 0.
      ctx.lastDeleteCount = ids.length > 0 ? await ctx.fx.deletePermanent(ids) : 0;
      ctx.lastDeletedByThisEffectIds = ids.filter((id) => ctx.game.permanentById(id) === undefined);
      ctx.deletedThisEffectIds = [
        ...(ctx.deletedThisEffectIds ?? []),
        ...ctx.lastDeletedByThisEffectIds.filter((id) => !(ctx.deletedThisEffectIds ?? []).includes(id)),
      ];
      ctx.lastEffectActed = ctx.lastDeletedByThisEffectIds.length > 0;
      return false;
    }
    case "DeleteUntilCount": {
      // BT19-094 Lucemon: delete opponent Digimon until their remaining Digimon count equals
      // the number of your security cards. If they already have that many or fewer, nothing is
      // deleted. Selection is interactive among the eligible target pool.
      const desiredCount =
        action.untilCountSource === "mineSecurityCount" ? ctx.game.player(ctx.source.ownerSeat).security.length : 0;
      const candidates = candidatePermanents(ctx, { ...action.target, count: "all" });
      const toDelete = Math.max(0, candidates.length - desiredCount);
      if (toDelete === 0) {
        ctx.lastDeleteCount = 0;
        ctx.lastDeletedByThisEffectIds = [];
        ctx.lastEffectActed = false;
        if (action.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(action.trackCount, 0);
        }
        return false;
      }
      const target: Target = { ...action.target, count: toDelete };
      const selected = await resolvePermanentTargets(ctx, target);
      const deleted = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
      const actuallyDeleted = deleted > 0 ? selected.filter((id) => ctx.game.permanentById(id) === undefined) : [];
      ctx.lastDeleteCount = deleted;
      ctx.lastDeletedByThisEffectIds = actuallyDeleted;
      ctx.lastEffectActed = deleted > 0;
      if (action.trackCount !== undefined) {
        if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
        ctx.namedCounts.set(action.trackCount, deleted);
      }
      return false;
    }
    case "DeleteBudget": {
      // P-094 Destromon: select opponent permanents up to a total play-cost budget.
      // Resolve candidate permanents, sort ascending by printed play cost, iterate
      // accumulating cost until budget is exhausted.
      // BT19-096: optional scaling.budgetAdd increases the effective budget based on
      // a counted pool (e.g. face-up security cards). effectiveBudget = budget + units * budgetAdd.
      let effectiveBudget = action.budget;
      if (action.scaling !== undefined && action.scaling.budgetAdd !== undefined) {
        const units = scaleFactor(ctx, action.scaling);
        effectiveBudget += units * action.scaling.budgetAdd;
      }
      const candidates = candidatePermanents(ctx, {
        filter: action.filter,
        count: "all",
      } as Target);
      if (candidates.length === 0) {
        ctx.lastDeleteCount = 0;
        return false;
      }
      // Sort ascending by printed play cost
      const byCost = candidates
        .map((p) => {
          const cost = p.topCard !== undefined ? (ctx.game.definitionOf(p.topCard).playCost ?? 0) : 0;
          return { permanentId: p.permanentId, cost };
        })
        .sort((a, b) => a.cost - b.cost);
      // Sequential selection: prompt controller for each cheapest candidate
      const selected: string[] = [];
      let spent = 0;
      for (const candidate of byCost) {
        // upTo: the controller may decline individual picks
        if (action.upTo && spent + candidate.cost > effectiveBudget) continue;
        if (spent + candidate.cost > effectiveBudget) break; // cannot afford this one
        const yes = action.upTo
          ? await ctx.ask.optional(
              ctx,
              `Delete ${candidate.permanentId} (cost ${candidate.cost}, spent ${spent}/${effectiveBudget})?`,
            )
          : true;
        if (yes) {
          selected.push(candidate.permanentId);
          spent += candidate.cost;
        }
        if (spent >= effectiveBudget && !action.upTo) break;
      }
      ctx.lastDeleteCount = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
      return false;
    }
    case "DeleteLevelBudget": {
      // BT17-051 Argomon: delete any number of opponent Digimon whose LEVELS sum to <= budget.
      // The budget is `baseBudget` plus a scaling-driven add ("for every 2 [Argomon] in its
      // digivolution cards, +1 to the maximum"): scaleFactor() yields the floor(count/per) units,
      // each worth `scaling.budgetAdd`. `filter.hasLevel` excludes Lv.- candidates (KB Q2807).
      let budget = action.baseBudget;
      if (action.scaling) {
        const units = scaleFactor(ctx, action.scaling);
        budget += units * (action.scaling.budgetAdd ?? 1);
      }
      const candidates = candidatePermanents(ctx, { filter: action.filter, count: "all" } as Target);
      const byLevel = candidates
        .map((p) => ({
          permanentId: p.permanentId,
          level: p.topCard !== undefined ? (ctx.game.definitionOf(p.topCard).level ?? 0) : 0,
        }))
        .filter((c) => c.level > 0)
        .sort((a, b) => a.level - b.level);
      const selected: string[] = [];
      let spent = 0;
      for (const candidate of byLevel) {
        if (spent + candidate.level > budget) {
          if (action.upTo) continue;
          break;
        }
        const yes = action.upTo
          ? await ctx.ask.optional(
              ctx,
              `Delete ${candidate.permanentId} (level ${candidate.level}, spent ${spent}/${budget})?`,
            )
          : true;
        if (yes) {
          selected.push(candidate.permanentId);
          spent += candidate.level;
        }
      }
      ctx.lastDeleteCount = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
      return false;
    }
    case "DeleteByDPBudget": {
      // BT19-011: select any combination of opponent Digimon whose DP values sum to <= budget.
      // Generic "add N to the maximum DP you can choose with DP-based deletion effects"
      // modifiers also raise aggregate budgets (BT9-009/011 feeding BT9-014), in addition
      // to the dedicated AddToDPDeleteBudget producer used by later cards.
      const sourcePerm = ctx.source.permanent();
      const dedicatedBudgetBonus =
        sourcePerm !== undefined ? (ctx.fx.dpDeleteBudgetBonus?.(sourcePerm.permanentId) ?? 0) : 0;
      const genericDeletionMaxBonus = ctx.fx.deletionMaxDpBonus?.(ctx.source.ownerSeat, sourcePerm?.permanentId) ?? 0;
      const scaledBonus = action.budgetBonus
        ? action.budgetBonus.per *
          Math.floor(
            (action.budgetBonus.unit === "selfDigivolutionCards"
              ? (sourcePerm?.stack.length ?? 0)
              : countMatching(ctx, action.budgetBonus.filter ?? {})) / (action.budgetBonus.perCount ?? 1),
          )
        : 0;
      const effectiveBudget = action.baseBudget + dedicatedBudgetBonus + genericDeletionMaxBonus + scaledBonus;
      const candidates = candidatePermanents(ctx, { filter: action.target.filter, count: "all" } as Target);
      if (candidates.length === 0) {
        ctx.lastDeleteCount = 0;
        ctx.lastDeletedByThisEffectIds = [];
        return false;
      }
      // Sort ascending by live DP so the greedy pass picks cheapest first.
      const byDP = candidates.map((p) => ({ permanentId: p.permanentId, dp: p.currentDP })).sort((a, b) => a.dp - b.dp);
      const selected: string[] = [];
      let spent = 0;
      for (const candidate of byDP) {
        if (spent + candidate.dp > effectiveBudget) continue; // skip; another may still fit
        const yes = await ctx.ask.optional(
          ctx,
          `Delete ${candidate.permanentId} (DP ${candidate.dp}, spent ${spent}/${effectiveBudget})?`,
        );
        if (yes) {
          selected.push(candidate.permanentId);
          spent += candidate.dp;
        }
      }
      const deleted = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
      ctx.lastDeleteCount = deleted;
      // `selected` is the ATTEMPTED set; deletePermanent silently no-ops entries a
      // reaction (Evade/Barrier/leave-prevention) survived, so it does not equal what
      // was actually removed. `scaleFactor`'s `deletedByThisEffect` branch scales by
      // this list (KB CAP-A3 "for each deleted this way"), so it must be the ACTUAL
      // survivors only (engine-audit finding 7) — derive it by checking which
      // permanentIds are gone from the board post-delete, the same signal deletePermanent
      // itself uses internally (there is no id-level return from the primitive, only a count).
      ctx.lastDeletedByThisEffectIds =
        deleted > 0 ? selected.filter((id) => ctx.game.permanentById(id) === undefined) : [];
      return false;
    }
    case "AddToDPDeleteBudget": {
      // Inherited [All Turns] modifier (BT19-011): stack a DP-deletion-budget bonus on the
      // source permanent so any subsequent DeleteByDPBudget in the same resolution adds it.
      const perm = ctx.source.permanent();
      if (perm !== undefined) {
        ctx.fx.addDpDeleteBudget?.(perm.permanentId, action.amount);
      }
      return false;
    }
    case "ReducePlayCost": {
      // Pay-time interactive cost reduction (EX9-043 / BT25-076), resolved SERVER-SIDE inside the
      // in-hand card's BeforePayCost window. The payment is OPTIONAL: offer it,
      // execute it in the engine, then bind the earned delta on ctx.playCostDelta (accumulated, so
      // multiple BeforePayCost effects on one card compose). The client never supplies the delta —
      // it is computed from what the engine actually trashed/deleted (T-08-26).
      const payment = action.payment;
      if (!payment) return false;
      if (payment.kind === "trashFromHand") {
        // "By trashing 1 [Cyborg]/[Ver.5] card from your hand" — an optional hand discard. The card
        // being played is itself still in hand at this BeforePayCost window; exclude it so it cannot
        // be its own trash payment (it carries the [Cyborg]/[Ver.5] trait too).
        const trashTarget: Target = { filter: { ...payment.filter, zone: "hand" }, count: 1, upTo: true };
        const candidates = candidateLooseInstances(ctx, trashTarget, ["hand"]).filter(
          (c) => c.instanceId !== ctx.source.instanceId,
        );
        if (candidates.length === 0) return false;
        if (!(await ctx.ask.optional(ctx, "Trash 1 card to reduce the play cost"))) return false;
        const chosen = await pickLoose(ctx, trashTarget, candidates);
        if (chosen.length === 0) return false;
        await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        const delta = action.amount.kind === "fixed" ? action.amount.value : 0;
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, delta);
        return false;
      }
      // sacrificePermanent: "By deleting 1 of your play-cost-≤11 [Negamon] Digimon" (BT25-076).
      // Capture the chosen permanent's PRINTED play cost BEFORE deleting it, so the dynamic delta
      // equals the sacrificed Digimon's cost.
      const sacTarget = payment.target;
      const sacCandidates = await resolvePermanentTargets(ctx, { ...sacTarget, upTo: true });
      if (sacCandidates.length === 0) return false;
      if (!(await ctx.ask.optional(ctx, "Delete 1 of your Digimon to reduce the play cost"))) return false;
      const chosenIds = await ctx.ask.chooseTargets(ctx, { candidates: sacCandidates, min: 1, max: 1 });
      if (chosenIds.length === 0) return false;
      const sacrificed = ctx.game.permanentById(chosenIds[0]!);
      const sacrificedCost =
        sacrificed?.topCard !== undefined ? ctx.game.definitionOf(sacrificed.topCard).playCost : undefined;
      const removed = await ctx.fx.deletePermanent(chosenIds);
      // Only earn the reduction if the sacrifice ACTUALLY happened (a prevented/immune target
      // gate). The dynamic delta is the deleted card's printed play cost (floored, -1 sentinel => 0).
      if (removed > 0 && sacrificedCost !== undefined) {
        const delta =
          action.amount.kind === "deletedSacrificePlayCost"
            ? Math.max(0, sacrificedCost)
            : Math.max(0, action.amount.value);
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + delta;
      }
      return false;
    }
    case "OpponentMayTrashSecurity": {
      const opponent = ctx.game.opponentOf(ctx.source.ownerSeat);
      const ask = requireOpponentAsk(ctx);
      const accepted = await ask.optional(ctx, "Trash the top card of your security stack?");
      ctx.lastOpponentDeclined = !accepted;
      if (accepted && ctx.game.player(opponent).security.length > 0) {
        await ctx.fx.trashFromSecurity(opponent, 1, { fromTop: true });
      }
      return false;
    }
    case "Trash": {
      // A hand-zone target is a discard ("trash N card(s) in your/their hand"): resolve
      // loose hand cards and trash the chosen ones. Otherwise it is a field trash (the
      // resolved permanents' top cards).
      if (action.target.filter.zone === "hand") {
        // "your opponent trashes 1 card in their hand" sets chooser: "opponent" — the OWNER
        // of the hand picks their own discard, routed through requireOpponentAsk rather than
        // the controller's ctx.ask (see TrashAction.chooser doc comment). Default/absent
        // (the controller reaching into a hand, e.g. "trash 1 of your opponent's cards in
        // their hand") is unchanged.
        const asker = action.chooser === "opponent" ? requireOpponentAsk(ctx) : ctx.ask;
        let chosen: string[];
        if (action.target.untilHandSize !== undefined) {
          // "Trash cards from your hand until you have untilHandSize left" (BT20-077).
          // Compute how many must leave; player selects them. (CAP-E12)
          const handSeat = seatsForController(ctx, action.target.filter)[0] ?? ctx.source.ownerSeat;
          const handSize = ctx.game.player(handSeat).hand.length;
          const toTrash = Math.max(0, handSize - action.target.untilHandSize);
          if (toTrash === 0) {
            chosen = [];
          } else {
            const untilCandidates = candidateLooseInstances(ctx, { ...action.target, count: toTrash }, ["hand"]);
            chosen = await pickLoose(ctx, { ...action.target, count: toTrash }, untilCandidates, undefined, asker);
          }
        } else {
          const candidates = candidateLooseInstances(ctx, action.target, ["hand"]);
          chosen = await pickLoose(ctx, action.target, candidates, undefined, asker);
        }
        if (chosen.length > 0) await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        // Bind the branch-acted result so an "if you did" tail (BT16-094 OR-modal) can gate.
        ctx.lastEffectActed = chosen.length > 0;
        // Store actual trash count under the named key for downstream scaling. (CAP-E12/E13)
        if (action.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(action.trackCount, chosen.length);
        }
        if (action.bindResultAs !== undefined) {
          if (ctx.boundPlayed === undefined) ctx.boundPlayed = new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(chosen));
        }
        return false;
      }
      // Security-zone trash ("trash the top security card", BT20-080 onDeletion body).
      // Security cards are loose card instances, not battle-area permanents, so
      // resolvePermanentTargets would find nothing. Route through trashFromSecurity instead.
      if (action.target.filter.zone === "security") {
        const seat =
          action.target.filter.controller === "opponent"
            ? ctx.game.opponentOf(ctx.source.ownerSeat)
            : ctx.source.ownerSeat;
        const n = action.target.count === "all" ? ctx.game.player(seat).security.length : action.target.count;
        if (n <= 0 || ctx.game.player(seat).security.length < n) return false;
        const isBottom = action.target.filter.position === "bottom";
        await ctx.fx.trashFromSecurity(seat, n, { fromTop: !isBottom });
        return false;
      }
      if (action.target.filter.zone === "deck") {
        const seat =
          action.target.filter.controller === "opponent"
            ? ctx.game.opponentOf(ctx.source.ownerSeat)
            : ctx.source.ownerSeat;
        const deck = ctx.game.player(seat).deck;
        const n = action.target.count === "all" ? deck.length : action.target.count;
        const topCards = deck.slice(0, n);
        const topIds = topCards.map((card) => card.instanceId);
        if (topIds.length > 0) {
          await ctx.fx.trash(topIds, { byEffectSeat: ctx.source.ownerSeat });
          await ctx.fx.fireOnDiscardLibrary(seat, topIds);
          for (const card of topCards) {
            await ctx.fx.fireWhenTrashedFromDeck(card.cardId, card.instanceId, ctx.source.cardId);
          }
        }
        ctx.lastEffectActed = topIds.length > 0;
        return false;
      }
      if (action.target.filter.zone === "digivolutionCards") {
        const candidates = candidateLooseInstances(ctx, action.target, ["digivolutionCards"]);
        const chosen = await pickLoose(ctx, action.target, candidates);
        if (chosen.length > 0) await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        ctx.lastEffectActed = chosen.length > 0;
        return false;
      }
      const permanentIds = await resolvePermanentTargets(ctx, action.target);
      if (action.returnDigivolutionCardsFirst) {
        for (const permanentId of permanentIds) {
          const permanent = ctx.game.permanentById(permanentId);
          const stackIds = permanent?.stack.map((card) => card.instanceId) ?? [];
          if (stackIds.length > 0) await ctx.fx.returnToDeck(stackIds, { toTop: false });
        }
      }
      // `topCardOnly`: "trash the TOP CARD of 1 of your Digimon" (BT8-110). The `trash` verb
      // below moves loose cards, and a permanent's top card is not loose — it would be skipped
      // in silence. `armorPurge` is the move this wording describes: the top card goes to
      // trash and the digivolution card beneath is promoted (CR §16-19-1). With nothing
      // beneath to promote there is no card left for the permanent to be, so it is deleted.
      if (action.target.topCardOnly === true) {
        for (const permanentId of permanentIds) {
          const permanent = ctx.game.permanentById(permanentId);
          if (permanent === undefined) continue;
          if (permanent.stack.length > 0) await ctx.fx.armorPurge?.(permanentId);
          else await ctx.fx.deletePermanent([permanentId]);
        }
        return false;
      }
      const ids = topInstanceIds(ctx, permanentIds);
      if (ids.length > 0) await ctx.fx.trash(ids, { byEffectSeat: ctx.source.ownerSeat });
      return false;
    }
    case "HandManipulation": {
      const count = action.amount === "variable" ? (ctx.trigger.addedToHand?.instanceIds.length ?? 0) : action.amount;
      if (count <= 0) return false;
      const controller = action.controller ?? "mine";
      const target: Target = {
        filter: { zone: "hand", controller },
        count,
        upTo: true,
      };
      const candidates = candidateLooseInstances(ctx, target, ["hand"]);
      // See TrashAction.chooser: "your opponent trashes cards in their hand equal to..."
      // (BT10-077) is the opponent's own discard, not the controller reaching into it.
      const asker = action.chooser === "opponent" ? requireOpponentAsk(ctx) : ctx.ask;
      const chosen = await pickLoose(ctx, target, candidates, undefined, asker);
      if (chosen.length > 0) await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
      return false;
    }
    case "Return": {
      // Security effects such as BT10-109 encode "add this card to its owner's hand"
      // as Return(isSelfRef). The source is a loose security card, so it has no
      // permanent for resolvePermanentTargets to find.
      if (action.target.isSelf || action.target.filter.isSelfRef) {
        if (action.to === "hand") await ctx.fx.returnToHand([ctx.source.instanceId]);
        else await ctx.fx.returnToDeck([ctx.source.instanceId], { toTop: action.to === "deckTop" });
        return false;
      }
      // A non-battle-area zone target ("return 1 [X] from your trash/hand/security/... to
      // your hand", BT1-011) sources a LOOSE card instance, not a battle-area permanent —
      // resolvePermanentTargets only scans battleArea and would always find zero candidates,
      // silently no-opping the whole effect. Route through the same loose-instance resolution
      // the "Trash" case already uses for its hand-zone branch.
      const zone = action.target.filter.zone;
      const looseZones = action.from ?? (zone !== undefined && zone !== "battleArea" ? [zone] : undefined);
      if (looseZones !== undefined) {
        const candidates = candidateLooseInstances(ctx, action.target, looseZones);
        const visibleZoneIds =
          looseZones.length === 1 && (looseZones[0] === "trash" || looseZones[0] === "hand")
            ? seatsForController(ctx, action.target.filter).flatMap((seat) =>
                looseCardsInZone(ctx, seat, looseZones[0]!).map((candidate) => candidate.instanceId),
              )
            : undefined;
        const chosen = await pickLoose(ctx, action.target, candidates, undefined, ctx.ask, visibleZoneIds);
        if (chosen.length === 0) {
          if (action.trackCount !== undefined) {
            if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
            ctx.namedCounts.set(action.trackCount, 0);
          }
          if (action.bindResultAs) {
            ctx.boundPlayed ??= new Map();
            ctx.boundPlayed.set(action.bindResultAs, new Set());
          }
          return false;
        }
        let ordered = chosen;
        if (action.order === "any" && chosen.length > 1) {
          ordered =
            (await ctx.ask.orderCards?.(ctx, {
              candidates: chosen,
              visibleCards: candidates
                .filter((candidate) => chosen.includes(candidate.instanceId))
                .map((candidate) => ({
                  instanceId: candidate.instanceId,
                  cardId: candidate.cardId,
                })),
              destination: action.to === "deckTop" ? "deckTop" : "deckBottom",
            })) ?? chosen;
        }
        const moved =
          action.to === "hand"
            ? await ctx.fx.returnToHand(ordered)
            : await ctx.fx.returnToDeck(action.to === "deckTop" ? [...ordered].reverse() : ordered, {
                toTop: action.to === "deckTop",
              });
        if (action.bindResultAs) {
          ctx.boundPlayed ??= new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(moved.map((card) => card.instanceId)));
        }
        if (action.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(action.trackCount, moved.length);
        }
        return false;
      }
      const ids = topInstanceIds(ctx, await resolvePermanentTargets(ctx, action.target));
      if (ids.length === 0) {
        if (action.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(action.trackCount, 0);
        }
        if (action.bindResultAs) {
          ctx.boundPlayed ??= new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set());
        }
        return false;
      }
      const moved =
        action.to === "hand"
          ? await ctx.fx.returnToHand(ids)
          : await ctx.fx.returnToDeck(ids, { toTop: action.to === "deckTop" });
      if (action.bindResultAs) {
        ctx.boundPlayed ??= new Map();
        ctx.boundPlayed.set(action.bindResultAs, new Set(moved.map((card) => card.instanceId)));
      }
      if (action.trackCount !== undefined) {
        if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
        ctx.namedCounts.set(action.trackCount, moved.length);
      }
      return false;
    }
    case "Suspend": {
      // "For each one, suspend 1 ..." (EX6-060): a scale factor (the paid count of an
      // up-to cost, or a "for each" hint) multiplies the target COUNT for this verb.
      const target =
        scale !== undefined && typeof action.target.count === "number"
          ? { ...action.target, count: action.target.count * scale }
          : action.target;
      const ids = await resolvePermanentTargets(ctx, target);
      const suspendResult = ids.length > 0 ? await ctx.fx.suspend(ids, { byEffectSeat: ctx.source.ownerSeat }) : [];
      // The primitive owns transition legality (already suspended, restrictions). Effects
      // whose text says "suspend ... If you did" must key off the permanents that really
      // changed orientation, not merely the candidates selected by the player.
      const suspendedIds = suspendResult;
      ctx.lastSuspendedPermanentIds = suspendedIds;
      // `suspend()` may open nested trigger windows whose target resolution mutates the
      // shared context. Rebind sameTarget AFTER those windows finish, using the primitive's
      // transition receipt rather than the pre-action selection. This keeps continuations
      // such as Samādhi Śānti's "that Digimon/Tamer can't unsuspend" attached to the card
      // this effect actually suspended, and to nothing when suspension did not occur.
      ctx.lastResolvedPermanentIds = suspendedIds;
      ctx.lastEffectActed = suspendedIds.length > 0;
      // Bind "the Digimon this effect suspended" so a later action can reference exactly the
      // permanents that were suspended (empty when 0 resolved — KB Q4791/Q4792 edge case).
      if (action.bindResultAs) {
        ctx.boundPlayed ??= new Map();
        ctx.boundPlayed.set(action.bindResultAs, new Set(suspendedIds));
      }
      // When `trackCount` is present, store the actual suspended count so a subsequent
      // RepeatPerCount action can loop that many times (BT2-041, KB Q1014).
      if (action.trackCount !== undefined) {
        if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
        ctx.namedCounts.set(action.trackCount, suspendedIds.length);
      }
      return false;
    }
    case "RepeatPerCount": {
      // Loop the nested action once per count stored under `countSource` (BT2-041).
      // KB Q1014: each iteration is a separate activation with its own fresh target
      // selection. KB Q1015: all activations share the same timing priority window.
      const repeatCount =
        action.countFilter !== undefined
          ? countMatching(ctx, action.countFilter)
          : (ctx.namedCounts?.get(action.countSource) ?? 0);
      for (let i = 0; i < repeatCount; i++) {
        await runAction(ctx, action.action);
      }
      return false;
    }
    case "Unsuspend": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      if (ids.length > 0) {
        await ctx.fx.unsuspend(ids);
        if (action.target.bindAs !== undefined) {
          ctx.selections ??= new Map();
          ctx.selections.set(action.target.bindAs, ids[0]!);
        }
      }
      return false;
    }
    case "MovePermanent": {
      if (action.direction === "toBreeding") {
        // Self moves into the empty breeding slot (P-143 [End of Your Turn]).
        const self = ctx.source.permanent();
        if (self) await ctx.fx.movePermanentZone(self.permanentId, "toBreeding");
        return false;
      }
      // toBattle: move the controller's lone breeding-area Digimon to the battle area
      // (P-130 [On Play]). Breeding is single-occupancy, so the eligible permanent is the
      // owner's breeding slot when it meets the target filter (your Digimon, level ≥ 3).
      const owner = ctx.game.player(ctx.source.ownerSeat);
      const bred = owner.breeding;
      if (bred === undefined || bred.topCard === undefined) return false;
      // Q4242: a Lv.- Digimon (no level) cannot be referenced by level — not eligible.
      if (ctx.game.definitionOf(bred.topCard).level === undefined) return false;
      if (action.target && !permanentMatchesFilter(ctx, bred, action.target.filter, ctx.source)) {
        return false;
      }
      await ctx.fx.movePermanentZone(bred.permanentId, "toBattle");
      return false;
    }
    case "Hatch": {
      // "Hatch a Digi-Egg" into the controller's empty breeding slot (BT8-091 [On Play]).
      // The primitive no-ops when the Digi-Egg deck is empty or the breeding slot is
      // occupied (Comprehensive Rules §4-17/§6-4) — a faithful no-op, not a loud gap.
      ctx.fx.hatch(ctx.source.ownerSeat);
      return false;
    }
    case "ModifyDP": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      const amount = scale === undefined ? action.amount : action.amount * scale;
      for (const id of ids) {
        ctx.fx.modifyDP(
          id,
          amount,
          duration,
          action.continuous === undefined ? undefined : { continuous: action.continuous },
        );
      }
      return false;
    }
    case "AddDPFromSuspendedCost": {
      // payCost() has already selected and suspended the cost target, recording the
      // exact permanent id(s) in this resolution's context. Use the live DP after
      // payment, then apply the attack-scoped delta and keyword grants to the effect
      // target. This keeps the cost selection and the DP source bound together.
      const suspendedIds = ctx.lastSuspendedPermanentIds ?? [];
      if (suspendedIds.length === 0) return action.abortOnDecline === true;
      const amount = suspendedIds.reduce((total, id) => total + (ctx.game.permanentById(id)?.currentDP ?? 0), 0);
      const targetIds = await resolvePermanentTargets(ctx, action.target);
      if (targetIds.length === 0) return false;
      const duration = toDuration(action.duration);
      for (const id of targetIds) {
        ctx.fx.modifyDP(id, amount, duration);
        for (const keyword of action.alsoGainKeywords ?? []) {
          ctx.fx.grantKeyword(id, keyword.keyword, duration, keyword.amount);
        }
      }
      return false;
    }
    case "SetBaseDP": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.setBaseDP(id, action.value, duration);
      return false;
    }
    case "GainKeyword": {
      const kw = action.keyword.keyword;
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      // ＜Piercing＞ has a dedicated pierce store; every other CONTINUOUS keyword
      // ability is recorded in the continuous-effect ledger (real server state the
      // combat / keyword-abilities subsystem reads). ACTION-type keywords (those that
      // carry out a verb when gained — De-Digivolve, Digi-Burst, Recovery, ...) have
      // no continuous representation and remain loud gaps until their verb is wired.
      if (kw === "Piercing") {
        for (const id of ids) ctx.fx.grantPierce(id, duration);
        return false;
      }
      if (kw === "LinkMax") {
        // ＜Link +N＞ raises the affected permanent's link limit.
        // Recorded in the continuous ledger; `linkMax` (mindLink.ts) sums it on the base 1.
        const delta = action.keyword.amount ?? 1;
        for (const id of ids) ctx.fx.grantLinkMax(id, delta, duration);
        return false;
      }
      if (ACTION_TYPE_KEYWORDS.has(kw)) {
        // Action-type keywords carry out a VERB when gained, not a continuous ability.
        if (kw === "Recovery") {
          // ＜Recovery +N (Deck)＞: place the top N of your deck onto your security.
          await ctx.fx.recoverToSecurity(ctx.source.ownerSeat, action.keyword.amount ?? 1);
          return false;
        }
        if (kw === "DeDigivolve") {
          // ＜De-Digivolve N＞ on a target (the verb form). Targets resolved above. The trashing
          // effect's seat gates EX11-070's stacked-trash-lock (KB Q5943: an opponent <De-Digivolve>
          // can't strip a locked host's sources).
          for (const id of ids)
            ctx.fx.deDigivolve(id, action.keyword.amount ?? 1, { byEffectSeat: ctx.source.ownerSeat });
          return false;
        }
        if (kw === "Draw") {
          // runtime record mis-encodes <Draw N> as GainKeyword on some cards (e.g. BT22-079).
          // Treat it as the draw verb until the runtime record is fixed.
          await ctx.fx.draw(ctx.source.ownerSeat, action.keyword.amount ?? 1);
          return false;
        }
        unsupported(ctx, action, `grant action-keyword ＜${kw}＞ needs its verb wired`);
        return false;
      }
      // `count` grants the keyword N times to each target (default 1). Each call to
      // grantKeyword adds a separate entry in the continuous ledger so that Alliance ×2
      // produces two grants — the consuming side sums each Alliance entry as one extra
      // security check (KB Q3163, BT19-091: "gains <Alliance> twice").
      const grantCount = action.count ?? 1;
      const keywordAmount = scale === undefined ? action.keyword.amount : (action.keyword.amount ?? 1) * scale;
      for (const id of ids) {
        for (let i = 0; i < grantCount; i++) {
          const active =
            action.whileMatchesTargetFilter === true
              ? () => {
                  const permanent = ctx.game.permanentById(id);
                  return (
                    permanent !== undefined && permanentMatchesFilter(ctx, permanent, action.target.filter, ctx.source)
                  );
                }
              : undefined;
          ctx.fx.grantKeyword(id, kw, duration, keywordAmount, {
            ...(active === undefined ? {} : { active }),
            sourceCardId: ctx.source.cardId,
            sourceEffectText: ctx.activeEffectText,
          });
        }
      }
      return false;
    }
    case "PlayMultiple": {
      const from = Array.isArray(action.from)
        ? action.from
        : [action.from === "digivolution" ? "digivolutionCards" : action.from];
      const target: Target = { filter: action.filter, count: "all", upTo: true };
      const candidates = candidateLooseInstances(ctx, target, from);
      if (candidates.length === 0) {
        ctx.lastPlayedPermanentIds = [];
        return false;
      }
      const selected = await ctx.ask.selectCards(ctx, {
        candidates: candidates.map((c) => c.instanceId),
        min: action.optional ? 0 : 1,
        max: candidates.length,
      });
      const chosen: string[] = [];
      let usedCost = 0;
      for (const instanceId of selected) {
        const cand = candidates.find((c) => c.instanceId === instanceId);
        if (cand === undefined) continue;
        const playCost = ctx.game.definitionOf({ cardId: cand.cardId } as never).playCost;
        if (playCost === undefined || usedCost + playCost > action.totalCost) continue;
        chosen.push(instanceId);
        usedCost += playCost;
      }
      if (chosen.length === 0) {
        ctx.lastPlayedPermanentIds = [];
        return false;
      }
      const played = await ctx.fx.playInstances(chosen, {
        payCost: action.payCost,
        ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
      });
      ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
      return false;
    }
    case "PlayWithoutCost": {
      // Bind "the Digimon this effect played" from whichever branch resolves the play, so a later
      // action (e.g. BT16-015's Delete with dp.valueFrom) can reference exactly what was played.
      const bindPlayWithoutCost = () => {
        if (action.bindResultAs && ctx.lastPlayedPermanentIds && ctx.lastPlayedPermanentIds.length > 0) {
          ctx.boundPlayed ??= new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(ctx.lastPlayedPermanentIds));
        }
      };
      // ＜Delay＞-armed gate: if the action is marked requiresDelayArmed, the source permanent
      // must carry an active Delay keyword grant (armed by a prior GainKeyword(Delay) on an
      // earlier turn). Off-field source → skip. Armed → consume the grant, then proceed.
      if (action.requiresDelayArmed === true) {
        if (ctx.delayArmedConsumed !== true) {
          const self = ctx.source.permanent();
          if (self === undefined) return false;
          const hasDelay = (ctx.fx.grantedKeywords?.(self.permanentId) ?? []).some((g) => g.keyword === "Delay");
          if (!hasDelay) return false;
          ctx.fx.revokeKeyword?.(self.permanentId, "Delay");
        }
      }
      // Empty-breeding gate: a breeding-area play requires the slot empty (single-occupancy
      // rule) — BT18-101 "play [Lucemon: Larva] to your EMPTY breeding area". Honor both the
      // real `breeding: true` flag the card emits and the spec's `requiresEmpty` form.
      if (action.requiresEmpty === "breedingArea" || action.breeding === true) {
        const mine = ctx.source.ownerSeat;
        const breeding = ctx.game.player(mine).breeding;
        if (breeding !== undefined && breeding.topCard !== undefined) return false;
      }
      if (action.target?.isSelf || action.target?.filter?.isSelfRef) {
        // "Play this card without paying its cost" — from security (the common
        // [Security] form) or from hand.
        const self = ctx.source;
        // Self-play actions bypass the loose-candidate pool below, so enforce the
        // same player-level effect-play prohibition explicitly (Crimson Blaze vs.
        // a Digimon's own Security "play this card" effect).
        if (ctx.fx.isPlayProhibited?.(self.ownerSeat, self.cardId, "play") === true) {
          ctx.lastPlayedPermanentIds = [];
          return false;
        }
        const fromSecurity = action.from?.includes("security") ?? ctx.source.permanent() === undefined;
        if (fromSecurity) {
          const played = await ctx.fx.playFromSecurity(self.instanceId, { payCost: action.payCost });
          ctx.lastPlayedPermanentIds = played !== undefined ? [played.permanentId] : [];
        } else if (action.from?.includes("trash") === true) {
          // "Play this card FROM THE TRASH ..." (BT2-083's OnDeletion revive, EX7-060's
          // `[Trash][Main]` self-play): the source is a loose trash-resident CardInstance,
          // not a hand card — `playFromHand`'s `locateInHand` cannot find it there (a
          // silent no-op; the trash-activation half of the eighth engine gap). Route
          // through the zone-agnostic `playInstances` instead, which locates a loose
          // instance in ANY zone.
          const played = await ctx.fx.playInstances([self.instanceId], {
            payCost: action.payCost,
            ...(action.reduceCostBy !== undefined ? { costDelta: action.reduceCostBy } : {}),
          });
          ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        } else {
          // "Play this card with the play cost reduced by N" (EX10-035): fold the reduction into
          // the play verb when paying. A free play (payCost false) ignores reduceCostBy.
          // This is an effect-driven play, not a bare zone move. Route through the
          // generalized play seam so the card's [On Play] window and `whenPlayed`
          // watchers both fire (the same contract used by filtered plays).
          const played = await ctx.fx.playInstances([self.instanceId], {
            payCost: action.payCost,
            ...(action.reduceCostBy !== undefined ? { costDelta: action.reduceCostBy } : {}),
          });
          ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        }
        bindPlayWithoutCost();
        return false;
      }
      // "Play N [X] from THIS Digimon's OWN digivolution cards" (BT22-007, KB Q4858-Q4860):
      // source strictly from the SOURCE permanent's stack (not every battle-area permanent's, and
      // valid for a breeding-area source). Play up to `count` matching cards, as many as possible.
      if (action.fromOwnDigivolutionStack) {
        const self = ctx.source.permanent();
        if (self === undefined) return false;
        const matching = self.stack.filter((c) =>
          definitionMatches(action.target.filter, ctx.game.definitionOf({ cardId: c.cardId } as never)),
        );
        if (matching.length === 0) {
          ctx.lastEffectActed = false;
          return false;
        }
        const cap = action.target.count === "all" ? matching.length : Math.min(action.target.count, matching.length);
        // KB Q4860: play 3 (or as many as possible up to the cap) — a mandatory as-many-as-possible
        // selection, NOT an "up to" partial. Take the first `cap` matching stack cards.
        const chosenOwn = matching.slice(0, cap).map((c) => c.instanceId);
        if (chosenOwn.length > 0) {
          const played = await ctx.fx.playInstances(chosenOwn, {
            payCost: action.payCost,
            ...(action.suspended === true ? { suspended: true } : {}),
            ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
          });
          ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        } else {
          ctx.lastPlayedPermanentIds = [];
        }
        ctx.lastEffectActed = chosenOwn.length > 0;
        bindPlayWithoutCost();
        return false;
      }
      // Filtered "play N [X] from <zones> without paying the cost". Resolve the
      // candidate loose cards by filter across the stated zones (defaulting to the
      // hand), prompt the controller, and play the chosen instances.
      //
      // dpCeilingModifier: raise or lower the dp filter's value ceiling before resolving
      // candidates. The scaled count comes from either a prior Trash action's `trackCount`
      // (`scalingSource`, CAP-E13, BT20-077) or a live board count (`scaling`, EX11-032's
      // "for each suspended Digimon"). If the adjusted ceiling is ≤ 0 the candidate pool is
      // empty and no card can be played.
      const scaledPlayTarget: Target =
        action.scaling !== undefined && typeof action.target.count === "number"
          ? {
              ...action.target,
              count: action.target.count * scaleFactor(ctx, action.scaling),
            }
          : action.target;
      const playTarget = (() => {
        const mod = action.dpCeilingModifier;
        if (mod === undefined) return scaledPlayTarget;
        const scaledCount =
          mod.scaling !== undefined
            ? scaleFactor(ctx, mod.scaling)
            : (ctx.namedCounts?.get(mod.scalingSource ?? "") ?? 0);
        const adjustment = mod.amount * scaledCount;
        const origDp = scaledPlayTarget.filter.dp;
        if (origDp === undefined || typeof origDp !== "object" || !("value" in origDp)) return scaledPlayTarget;
        const newValue =
          mod.mode === "raiseCeiling" ? (origDp.value as number) + adjustment : (origDp.value as number) - adjustment;
        if (newValue <= 0) {
          // Adjusted ceiling is non-positive: no card qualifies.
          return { ...scaledPlayTarget, filter: { ...scaledPlayTarget.filter, dp: { ...origDp, value: -1 } } };
        }
        return { ...scaledPlayTarget, filter: { ...scaledPlayTarget.filter, dp: { ...origDp, value: newValue } } };
      })();
      // playCostCeiling: dynamically raise the playCostLte ceiling before resolving candidates.
      // Counts cards matching filter.zone/controller across all applicable seats, then computes:
      //   ceiling = base + Math.floor(totalCards / per) * raise
      // and overrides the target filter's playCostLte with the result. (CAP-E16, BT21-079)
      const playCostAdjustedTarget = (() => {
        const ceiling = action.playCostCeiling;
        if (ceiling === undefined) return playTarget;
        const mine = ctx.source.ownerSeat;
        const opp = ctx.game.opponentOf(mine);
        const f = ceiling.filter;
        const zone = (f as { zone?: string }).zone;
        const controller = (f as { controller?: string }).controller;
        const seats: Seat[] =
          controller === "both" || controller === undefined ? [mine, opp] : controller === "opponent" ? [opp] : [mine];
        let totalCards = 0;
        if (ceiling.unit === "digivolutionCards") {
          for (const seat of seats) {
            for (const permanent of ctx.game.player(seat).battleArea) {
              if (permanentMatchesFilter(ctx, permanent, f, ctx.source)) {
                totalCards += permanent.stack.length;
              }
            }
          }
        } else if (zone === "trash") {
          for (const seat of seats) totalCards += ctx.game.player(seat).trash.length;
        }
        const computedCeiling = ceiling.base + Math.floor(totalCards / ceiling.per) * ceiling.raise;
        return { ...playTarget, filter: { ...playTarget.filter, playCostLte: computedCeiling } };
      })();
      const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
      let candidates = candidateLooseInstances(ctx, playCostAdjustedTarget, zones);
      // Seat-level RestrictPlay: drop candidates the resolving effect's owner is forbidden
      // from playing (the effect is attributed to ctx.source.ownerSeat, so the prohibition on
      // THAT seat applies — Q4676; the source player's own effects are unaffected — Q4675).
      candidates = candidates.filter((c) => !ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, c.cardId, "play"));
      // sameLevelAsAttacker: restrict to cards whose printed level matches the open attacker
      // (EX12-069 "of the same level as the attacking Digimon"). Return no candidates when
      // no attack is open (no subject/attacker id in the trigger).
      if (action.target?.filter?.sameLevelAsAttacker === true) {
        const attackerId = ctx.trigger.subjectPermanentId ?? ctx.trigger.attackerPermanentId;
        const attackerPermanent = attackerId !== undefined ? ctx.game.permanentById(attackerId) : undefined;
        const attackerLevel =
          attackerPermanent?.topCard !== undefined ? ctx.game.definitionOf(attackerPermanent.topCard).level : undefined;
        candidates =
          attackerLevel !== undefined
            ? candidates.filter((c) => ctx.game.definitionOf({ cardId: c.cardId } as never).level === attackerLevel)
            : [];
      }
      // notSameNameAs: "without the same name as cards in the battle area or trash" (EX5 Deva
      // Security effects). Drop any candidate whose card name already appears among the
      // controller's permanents (top cards) and/or trash in the listed zones.
      if (action.notSameNameAs && action.notSameNameAs.length > 0) {
        const seat = ctx.source.ownerSeat;
        const player = ctx.game.player(seat);
        const excludedNames = new Set<string>();
        for (const zone of action.notSameNameAs) {
          if (zone === "battleArea") {
            for (const permanent of player.battleArea) {
              if (permanent.topCard === undefined) continue;
              const n = ctx.game.definitionOf(permanent.topCard).nameEn;
              if (n) excludedNames.add(n);
            }
          } else {
            for (const card of player.trash) {
              const n = ctx.game.definitionOf(card).nameEn;
              if (n) excludedNames.add(n);
            }
          }
        }
        candidates = candidates.filter(
          (c) => !excludedNames.has(ctx.game.definitionOf({ cardId: c.cardId } as never).nameEn),
        );
      }
      const visibleZoneIds = zones.every((zone) => zone === "trash" || zone === "hand")
        ? seatsForController(ctx, playCostAdjustedTarget.filter).flatMap((seat) =>
            zones.flatMap((zone) => looseCardsInZone(ctx, seat, zone).map((candidate) => candidate.instanceId)),
          )
        : zones.every((zone) => zone === "digivolutionCards")
          ? [playCostAdjustedTarget.filter, ...(playCostAdjustedTarget.orFilters ?? [])]
              .flatMap((filter) =>
                seatsForController(ctx, filter).flatMap((seat) =>
                  looseCardsInZone(ctx, seat, "digivolutionCards").map(({ instanceId }) => instanceId),
                ),
              )
              .filter((instanceId, index, all) => all.indexOf(instanceId) === index)
          : undefined;
      const chosen = await pickLoose(ctx, playCostAdjustedTarget, candidates, undefined, ctx.ask, visibleZoneIds);
      if (chosen.length > 0) {
        // Options are USED, not played as permanents. `playInstances` intentionally rejects
        // Option definitions, so routing every PlayWithoutCost target through it silently
        // dropped effects such as BT4-089 using Hell's Gate from hand. Preserve the Option
        // lifecycle here: resolve [Main], move it to trash, and fire whenOptionUsed. The
        // printed cost is still reported to watchers even though this action pays no cost.
        const optionIds = chosen.filter((instanceId) => {
          const candidate = candidates.find((c) => c.instanceId === instanceId);
          if (candidate === undefined) return false;
          return ctx.game.definitionOf({ cardId: candidate.cardId } as never).kinds.includes(CardKind.Option);
        });
        for (const optionId of optionIds) {
          const candidate = candidates.find((c) => c.instanceId === optionId);
          const usedCost =
            candidate === undefined ? undefined : ctx.game.definitionOf({ cardId: candidate.cardId } as never).playCost;
          await ctx.fx.useOptionFromHand(ctx, optionId, usedCost);
        }
        const permanentIds = chosen.filter((instanceId) => !optionIds.includes(instanceId));
        const played =
          permanentIds.length > 0
            ? await ctx.fx.playInstances(permanentIds, {
                payCost: action.payCost,
                breeding: action.breeding,
                suspended: action.suspended,
                effectSourceCardId: ctx.source.cardId,
                ...(action.reduceCostBy !== undefined ? { costDelta: action.reduceCostBy } : {}),
                ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
              })
            : [];
        ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
      } else {
        ctx.lastPlayedPermanentIds = [];
      }
      // Bind the branch-acted result so an "if you did" tail (BT16-094 OR-modal) can gate.
      ctx.lastEffectActed = chosen.length > 0;
      bindPlayWithoutCost();
      return false;
    }
    case "PlayFromZone": {
      // CAP-A10 (BT19-099): play a card from specified zone(s) with an optional cost reduction.
      // Semantics: gather candidates from `from` zones, post-filter by relativeToLeavingDigimon
      // when present, prompt the controller, then play the chosen instance with cost reduced by
      // `costReduction` (floored at 0). `payCost` defaults to true; false means free play.
      const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
      let pfzCandidates = candidateLooseInstances(ctx, action.target, zones);

      // relativeToLeavingDigimon: the target's printed playCost must equal the triggering
      // leaving Digimon's playCost + N (BT19-099 ＜Delay＞ body, KB Q3175).
      // The leaving Digimon is identified via ctx.trigger.subjectPermanentId (the whenLeavesPlay
      // event subject). Because the permanent may have already left the field, its playCost is
      // read from the definition via its last-known cardId stored on the trigger.
      const playCostFilter = action.target?.filter?.playCost;
      if (
        playCostFilter !== null &&
        typeof playCostFilter === "object" &&
        "relativeToLeavingDigimon" in playCostFilter
      ) {
        // whenLeavesPlay fires with `deletedPermanentId` BEFORE removal, so the permanent is
        // still live on the board and its playCost is readable. Fall back to subjectPermanentId
        // for other event seams.
        const leavingId = ctx.trigger.deletedPermanentId ?? ctx.trigger.subjectPermanentId;
        const leavingPerm = leavingId !== undefined ? ctx.game.permanentById(leavingId) : undefined;
        const leavingCost =
          leavingPerm?.topCard !== undefined ? (ctx.game.definitionOf(leavingPerm.topCard).playCost ?? 0) : undefined;
        if (leavingCost === undefined) {
          // No triggering Digimon in context — the condition can't be evaluated; skip play.
          ctx.lastEffectActed = false;
          return false;
        }
        const targetCost = leavingCost + playCostFilter.relativeToLeavingDigimon;
        pfzCandidates = pfzCandidates.filter(
          (c) => (ctx.game.definitionOf({ cardId: c.cardId } as never).playCost ?? 0) === targetCost,
        );
      }

      const payCost = action.payCost !== false; // true by default
      // Static reduction plus an optional per-unit dynamic reduction scoped to THIS play
      // ("reduce this effect's paid play cost by 1 for each face-up security card", EX11-034).
      const scaledReduction =
        action.costReductionScaling !== undefined ? scaleFactor(ctx, action.costReductionScaling) : 0;
      const costDelta = payCost ? (action.costReduction ?? 0) + scaledReduction : 0;
      const pfzChosen = await pickLoose(ctx, action.target, pfzCandidates);
      if (pfzChosen.length > 0) {
        const played = await ctx.fx.playInstances(pfzChosen, {
          payCost,
          ...(costDelta > 0 ? { costDelta } : {}),
          ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
        });
        ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        if (action.bindResultAs && ctx.lastPlayedPermanentIds.length > 0) {
          if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
          ctx.boundPlayed!.set(action.bindResultAs, new Set(ctx.lastPlayedPermanentIds));
        }
      } else {
        ctx.lastPlayedPermanentIds = [];
      }
      ctx.lastEffectActed = pfzChosen.length > 0;
      return false;
    }
    case "Search": {
      const seat = ctx.source.ownerSeat;
      const searchZone = action.searchZone ?? action.filter.zone;
      if (searchZone === "security") {
        const security = ctx.game.player(seat).security;
        const { zone: _zone, ...definitionFilter } = action.filter;
        const candidates = security.filter((card) =>
          definitionMatches(definitionFilter, ctx.game.definitionOf(card) as DefinitionFacts),
        );
        const maximum = action.count === "all" ? candidates.length : action.count;
        const selectedIds = await ctx.ask.selectCards(ctx, {
          candidates: candidates.map((card) => card.instanceId),
          min: 0,
          max: Math.min(maximum, candidates.length),
          visible: security.map((card) => card.instanceId),
          visibleCards: security.map((card) => ({
            instanceId: card.instanceId,
            cardId: card.cardId,
          })),
        });
        const selected = candidates.filter((card) => selectedIds.includes(card.instanceId));
        for (const card of selected) card.faceUp = true;
        ctx.lastRevealedCards = selected.map((card) => ({
          instanceId: card.instanceId,
          cardId: card.cardId,
          ownerSeat: card.ownerSeat,
        }));
        if (action.bindResultAs !== undefined) {
          ctx.boundPlayed ??= new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(selectedIds));
        }
        if (action.then?.kind === "PlayWithoutCost") {
          const played =
            selectedIds.length > 0 ? await ctx.fx.playInstances(selectedIds, { payCost: action.then.payCost }) : [];
          ctx.lastPlayedPermanentIds = (played ?? []).map((permanent) => permanent.permanentId);
        } else if (action.to === "hand" && selectedIds.length > 0) {
          await ctx.fx.returnToHand(selectedIds);
        }
        ctx.lastEffectActed =
          action.then?.kind === "PlayWithoutCost"
            ? (ctx.lastPlayedPermanentIds?.length ?? 0) > 0
            : selectedIds.length > 0;
        return false;
      }
      ctx.lastRevealedCards = undefined;
      await ctx.fx.searchDeck(seat, (def) => definitionMatches(action.filter, def), {
        min: 0,
        max: action.count === "all" ? Number.MAX_SAFE_INTEGER : action.count,
      });
      return false;
    }
    case "SearchSecurity": {
      const continuationSource: string = action.then.source;
      if (continuationSource !== "security") {
        unsupported(ctx, action, `SearchSecurity cannot continue from ${continuationSource}`);
        return false;
      }
      const security = ctx.game.player(ctx.source.ownerSeat).security;
      const candidates = security.filter((card) =>
        definitionMatches(action.target.filter, ctx.game.definitionOf(card) as DefinitionFacts),
      );
      const maximum =
        action.target.count === "all" ? candidates.length : Math.min(action.target.count, candidates.length);
      const minimum = action.then.optional === true || action.target.upTo === true ? 0 : maximum;
      const selectedIds = await ctx.ask.selectCards(ctx, {
        candidates: candidates.map((card) => card.instanceId),
        min: minimum,
        max: maximum,
        visible: security.map((card) => card.instanceId),
        // Security is private and therefore absent from the normal client instance index.
        // Send the authoritative identities with the decision so the search modal renders
        // real cards instead of anonymous placeholders (ST10-06 / Mastemon).
        visibleCards: security.map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
      });
      if (selectedIds.length === 0) {
        ctx.lastEffectActed = false;
        return false;
      }
      const played = await ctx.fx.playInstances(selectedIds, { payCost: action.then.payCost });
      ctx.lastPlayedPermanentIds = (played ?? []).map((permanent) => permanent.permanentId);
      ctx.lastEffectActed = ctx.lastPlayedPermanentIds.length > 0;
      return false;
    }
    case "Reveal": {
      await runReveal(ctx, action);
      return false;
    }
    case "RevealAdd": {
      await runRevealAdd(ctx, action);
      return false;
    }
    case "RevealChooseDeleteBudget": {
      await runRevealChooseDeleteBudget(ctx, action);
      return false;
    }
    case "AddToHandSelf": {
      // "Add this card to its owner's hand" — the card is a security card.
      await ctx.fx.returnToHand([ctx.source.instanceId]);
      return false;
    }
    case "PlaceInBattleAreaSelf": {
      // "Place this card in the battle area" — self-placement of the resolving card.
      // An Option (the ＜Delay＞ "Then, place this card in the battle area" tail and
      // the matching [Security] effect) becomes an option PERMANENT (source
      // the effect runtime.PlaceDelayOptionCards), located wherever it currently sits
      // (trash mid-[Main] resolution, security mid-check). A Digimon/Tamer self-place
      // only occurs from a [Security] effect, so it plays out of security (free).
      // Kind routing is a static card fact: prefer the shared card table (the
      // context's source definition may be a test fixture), falling back for
      // synthetic ids.
      if (action.target !== undefined) {
        const zones = action.target.from ?? action.target.source ?? action.target.zone ?? "hand";
        const zoneList = (Array.isArray(zones) ? zones : [zones]) as ZoneRef[];
        const candidates = candidateLooseInstances(ctx, action.target, zoneList);
        const visible = seatsForController(ctx, action.target.filter)
          .flatMap((seat) => zoneList.flatMap((zone) => looseCardsInZone(ctx, seat, zone)))
          .map((candidate) => candidate.instanceId);
        const chosen = await pickLoose(ctx, action.target, candidates, undefined, ctx.ask, visible);
        for (const instanceId of chosen) await ctx.fx.placeOptionAsPermanent?.(instanceId);
        ctx.lastEffectActed = chosen.length > 0;
        return false;
      }
      const selfKinds = getCardDefinition(ctx.source.cardId)?.kinds ?? ctx.source.definition.kinds;
      if (selfKinds.includes(CardKind.Option)) {
        await ctx.fx.placeOptionAsPermanent?.(ctx.source.instanceId);
      } else {
        if (ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, ctx.source.cardId, "play") === true) {
          return false;
        }
        await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
      }
      return false;
    }
    case "Restrict": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      // Target-scoped prohibition (BT10-042): affected Digimon can't attack THIS source,
      // but may still attack the player or a different Digimon. A plain `attack`
      // restriction would incorrectly suppress the entire declaration.
      if ((action as typeof action & { specificTarget?: string }).specificTarget === "source") {
        const sourcePermanentId = ctx.source.permanent()?.permanentId;
        if (sourcePermanentId !== undefined) {
          for (const id of ids) ctx.fx.restrictAttackTarget(id, sourcePermanentId, duration);
        }
        return false;
      }
      if ((action.restriction as string) === "attackOrBlock") {
        for (const id of ids) {
          ctx.fx.restrict(id, "attack", duration);
          ctx.fx.restrict(id, "block", duration);
        }
        return false;
      }
      const restriction = action.restriction as Restriction;
      // A deprecated kind has no consumer, so recording it would be a silent no-op. Drop it
      // here instead: `restrict()` no longer accepts one, and the ~32 IR records still
      // carrying `activateEffects` are superseded by the disableSecurityEffect /
      // disableTimingEffect verbs.
      if (restriction === "activateEffects") return false;
      const fromSourceKind = action.fromSourceKind as string[] | undefined;
      const byOpponentEffectsOnly = action.byOpponentEffectsOnly === true ? true : undefined;
      for (const id of ids) ctx.fx.restrict(id, restriction, duration, { fromSourceKind, byOpponentEffectsOnly });
      return false;
    }
    case "RestrictUnsuspendedDigivolve": {
      const seat = action.seat === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      ctx.fx.restrictUnsuspendedDigivolve(seat, ctx.source.ownerSeat, toDuration(action.duration));
      return false;
    }
    case "GrantCanAttackUnsuspended": {
      // "This Digimon may also attack your opponent's unsuspended Digimon" (ST12-08): a
      // positive attack-legality grant on the resolved target(s), read by combat legality.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      const noDigivolutionCards = action.noDigivolutionCards === true;
      for (const id of ids) ctx.fx.grantCanAttackUnsuspended(id, duration, { noDigivolutionCards });
      return false;
    }
    case "GrantVortexCanAttackPlayers": {
      // EX11-062 [Your Turn]: "while your opponent has no unsuspended Digimon, your ＜Vortex＞ can
      // also attack players" (KB Q5920). A positive ＜Vortex＞ attack-target grant on the resolved
      // target(s) (your Digimon), read by combat legality for a ＜Vortex＞-mode declaration. The
      // [Your Turn] condition (opponent has no unsuspended Digimon) is evaluated by the effect's
      // own condition gate; this records the grant when the effect fires.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.grantVortexCanAttackPlayers?.(id, duration);
      return false;
    }
    case "EndAttack": {
      // "End that attack" (BT23-069): terminate the in-flight attack (transition to
      // end-of-attack). A no-op when no attack is open; changes the timing, not the Digimon.
      ctx.fx.endAttack();
      return false;
    }
    case "ArmSuspendRestriction": {
      // BT23-024: arm the suspend-restriction-with-superlative-exception on THIS source for the
      // stated duration ("until their turn ends" => UntilOpponentTurnEnd). The affected opponent
      // set is recomputed each continuous pass by applySuspendRestrictionRecompute (KB Q5250/Q5252).
      const self = ctx.source.permanent();
      if (self !== undefined) {
        ctx.fx.armSuspendRestrictionSource?.(self.permanentId, toDuration(action.duration ?? "untilOpponentTurnEnd"));
      }
      return false;
    }
    case "RestrictDigivolveInto": {
      // EX10-035: "this Digimon can only digivolve into [Apocalymon]". Record a positive
      // digivolve-target constraint on the resolved target(s) carrying the allowed into-filter;
      // digivolve-legality (validateDigivolve) rejects any other evolving card onto them.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      const into = action.into;
      for (const id of ids) {
        ctx.fx.restrictDigivolveInto?.(id, (def) => definitionMatches(into, def), duration);
      }
      return false;
    }
    case "MinDpFloor": {
      // EX11-070 [All Turns]: "this Digimon can't have less than 1000 DP". A persistent floor on
      // the resolved target(s) (the inherited-effect host), applied in the DP-calc layer AFTER all
      // +/- changes (KB Q5941). Re-derived each continuous pass (CR-01).
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.minDpFloor?.(id, action.floor, duration);
      return false;
    }
    case "StackTrashLock": {
      // EX11-070 [All Turns]: "your opponent's effects can't trash this Digimon's stacked cards"
      // (KB Q5943). A persistent lock on the resolved target(s) (the inherited-effect host),
      // consulted at the digivolution-card trash sites. Re-derived each continuous pass (CR-01).
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.stackTrashLock?.(id, duration);
      return false;
    }
    case "SecurityAttackInvert": {
      // EX6-031 [Your Turn]: "Change ＜Security Attack -＞ to ＜Security Attack +＞ on all of your
      // Digimon" (KB Q3751/Q3752, per-instance sign flip). A persistent per-permanent inversion on
      // the resolved target(s); the security-check strike consumer (GameEngine.runSecurityCheck.
      // strikeFor) negates each existing SA grant's amount while active. Re-derived each continuous
      // pass (CR-01).
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.securityAttackInvert?.(id, duration);
      return false;
    }
    case "DelayedDeletePlayed": {
      // EX10-035: "at turn end, delete the Digimon this effect played." The played permanent is
      // deletes it at the owner's turn end, expiring at that same boundary.
      const playedIds = ctx.lastPlayedPermanentIds ?? [];
      if (playedIds.length > 0) {
        for (const permanentId of playedIds) ctx.fx.delayedDeletePlayed?.(permanentId);
      } else {
        const self = ctx.source.permanent();
        if (self !== undefined) ctx.fx.delayedDeletePlayed?.(self.permanentId);
      }
      return false;
    }
    case "DelayedDelete": {
      // "At the next end of your opponent's turn, delete it" after a PlayWithoutCost branch.
      // The target is the permanent(s) just created by the prior play action in this same
      // effect resolution, not the card currently resolving the effect.
      for (const permanentId of ctx.lastPlayedPermanentIds ?? []) {
        ctx.fx.delayedDeletePlayed?.(permanentId);
      }
      return false;
    }
    case "DisableSecurityEffect": {
      // `card.PermanentOfThisCard()`. Resolve the target (normally the source itself) and
      // record the security-effect disable; the security-check loop consults it per flip.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.disableSecurityEffect(id, action.sourceKind, duration);
      return false;
    }
    case "DisableTimingEffect": {
      // The disable suppresses the masked timing effects of the resolved (opponent) permanents.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.disableTimingEffect(id, action.timings, duration);
      return false;
    }
    case "Aura": {
      // A "while ..." aura: live exactly while its gate holds. The static-effect
      // builder re-runs this resolve each evaluation, so re-checking the gate here
      // condition gives (it lapses the moment the gate fails). The battle-area guard
      // is implicit (no source permanent => no candidates).
      if (!evaluateCondition(ctx, action.while)) return false;
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = EffectDuration.UntilEachTurnEnd;
      for (const id of ids) {
        switch (action.effect.kind) {
          case "keyword": {
            const kw = action.effect.keyword.keyword;
            const amount =
              action.effect.keyword.amount === undefined
                ? undefined
                : action.effect.keyword.amount * (action.scaling === undefined ? 1 : scaleFactor(ctx, action.scaling));
            if (kw === "Piercing") ctx.fx.grantPierce(id, duration, { continuous: true });
            else if (kw === "LinkMax") {
              ctx.fx.grantLinkMax(id, amount ?? 1, duration, { continuous: true });
            } else {
              ctx.fx.grantKeyword(id, kw, duration, amount, {
                continuous: true,
                sourceCardId: ctx.source.cardId,
                sourceEffectText: ctx.activeEffectText,
              });
            }
            break;
          }
          case "modifyDP":
            ctx.fx.modifyDP(id, action.effect.amount, duration, { continuous: true });
            break;
          case "modifySecurityDP":
            // Security DP is seat-scoped rather than permanent-scoped. Aura target resolution
            // supplies one live host id; apply the seat delta once, not once per board Digimon.
            ctx.fx.modifySecurityDp(
              action.effect.seat === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat,
              action.effect.amount,
              { continuous: true },
            );
            return false;
          case "securityAttack":
            ctx.fx.grantKeyword(id, "SecurityAttack", duration, action.effect.amount, { continuous: true });
            break;
          case "restriction": {
            // Same drop as the `Restrict` action: a deprecated kind has no consumer, so
            // recording it would be a silent no-op rather than a grant.
            const granted = action.effect.restriction as Restriction;
            if (granted !== "activateEffects") {
              ctx.fx.restrict(id, granted, duration, { continuous: true });
            }
            break;
          }
          default:
            break;
        }
      }
      return false;
    }
    case "GrantAuraToOpponents": {
      // Q1f: most corpus instances of this action kind carry no `event`/`actions` at all —
      // only `target` + `effectText` naming the printed granted ability verbatim (a compiler
      // shell for "X gains '[Trigger] Body'" that never finished compiling the body). Iterating
      // `action.actions` for one of these would throw the moment the watched event fires. Route
      // any instance whose `effectText` names a registered library effect through the SAME
      // "grant a named library effect" mechanism GrantStatic's `grant:"effects"` branch uses
      // (`grantCustomEffect` + `GRANTED_EFFECT_LIBRARY`), instead of installing a raw SubTrigger
      // watcher with undefined actions. Instances naming an UNREGISTERED effectText fall through
      // to the pre-existing behavior below unchanged (still a Q1f gap, not made worse here).
      if (
        action.actions === undefined &&
        typeof action.effectText === "string" &&
        action.effectText in GRANTED_EFFECT_LIBRARY
      ) {
        const ids = await resolvePermanentTargets(
          ctx,
          action.target ??
            ({ filter: action.filter ?? { kind: ["Digimon"], controller: "opponent" }, count: "all" } as Target),
        );
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) {
          const permanent = ctx.game.permanentById(id);
          const top = permanent?.topCard;
          if (top === undefined) continue;
          ctx.fx.grantCustomEffect?.(top.instanceId, top.ownerSeat, action.effectText, grantDuration);
        }
        return false;
      }
      // P-075: grant a debuff aura (SubTrigger watcher) to all opponent Digimon.
      // Resolve opponent permanents, install a watcher on each that fires on `action.event`
      // and runs `action.actions`. The scope is ALWAYS the opponent (the action name): force
      // controller:"opponent" onto the filter so a filter that omits it (P-075's IR carries only
      // `{kind:["Digimon"]}`) does not leak the aura onto the controller's own Digimon.
      const candidates = candidatePermanents(ctx, {
        filter: { ...(action.filter ?? { kind: ["Digimon"] }), controller: "opponent" },
        count: "all",
      } as Target);
      const duration = toDuration(action.duration);
      for (const permanent of candidates) {
        // Anchor the watcher to its OWN permanent: `fireSubTrigger(event)` runs every watcher of
        // that event (it passes no sourcePermanentId), so without this gate one Digimon suspending
        // would fire EVERY granted watcher. The body's "this Digimon" semantics require the event
        // subject to BE the watched permanent.
        const anchorId = permanent.permanentId;
        ctx.fx.subscribeSubTrigger({
          event: SUBTRIGGER_EVENT_MAP[action.event] ?? "whenSuspended",
          sourcePermanentId: anchorId,
          once: false,
          description: `GrantAura from ${ctx.source.cardId}`,
          expiresOnTurnEndOf:
            duration === EffectDuration.UntilOpponentTurnEnd
              ? ctx.game.opponentOf(ctx.source.ownerSeat)
              : duration === EffectDuration.UntilOwnerTurnEnd
                ? ctx.source.ownerSeat
                : undefined,
          matches: (subCtx) => {
            // Gate to "this Digimon": fire only when the granted permanent IS the event subject.
            // Lenient by design — when the fired event carries no permanent subject we preserve
            // firing (the prior behavior), so this narrows the over-fire (P-075: one suspend fired
            // every watcher) without silencing granted auras on subject-less events.
            const t = subCtx.trigger;
            const subjectId =
              t.subjectPermanentId ??
              t.suspendedPermanentId ??
              t.unsuspendedPermanentId ??
              t.deletedPermanentId ??
              t.attackerPermanentId;
            return subjectId === undefined || subjectId === anchorId;
          },
          run: async (subCtx) => {
            for (const auraAction of action.actions) {
              await runAction(subCtx, auraAction as Action);
            }
          },
        });
      }
      return false;
    }
    case "DigiXrosMaterialZoneExpansion": {
      // BT19-079 / BT19-087: expand DigiXros material source zones at BeforePayCost.
      // Records per-seat zone expansion for `duration`; the DigiXros material-picking
      // code in the play-card path reads it. For v1 the record is the deliverable.
      const duration = toDuration(action.duration);
      ctx.fx.expandDigiXrosZones?.(ctx.source.ownerSeat, action.zones, duration);
      return false;
    }
    case "GrantStatic": {
      // Registration metadata consumed by the digivolve-cost path. Its live field/turn/OPT
      // gates are enforced when GameEngine selects an eligible redirector permanent.
      if (action.grant === "digisorptionRedirect") return false;
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration("permanent");
      // "nameForDigiXros" (BT19-038) and grant:"name" with digiXrosOnly:true (BT19-012,
      // BT19-051, BT19-061) both encode an alias valid ONLY in DigiXros material matching.
      if (action.grant === "nameForDigiXros" || (action.grant === "name" && action.digiXrosOnly)) {
        const tokens = action.tokens ?? [];
        if (tokens.length === 0) {
          unsupported(ctx, action, "GrantStatic nameForDigiXros with no tokens");
          return false;
        }
        for (const id of ids) ctx.fx.grantNameTrait(id, "name", tokens, duration, { digiXrosOnly: true });
        return false;
      }
      if (action.grant === "name" || action.grant === "trait") {
        const tokens = action.tokens ?? [];
        if (tokens.length === 0) {
          unsupported(ctx, action, "GrantStatic name/trait with no tokens");
          return false;
        }
        for (const id of ids) ctx.fx.grantNameTrait(id, action.grant, tokens, duration);
        return false;
      }
      if (action.grant === "color") {
        const colors = (action.tokens ?? []).filter((token): token is keyof typeof COLOR_MAP => token in COLOR_MAP);
        if (colors.length === 0) {
          unsupported(ctx, action, "GrantStatic color with no valid color token");
          return false;
        }
        const grantDuration = toDuration(action.duration ?? "forTheTurn");
        for (const id of ids) {
          for (const color of colors) ctx.fx.addColorGrant(id, COLOR_MAP[color], grantDuration);
        }
        return false;
      }
      if (action.grant === "kinds") {
        const wantedKinds = (action.tokens ?? []).map((t) => t as CardKind);
        if (wantedKinds.length === 0) {
          unsupported(ctx, action, "GrantStatic kinds with no tokens");
          return false;
        }
        // Unlike the name/trait grant above (which must survive turn boundaries per
        // WR-03/ENG-02), a "treated as a Digimon" kind grant is commonly scoped ("For the
        // turn, ..." — AD1-021, BT12-092, BT21-044) and must respect the IR's own duration
        // instead of the hardcoded `permanent` default the block computes above.
        const kindDuration = toDuration(action.duration ?? "permanent");
        for (const id of ids) ctx.fx.grantKind?.(id, wantedKinds, kindDuration);
        return false;
      }
      // path — "1 of your Digimon gains '[On Deletion] …' until the end of your opponent's
      // turn", RB1-030). Each token names a built-in effect the grant collector compiles to a
      // real Effect anchored on the granted permanent, so it fires through the SAME timing
      // window as a printed effect. This is duration-scoped (NOT permanent / NOT continuous):
      //
      // "effect"/"tokenEffect"/"quotedEffect"/"gainEffect" are the SAME grant under different
      // compiler-emitted labels (confirmed by shape: BT21-057's "tokenEffect" carries a
      // synthetic "GRANTEFFECT23TOKEN" key indistinguishable from an "effects" token; RB1-030's
      // "quotedEffect" carries the printed effect text verbatim as the token). Routing all four
      // through the same `grantCustomEffect` call wires a real consumer for every one of them —
      // `grantedTokenEffectsForTiming` already throws loudly for any token with no
      // `GRANTED_EFFECT_LIBRARY` entry, so an unregistered token now fails fast instead of
      // silently sitting inert in the old `grantCustom` bucket.
      if (
        (action.grant === "effects" ||
          action.grant === "effect" ||
          action.grant === "tokenEffect" ||
          action.grant === "quotedEffect" ||
          action.grant === "gainEffect") &&
        (action.tokens?.length ?? 0) > 0
      ) {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) {
          // Anchor the grant on the granted Digimon's TOP-CARD instance (persists into trash) and
          // the granter's seat (the duration-sweep frame), so a granted [On Deletion] fires on the
          // grantee's own deletion exactly like a printed one.
          const permanent = ctx.game.permanentById(id);
          const top = permanent?.topCard;
          if (top === undefined) continue;
          for (const token of action.tokens ?? []) {
            ctx.fx.grantCustomEffect?.(top.instanceId, top.ownerSeat, token, grantDuration);
          }
        }
        return false;
      }
      // "effects"/"kind" paired with a `staticEffect: { kind: "SetBaseDP" }` payload (BT12-092,
      // BT13-018): "1 of your [X] is also treated as an N DP Digimon" — a DP override, plus (for
      // grant:"kind") a kind grant so a Tamer becomes attack-legal as a Digimon. Both primitives
      // already exist; this just wires the compound grant to them instead of the dead store.
      if (
        (action.grant === "effects" || action.grant === "kind") &&
        typeof action.staticEffect === "object" &&
        action.staticEffect !== null &&
        (action.staticEffect as { kind?: string }).kind === "SetBaseDP"
      ) {
        const value = (action.staticEffect as { value?: number }).value;
        if (typeof value !== "number") {
          unsupported(ctx, action, "GrantStatic SetBaseDP staticEffect with no numeric value");
          return false;
        }
        const grantDuration = toDuration(action.duration ?? "forTheTurn");
        for (const id of ids) ctx.fx.setBaseDP(id, value, grantDuration);
        if (action.grant === "kind") {
          const wantedKinds = (action.tokens ?? []).map((t) => t as CardKind);
          if (wantedKinds.length > 0) {
            for (const id of ids) ctx.fx.grantKind?.(id, wantedKinds, grantDuration);
          }
        }
        return false;
      }
      // "effects" with a structured `filter` and no tokens: "gains all effects of cards with
      // [X] in its digivolution cards" (BT10-011, BT12-072, BT15-039, BT16-014, RB1-009, ...).
      // This is the SAME conferStackEffects consumer the bottom-of-case fallback below already
      // uses for an untagged grant — it was simply unreachable from here because the string
      // catch-all intercepted `grant === "effects"` first.
      if (action.grant === "effects" && action.filter) {
        for (const permanentId of ids) {
          const permanent = ctx.game.permanentById(permanentId);
          if (permanent === undefined) continue;
          for (const stackCard of permanent.stack) {
            const def = ctx.game.definitionOf(stackCard);
            if (!definitionMatches(action.filter, def as DefinitionFacts)) continue;
            ctx.fx.conferStackEffects(permanentId, stackCard.instanceId, duration);
          }
        }
        return false;
      }
      // Color-change grant: "change 1 of their Digimon or Tamers into a color other than white"
      // (BT18-078). The IR stores the choice domain as an object-shaped grant; resolve it into
      // the existing color-grant primitive instead of leaving it in the inert custom-grant bucket.
      if (typeof action.grant === "object" && action.grant !== null && "chooseColorOtherThan" in action.grant) {
        const grant = action.grant as { allowedColors?: string[]; chooseColorOtherThan?: string };
        const labels = (grant.allowedColors ?? ["Red", "Blue", "Yellow", "Green", "Black", "Purple"]).filter(
          (color): color is keyof typeof COLOR_MAP => color in COLOR_MAP,
        );
        if (labels.length === 0) {
          unsupported(ctx, action, "GrantStatic chooseColorOtherThan with no legal colors");
          return false;
        }
        const idx = await ctx.ask.chooseOption(ctx, labels);
        const chosen = COLOR_MAP[labels[idx] ?? labels[0]!];
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.addColorGrant(id, chosen, grantDuration);
        return false;
      }
      // The compiler's other encoding of the same "any color except X" choice (BT18-078):
      // { color: "otherThanWhite" } instead of { chooseColorOtherThan: "White" }. Same flow.
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        "color" in action.grant &&
        typeof (action.grant as { color?: unknown }).color === "string" &&
        (action.grant as { color: string }).color.startsWith("otherThan")
      ) {
        const excluded = (action.grant as { color: string }).color.slice("otherThan".length);
        const labels = (["Red", "Blue", "Yellow", "Green", "White", "Black", "Purple"] as const).filter(
          (color): color is keyof typeof COLOR_MAP => color !== excluded && color in COLOR_MAP,
        );
        if (labels.length === 0) {
          unsupported(ctx, action, "GrantStatic color otherThan with no legal colors");
          return false;
        }
        const idx = await ctx.ask.chooseOption(ctx, labels);
        const chosen = COLOR_MAP[labels[idx] ?? labels[0]!];
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.addColorGrant(id, chosen, grantDuration);
        return false;
      }
      // { kind: "PreventSecurityActivation", cardType: "Option" } (BT1-025, BT20-015, BT20-074):
      // "this Digimon doesn't activate [Security] skills on Option cards it checks" — the exact
      // semantics `disableSecurityEffect` already exists for (KB Q886: the card still trashes).
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        (action.grant as { kind?: string }).kind === "PreventSecurityActivation"
      ) {
        const cardType = (action.grant as { cardType?: string }).cardType;
        const sourceKind = cardType === "Option" ? "option" : "any";
        const grantDuration = toDuration(action.duration ?? "forTheTurn");
        for (const id of ids) ctx.fx.disableSecurityEffect(id, sourceKind, grantDuration);
        return false;
      }
      // { cannotBeDeletedInBattle: true } (P-098) maps directly onto the existing enforced
      // `beDeletedInBattle` restriction.
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        (action.grant as { cannotBeDeletedInBattle?: boolean }).cannotBeDeletedInBattle === true
      ) {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beDeletedInBattle", grantDuration);
        return false;
      }
      // { keyword: "Unblockable" } (EX4-042) — same semantics as the string "unblockable" case
      // below; both map onto the existing enforced `cantBeBlocked` restriction.
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        (action.grant as { keyword?: string }).keyword === "Unblockable"
      ) {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "cantBeBlocked", grantDuration);
        return false;
      }
      // { immunity: true } (BT17-016, EX7-034) / { immuneToOpponentEffects: true } (BT20-019):
      // blanket "isn't affected by your opponent's effects" — the same unqualified `beAffected`
      // restriction the dedicated `GrantImmunity` action installs (line ~4210 below).
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        ((action.grant as { immunity?: boolean }).immunity === true ||
          (action.grant as { immuneToOpponentEffects?: boolean }).immuneToOpponentEffects === true)
      ) {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beAffected", grantDuration);
        return false;
      }
      // { kind: "Protection", protections: [...] } (BT16-055, P-162, ST17-07) — a compound grant
      // decomposed into one `restrict()` call per named protection, each onto an ALREADY
      // enforced restriction kind. Unknown protection tokens fail loudly rather than being
      // silently dropped.
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        (action.grant as { kind?: string }).kind === "Protection"
      ) {
        const protections = (action.grant as { protections?: string[] }).protections ?? [];
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const token of protections) {
          const mapped = PROTECTION_TOKEN_MAP[token];
          if (mapped === undefined) {
            unsupported(ctx, action, `GrantStatic Protection with unknown protection "${token}"`);
            continue;
          }
          for (const id of ids) {
            ctx.fx.restrict(id, mapped.restriction, grantDuration, {
              byOpponentEffectsOnly: mapped.byOpponentEffectsOnly,
            });
          }
        }
        return false;
      }
      // { copyEffectsFromDigivolution: { filter: "<raw printed text>" } } (BT16-062, BT22-078,
      // EX10-059) — "gains all effects of digivolution cards matching [name]/[trait]/level N".
      // The compiler captured the raw clause text instead of a structured filter; parse the
      // common "[X] in ... names"/"[X] trait"/"level N" shapes it actually uses and route
      // through the SAME `conferStackEffects` consumer the structured-filter "effects" grant
      // above uses. Unparseable text still fails loudly rather than being silently dropped.
      if (typeof action.grant === "object" && action.grant !== null && "copyEffectsFromDigivolution" in action.grant) {
        const raw = (action.grant as { copyEffectsFromDigivolution?: { filter?: string } }).copyEffectsFromDigivolution
          ?.filter;
        const parsedFilter = typeof raw === "string" ? parseCopyEffectsFilterText(raw) : undefined;
        if (parsedFilter === undefined) {
          unsupported(ctx, action, `GrantStatic copyEffectsFromDigivolution with unparseable filter "${raw}"`);
          return false;
        }
        for (const permanentId of ids) {
          const permanent = ctx.game.permanentById(permanentId);
          if (permanent === undefined) continue;
          for (const stackCard of permanent.stack) {
            const def = ctx.game.definitionOf(stackCard);
            if (!definitionMatches(parsedFilter, def as DefinitionFacts)) continue;
            ctx.fx.conferStackEffects(permanentId, stackCard.instanceId, duration);
          }
        }
        return false;
      }
      // Object-shaped grants that genuinely have no enforcement path yet (would need a new
      // combat/DNA-digivolve/DigiXros subsystem, not just a missing primitive wire-up). Failing
      // loudly here — instead of the old silent `grantCustom` store — surfaces them the moment
      // a game actually resolves one, matching the fail-loud shape used across this case.
      if (typeof action.grant === "object" && action.grant !== null) {
        if ((action.grant as { kind?: string }).kind === "TreatAsLevel") {
          const grant = action.grant as { level?: number; context?: string; intoNames?: string[] };
          if (grant.context !== "DNADigivolution" || grant.level === undefined) {
            unsupported(ctx, action, "TreatAsLevel requires a DNA context and numeric level");
            return false;
          }
          for (const permanentId of ids) {
            ctx.fx.grantDnaLevel(permanentId, grant.level, {
              intoNames: grant.intoNames,
              continuous: true,
            });
          }
          return false;
        }
        const objectGrantKind =
          "kind" in action.grant ? String((action.grant as { kind: unknown }).kind) : JSON.stringify(action.grant);
        unsupported(ctx, action, `GrantStatic object grant "${objectGrantKind}" has no enforcement path yet`);
        return false;
      }
      // immuneToOpponentOptionEffects: the targeted Digimon is not affected by the opponent's
      // Option card effects for the duration. Stored as a beAffected restriction qualified to
      // Option-sourced effects; the target-resolution path excludes immune permanents when the
      // resolving card is an opponent's Option (CAP-A8, BT19-089).
      if (action.grant === "immuneToOpponentOptionEffects") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beAffected", grantDuration, { fromSourceKind: ["Option"] });
        return false;
      }
      // "isn't affected by the effects of your opponent's Digimon" (BT16-063). This is narrower
      // than blanket opponent-effect immunity; opponent Option/Tamer effects are still relevant.
      if (action.grant === "immuneToOpponentDigimonEffects") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beAffected", grantDuration, { fromSourceKind: ["Digimon"] });
        return false;
      }
      // "immuneToOpponentEffects" (BT20-019 stringly, LM-020) — blanket opponent-effect immunity.
      if (action.grant === "immuneToOpponentEffects") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beAffected", grantDuration);
        return false;
      }
      // "attackImmunity" (BT5-030, P-051): "This Digimon can't be attacked" — the already
      // enforced `cantBeAttacked` restriction.
      if (action.grant === "attackImmunity") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "cantBeAttacked", grantDuration);
        return false;
      }
      // "unblockable" (BT4-035, ST8-09): the already enforced `cantBeBlocked` restriction.
      if (action.grant === "unblockable") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "cantBeBlocked", grantDuration);
        return false;
      }
      // "dpReductionImmunity" (BT11-069): "can't have its DP reduced by your opponent's
      // effects" — dpImmune scoped to the opponent. An optional "DeDigivolveImmunity" token
      // layers on the (unscoped, per the printed "isn't affected by <De-Digivolve> effects")
      // cantBeDeDigivolved restriction, same as the equivalent Protection.protections entry.
      if (action.grant === "dpReductionImmunity") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "dpImmune", grantDuration, { byOpponentEffectsOnly: true });
        if ((action.tokens ?? []).includes("DeDigivolveImmunity")) {
          for (const id of ids) ctx.fx.restrict(id, "cantBeDeDigivolved", grantDuration);
        }
        return false;
      }
      // "immuneToOpponentDPReductionAndReturn" (BT10-068, BT22-059): "your opponent's effects
      // can't reduce this Digimon's DP or return it to hands or decks" — dpImmune + beReturned,
      // both scoped to the opponent.
      if (action.grant === "immuneToOpponentDPReductionAndReturn") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) {
          ctx.fx.restrict(id, "dpImmune", grantDuration, { byOpponentEffectsOnly: true });
          ctx.fx.restrict(id, "beReturned", grantDuration, { byOpponentEffectsOnly: true });
        }
        return false;
      }
      // "cantLeaveExceptByOwnerOrDeletion" (BT16-051): "can't leave the battle area other than
      // by deletion" — unscoped bounce protection, the already enforced `beReturned` restriction.
      if (action.grant === "cantLeaveExceptByOwnerOrDeletion") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beReturned", grantDuration);
        return false;
      }
      // "canBeAttackedWhileUnsuspended" (BT21-096) — the compiler's alternate label for the SAME
      // "may also attack unsuspended Digimon" grant the dedicated `GrantCanAttackUnsuspended`
      // action installs via `grantCanAttackUnsuspended`.
      if (action.grant === "canBeAttackedWhileUnsuspended") {
        const grantDuration = toDuration(action.duration ?? "forTheTurn");
        for (const id of ids) ctx.fx.grantCanAttackUnsuspended(id, grantDuration, {});
        return false;
      }
      // "addName" (P-072, P-073): "treat this card/Digimon as if its name is also [X]" — the
      // same alias mechanism the dedicated "name" grant above uses.
      if (action.grant === "addName") {
        const tokens = action.tokens ?? [];
        if (tokens.length === 0) {
          unsupported(ctx, action, "GrantStatic addName with no tokens");
          return false;
        }
        for (const id of ids) ctx.fx.grantNameTrait(id, "name", tokens, duration);
        return false;
      }
      // "noSecurityOptionEffects" (BT17-014, BT7-014, ST13-05): the printed [Security] text on
      // Option cards the source Digimon checks doesn't activate — the same WarGreymon-shaped
      // ability `disableSecurityEffect` was built for.
      if (action.grant === "noSecurityOptionEffects") {
        const grantDuration = toDuration(action.duration ?? "permanent");
        for (const id of ids) ctx.fx.disableSecurityEffect(id, "option", grantDuration);
        return false;
      }
      // "suppressOnPlayEffects" (BT10-083, EX5-060): "[On Play] effects on Digimon played by
      // this effect don't activate" — the target the compiler emits is `isSelfRef` (the SOURCE
      // card), but the ability's actual subject is the permanent the PRECEDING PlayWithoutCost
      // action just played (the DelayedDelete action a few cases up resolves the identical
      // "the permanent this effect just played" reference the same way).
      if (action.grant === "suppressOnPlayEffects") {
        const grantDuration = toDuration(action.duration ?? "permanent");
        for (const id of ctx.lastPlayedPermanentIds ?? []) {
          ctx.fx.disableTimingEffect(id, ["onPlay"], grantDuration);
        }
        return false;
      }
      if (action.grant === "hasAllDigivolutionColors") {
        const grantDuration = toDuration(action.duration ?? "permanent");
        for (const id of ids) {
          const permanent = ctx.game.permanentById(id);
          if (permanent === undefined) continue;
          const colors = new Set<CardColor>();
          for (const card of permanent.stack) {
            for (const color of ctx.game.definitionOf(card).colors) colors.add(color);
          }
          for (const color of colors) ctx.fx.addColorGrant(id, color, grantDuration);
        }
        return false;
      }
      // "protection" (BT24-055, EX7-041, ST13-14) — the string-grant sibling of the object-shaped
      // Protection above, using its own (opponent-scoped) token vocabulary.
      if (action.grant === "protection") {
        const tokens = action.tokens ?? [];
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const token of tokens) {
          const mapped = PROTECTION_STRING_TOKEN_MAP[token];
          if (mapped === undefined) {
            unsupported(ctx, action, `GrantStatic protection with unknown token "${token}"`);
            continue;
          }
          for (const id of ids) ctx.fx.restrict(id, mapped, grantDuration, { byOpponentEffectsOnly: true });
        }
        return false;
      }
      // String grants with no enforcement path yet (would need a new subsystem — DNA-digivolve
      // level overrides, attacking a Digimon directly, DigiXros-from-trash, an alternate-color
      // rules layer, etc.), not just a missing primitive wire-up. Failing loudly here — instead
      // of the old silent `grantCustom` store — surfaces them the moment a game actually
      // resolves one.
      if (typeof action.grant === "string") {
        unsupported(ctx, action, `GrantStatic string grant "${action.grant}" has no enforcement path yet`);
        return false;
      }
      // "gains all effects of cards with [X] in its/your digivolution cards" —
      // register stack-card effect conferrals on the continuous ledger (recomputed
      // each static pass; collected at every triggered timing).
      if (!action.filter) {
        unsupported(ctx, action, "GrantStatic effects with no source filter");
        return false;
      }
      for (const permanentId of ids) {
        const permanent = ctx.game.permanentById(permanentId);
        if (permanent === undefined) continue;
        for (const stackCard of permanent.stack) {
          const def = ctx.game.definitionOf(stackCard);
          if (!definitionMatches(action.filter, def as DefinitionFacts)) continue;
          ctx.fx.conferStackEffects(permanentId, stackCard.instanceId, duration);
        }
      }
      return false;
    }
    case "GrantImmunity": {
      // "not affected by opponent's effects while condition holds" (CAP-C-06, BT19-101).
      // Stored as an unconditional beAffected restriction; the condition gate on the
      // containing effect already prevents this from firing when the condition is false.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.restrict(id, "beAffected", duration);
      return false;
    }
    case "WaiveColorRequirement": {
      // Defaults to the source card (the common "use this card without meeting its
      // color requirements"). A filtered target (a referenced card) is rarer.
      const duration = toDuration("forTheTurn");
      if (action.target && !(action.target?.isSelf || action.target?.filter?.isSelfRef)) {
        unsupported(ctx, action, "WaiveColorRequirement on a non-self target needs a card selection");
        return false;
      }
      ctx.fx.waiveColorRequirement(ctx.source.instanceId, duration);
      return false;
    }
    case "ModifySecurityDP": {
      const delta = scale === undefined ? action.amount : action.amount * scale;
      const seat = action.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      ctx.fx.modifySecurityDp(seat, delta);
      return false;
    }
    case "DeletionMaxDpModifier": {
      // Producer side of the DP-deletion-maximum subsystem: record a continuous bonus the
      // Delete branch reads. Self-scoped to this source permanent, or owner-wide by seat.
      if (action.scope === "self") {
        const self = ctx.source.permanent();
        if (self !== undefined) ctx.fx.addDeletionMaxDp?.({ permanentId: self.permanentId }, action.amount);
      } else {
        ctx.fx.addDeletionMaxDp?.({ seat: ctx.source.ownerSeat }, action.amount);
      }
      return false;
    }
    case "CostModifier": {
      // Cost modification recorded in the cost-calculation layer (the play/digivolve cost
      // calc consults it). A scaled DELTA multiplies by the runtime count when known.
      // A SET mode records an absolute base cost (setFixed) computed BEFORE additive
      // deltas (KB BT7-040 Q1568): the SET value is the base, other reductions subtract
      // from it. The SET amount is the literal `amount` (e.g. P-116's 0) or the resolved
      // count when count-driven (BT7-040/BT7-100's security stack).
      const setMode = action.mode === "set";
      if (action.costType === "dpDeletion") {
        const amount =
          (scale === undefined ? action.amount : action.amount * scale) * (action.mode === "reduce" ? -1 : 1);
        const self = action.target?.isSelf || action.target?.filter?.isSelfRef ? ctx.source.permanent() : undefined;
        if (self !== undefined) {
          ctx.fx.addDeletionMaxDp?.({ permanentId: self.permanentId }, amount);
        } else {
          // EX2-010 Q3293 and EX2-011 Q3297: without a self target, the printed
          // maximum modifier applies to every DP-based deletion effect of the owner.
          ctx.fx.addDeletionMaxDp?.({ seat: ctx.source.ownerSeat }, amount);
        }
        return false;
      }
      const want = action.target;
      if (!want) {
        if (
          action.costType === "digivolve" &&
          action.mode === "reduce" &&
          action.duration === "nextDigivolveThisTurn" &&
          action.cost?.kind === "trash"
        ) {
          const ownerSeat = ctx.source.ownerSeat;
          ctx.fx.subscribeReplacement({
            event: "wouldDigivolve",
            mode: "reduceCost",
            amount: Math.abs(action.amount),
            controllerSeat: ownerSeat,
            activationContext: ctx,
            consumeOnActivate: true,
            expiresOnTurnEndOf: ownerSeat,
            description: action.raw ?? `Reduce the next digivolution cost by ${Math.abs(action.amount)}`,
            activate: async (runtimeCtx, target, _into, evolvingInstanceId) => {
              if (target.controllerSeat !== ownerSeat || target.inBreeding) return false;
              const colors = new Set(runtimeCtx.game.definitionOf(target.topCard).colors);
              const candidates = runtimeCtx.game.player(ownerSeat).hand.filter((card) => {
                if (card.instanceId === evolvingInstanceId) return false;
                const definition = runtimeCtx.game.definitionOf(card);
                return (
                  definition.kinds.includes(CardKind.Digimon) && definition.colors.some((color) => colors.has(color))
                );
              });
              if (candidates.length === 0) return false;
              if (!(await runtimeCtx.ask.optional(runtimeCtx, action.cost?.raw ?? "Pay the reduction cost?")))
                return false;
              const chosen = await runtimeCtx.ask.selectCards(runtimeCtx, {
                candidates: candidates.map((card) => card.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length !== 1) return false;
              const trashed = await runtimeCtx.fx.trash(chosen, { byEffectSeat: ownerSeat });
              return trashed.length === 1;
            },
          });
        }
        return false;
      }
      const filter = want.filter ?? {};
      let delta = action.amount;
      if (setMode) {
        delta = scale !== undefined ? scale : action.amount;
      } else if (action.scaled && action.scaling === undefined) {
        const countFilter = { ...filter, controller: filter.controller ?? "mine" };
        delta = action.amount * countMatching(ctx, countFilter);
      } else if (scale !== undefined) {
        delta = action.amount * scale;
      }
      if (!setMode && action.mode === "reduce") {
        delta = -Math.abs(delta);
      }
      const modifierOpts:
        | {
            setFixed?: boolean;
            once?: boolean;
            onConsume?: (match: { target: Permanent; into?: CardDefinition }) => void;
          }
        | undefined =
        setMode || action.once === true || action.onConsume !== undefined || action.restriction === "suspendThisTamer"
          ? {
              ...(setMode ? { setFixed: true } : {}),
              ...(action.once === true || action.restriction === "suspendThisTamer" ? { once: true } : {}),
            }
          : undefined;
      const selfRef = want.isSelf || filter.isSelfRef;
      // A hand-resident digivolve-cost static (BT7-040) installs ONLY while its source
      // `card.Owner.HandCards.Contains(card)`) — the candidate sweep also visits trash
      // and face-up security, which must not arm the SET.
      if (action.handResident === true) {
        const inHand = ctx.game.player(ctx.source.ownerSeat).hand.some((c) => c.instanceId === ctx.source.instanceId);
        if (!inHand) return false;
      }
      if (action.costType === "digivolve") {
        // Digivolve-cost form: the predicate matches the base battle-area permanent being
        // digivolved, plus (when known) the card being digivolved INTO (`m.into`). The
        // digivolve flow reads it via changeEvoCost at cost-query time.
        //
        // A `selfRef` target has two distinct shapes, distinguished by where the source
        // currently lives:
        //   - HAND-RESIDENT (BT7-040 "when digivolving INTO this card from your hand"):
        //     the source is the digivolution TARGET sitting in hand, so it has no
        //     permanent. Match the digivolve whose `into` card IS this source card.
        //   - ON-FIELD self (a permanent's own "reduce my digivolve cost"): match the
        //     permanent that contains this source.
        const selfCardId = ctx.source.cardId;
        const predicate = (m: { target: Permanent; into?: CardDefinition }): boolean => {
          if (action.restriction === "suspendThisTamer") {
            const tamer = ctx.source.permanent();
            if (tamer === undefined || tamer.isSuspended || tamer.inBreeding) return false;
          }
          if (selfRef) {
            const self = ctx.source.permanent();
            if (self === undefined) {
              // Hand-resident target: the digivolve must be INTO this card AND driven by
              // the owner's own digivolve onto a permanent the owner controls (documented behavior
              // battle area). Requiring a known, matching `into` removes the latent
              // over-match where an unknown `into` clobbered unrelated digivolves; the live
              // digivolve site always supplies `into`. Without the owner-seat gate, one
              // player's installed hand-resident SET cost would corrupt the OTHER player's
              // digivolve into the same card id (CR-01).
              if (m.into === undefined || m.into.cardId !== selfCardId) return false;
              if (m.target.controllerSeat !== ctx.source.ownerSeat) return false;
              // Some hand-resident reducers constrain the BASE as well as the destination.
              // BT3-031, for example, reduces only when the Digimon being evolved is
              // Paildramon/Dinobeemon. Its sourceFilter also gates effect installation, but
              // that broad board-presence check alone would incorrectly let an unrelated
              // level 5 receive the discount while a matching Digimon sat beside it.
              if (
                action.sourceFilter !== undefined &&
                !permanentMatchesFilter(ctx, m.target, action.sourceFilter, ctx.source)
              ) {
                return false;
              }
              return true;
            }
            if (self.permanentId !== m.target.permanentId) return false;
            if (action.into !== undefined) {
              if (m.into === undefined) return false;
              if (!definitionMatches(action.into, m.into as unknown as DefinitionFacts)) return false;
            }
            return true;
          }
          // `action.into` scopes the reduction to only those digivolves whose destination card
          // (the card being digivolved into, still in hand) matches the filter (CAP-C-10,
          // BT2-088: "when digivolving a battle-area Digimon INTO a Tyrannomon-named card").
          // When `m.into` is absent (cost query without a known destination), conservatively
          // decline the reduction — the live digivolve site always supplies it.
          if (action.into !== undefined) {
            if (m.into === undefined) return false;
            if (!definitionMatches(action.into, m.into as unknown as DefinitionFacts)) return false;
          }
          return permanentMatchesFilter(ctx, m.target, filter, ctx.source);
        };
        if (modifierOpts !== undefined && action.restriction === "suspendThisTamer") {
          modifierOpts.onConsume = () => {
            const tamer = ctx.source.permanent();
            if (tamer !== undefined) ctx.fx.payActivationCost?.(tamer.permanentId, "suspend");
          };
        }
        if (modifierOpts !== undefined && action.onConsume !== undefined) {
          modifierOpts.onConsume = (match) => {
            const bindAs = action.consumeBindAs ?? "consumedCostTarget";
            ctx.fx.subscribeSubTrigger({
              event: "endOfTurn",
              sourcePermanentId: match.target.permanentId,
              once: true,
              description: action.raw ?? "cost modifier consumed",
              run: async (subCtx) => {
                const selections = new Map(subCtx.selections ?? []);
                selections.set(bindAs, match.target.permanentId);
                const runCtx: EffectContext = { ...subCtx, selections };
                for (const a of action.onConsume ?? []) {
                  const abort = await runAction(runCtx, a);
                  if (abort) break;
                }
              },
            });
          };
        }
        ctx.fx.changeEvoCost(predicate, delta, modifierOpts);
        return false;
      }
      // Play/use-cost form ("reduce the play cost of your Digimon by N", "increase the
      // cost of your opponent's next Digimon by N"): the predicate matches card
      // DEFINITIONS (and the paying seat) rather than a board permanent, since the
      // affected card is still in hand when its cost is computed. The self form (this
      // card's own play/use cost) matches this source instance's card id for its owner.
      const seatsScope = seatsForController(ctx, filter);
      const selfCardId = ctx.source.cardId;
      const predicate = (facts: { def: CardDefinition; controllerSeat: Seat }): boolean => {
        if (!seatsScope.includes(facts.controllerSeat)) return false;
        if (selfRef) {
          return facts.controllerSeat === ctx.source.ownerSeat && facts.def.cardId === selfCardId;
        }
        return definitionMatches(filter, facts.def as unknown as DefinitionFacts);
      };
      ctx.fx.changePlayCost(predicate, delta, setMode ? { setFixed: true } : undefined);
      return false;
    }
    case "SecurityManipulation": {
      await runSecurityManipulation(ctx, action);
      return false;
    }
    case "RecoverByTrashingMostSecurity": {
      await runRecoverByTrashingMostSecurity(ctx, action);
      return false;
    }
    case "trashSecurityTop": {
      // "Trash the top N card(s) of <controller>'s security stack" as a standalone action
      // (not a cost). Used inside SubTrigger.actions to trash the opponent's top security
      // as part of a triggered effect body (CAP-E15, BT21-052 Examon X Antibody).
      const mine = ctx.source.ownerSeat;
      const opp = ctx.game.opponentOf(mine);
      const seat = action.controller === "opponent" ? opp : mine;
      const count = action.count ?? 1;
      if (ctx.game.player(seat).security.length > 0) {
        await ctx.fx.trashFromSecurity(seat, count, { fromTop: true });
      }
      return false;
    }
    case "PlayToken": {
      // Accept both the `tokens[]`/`count` and the singular `token`/`amount` field conventions —
      // a card written with the singular form was otherwise silently inert (EX11-012, BT21-029).
      const tokenNames = action.tokens ?? (action.token !== undefined ? [action.token] : []);
      const rawCount = action.count ?? action.amount ?? 1;
      const count = scale === undefined ? rawCount : rawCount * scale;
      // `placedAs: "opponentDigimon"` places the token under the OPPONENT's control even though this
      // effect's controller activates it (KB Q5800). Otherwise it enters under the source's seat.
      const placementSeat =
        action.placedAs === "opponentDigimon" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      for (let i = 0; i < count; i++) {
        for (const tokenName of tokenNames) {
          await ctx.fx.playToken(placementSeat, tokenName, {
            payCost: action.payCost ?? false,
            suspended: action.suspended ?? false,
          });
        }
      }
      return false;
    }
    case "Modal": {
      await runModal(ctx, action);
      return false;
    }
    case "ConditionalBranch": {
      const branch = evaluateCondition(ctx, action.condition) ? action.ifTrue : (action.ifFalse ?? []);
      for (const nested of branch) {
        const abort = await runAction(ctx, nested);
        if (abort) break;
      }
      return false;
    }
    case "DelayedEffect": {
      const self = ctx.source.permanent();
      if (self === undefined) return false;
      ctx.fx.subscribeSubTrigger({
        event: "endOfTurn",
        sourcePermanentId: self.permanentId,
        once: true,
        expiresOnTurnEndOf: ctx.game.opponentOf(ctx.source.ownerSeat),
        matches: (subCtx) => !subCtx.source.isOwnersTurn(),
        description: action.raw ?? "DelayedEffect(nextEndOfOpponentTurn)",
        run: async (subCtx) => {
          await runAction(subCtx, action.effect);
        },
      });
      return false;
    }
    case "SubTrigger": {
      await runSubTrigger(ctx, action);
      return false;
    }
    case "Replacement": {
      await runReplacement(ctx, action);
      return false;
    }
    case "Prevent": {
      await runPrevent(ctx, action);
      return false;
    }
    case "RedirectAttack": {
      // "Change the target of the attack to 1 of your Digimon": resolve the candidate
      // permanents from the filter and let the CHOOSER pick which becomes the new attack
      // target. `chooser` defaults to "controller" (the source's controller); BT4-075 sets
      // "opponent" so the DEFENDING player chooses among their own unsuspended Digimon, and
      // `optional` lets them decline. A no-op when no attack is open (combat guards it).
      if (action.chooser === "opponent") {
        // The DEFENDING player picks among THEIR OWN matching Digimon — enumerate the
        // candidates (scoped to the opponent/defender seat; the recognizer may strip the
        // controller predicate when the activation gate already credits it) without prompting
        // the controller; the primitive prompts the opponent. Optional => may decline.
        const candidateSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
        const scopedTarget = { ...action.target, filter: { ...action.target.filter, controller: "opponent" as const } };
        const ids = candidatePermanents(ctx, scopedTarget).map((p) => p.permanentId);
        await ctx.fx.redirectAttack(ids, { chooserSeat: candidateSeat, optional: action.optional ?? false });
        return false;
      }
      const ids = await resolvePermanentTargets(ctx, action.target);
      await ctx.fx.redirectAttack(ids, { optional: action.optional ?? false });
      return false;
    }
    case "SelectBind": {
      // Resolve the binding target and record the chosen permanentId under its handle for a
      // later action's relativeTo / fromSelectionRef / underSelectionRef to reference. No other
      // effect. When nothing is chosen the handle stays unset and dependents resolve to nothing.
      const name = action.target.bindAs;
      if (name === undefined) return false;
      const target = action.chooser === undefined ? action.target : { ...action.target, chooser: action.chooser };
      const ids = await resolvePermanentTargets(ctx, target);
      if (ids.length > 0 && ctx.selections) ctx.selections.set(name, ids[0]!);
      return false;
    }
    case "DeDigivolve": {
      // Dynamic amount: "＜De-Digivolve 1＞ for each of this Digimon's face-down digivolution
      // cards" (EX9-043). placeUnder marks effect-placed cards face-down, so the count is the
      // source permanent's face-down stack cards at resolution time.
      const amount =
        typeof action.amount === "number"
          ? action.amount
          : (ctx.source.permanent()?.stack.filter((c) => !c.faceUp).length ?? 0);
      // A scaling on DeDigivolve is a repetition count, not one larger peel. BT21-061 Q4568:
      // four Tamer colors perform De-Digivolve 1 twice, with state checked between peels.
      const repeat = scale ?? 1;
      for (let i = 0; i < repeat; i++) {
        const ids = await resolvePermanentTargets(ctx, action.target);
        // The trashing effect's seat gates EX11-070's stacked-trash-lock (KB Q5943).
        for (const id of ids)
          ctx.fx.deDigivolve(id, amount, { byEffectSeat: ctx.source.ownerSeat, stopAtLevel: action.stopAtLevel });
      }
      return false;
    }
    case "Digivolve": {
      // A Static Tamer-onto declaration is legality metadata, not an effect-driven
      // digivolution to execute. Historical IR spells it as target+asIf; current IR uses
      // onto+asLevel. Both intentionally omit `into` because the evolving card is THIS card
      // in the player's hand. Recomputing static effects must therefore leave it inert.
      const metadata = action as typeof action & {
        onto?: unknown;
        asLevel?: number;
        asIf?: { level?: number };
      };
      if (
        action.into === undefined &&
        (metadata.onto !== undefined || metadata.asLevel !== undefined || metadata.asIf !== undefined)
      ) {
        return false;
      }
      await runDigivolve(ctx, action);
      return false;
    }
    case "DnaDigivolve": {
      await runDnaDigivolve(ctx, action);
      return false;
    }
    case "PlayPerLevel": {
      await runPlayPerLevel(ctx, action);
      return false;
    }
    case "AppFuse": {
      await runAppFuse(ctx, action);
      return false;
    }
    case "PlaceUnder": {
      await runPlaceUnder(ctx, action);
      return false;
    }
    case "TrashDigivolution": {
      const completed = await runTrashDigivolution(ctx, {
        ...action,
        amount: action.amount === "all" ? "all" : (action.amount ?? 1) * (scale ?? 1),
      });
      return action.optional === true && action.abortOnDecline === true && !completed;
    }
    case "Link": {
      await runLink(ctx, action);
      return false;
    }
    case "GrantLinkCostReduction": {
      // Install a recipient-scoped continuous link-cost reduction (documented behavior rule implementation,
      // documented behavior). The recipient defaults to the source permanent ("to this Digimon");
      // when an explicit target is given it resolves to the chosen friendly Digimon. runLink reads
      // the recipient's grant when a `whenLinkingTrait` card would link to it.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.grantLinkCostReduction(id, action.amount, action.whenLinkingTrait, duration);
      return false;
    }
    case "CannotIgnoreDigivolutionRequirements": {
      // Seat-level "players can't ignore digivolution requirements" (documented behavior
      // rule implementation, documented behavior). Affects BOTH seats (KB Q1738). The
      // normal digivolve color-waiver and effect-driven ignore-requirements paths both consult
      // this flag (KB Q1741-Q1742).
      const duration = toDuration(action.duration);
      ctx.fx.cannotIgnoreDigivolution(0, duration);
      ctx.fx.cannotIgnoreDigivolution(1, duration);
      return false;
    }
    case "MindLink": {
      await runMindLink(ctx, action);
      return false;
    }
    case "ActivateMain": {
      // Some IR records carry declarative metadata for custom turn-end rules under the
      // legacy ActivateMain shape so older audit tooling can see a non-empty action.
      // This is not the security "activate this card's [Main] effect" operation, so it
      // must not call runActivateMain or emit a loud missing-[Main] gap.
      if ((action as any).turnEndCondition !== undefined) return false;
      await runActivateMain(ctx);
      return false;
    }
    case "ActivateOptionMain": {
      const count = Math.max(1, action.count ?? 1);
      for (let i = 0; i < count; i++) await runActivateMain(ctx);
      return false;
    }
    case "Attack": {
      // "This Digimon attacks" (self) or "1 of your Digimon attacks" (targeted): make
      // the resolved permanent(s) declare an attack. The controller chooses each
      // attack's target (player / suspended enemy Digimon) inside the combat verb.
      // `withoutSuspending` declares the attack without tapping the attacker.
      const attackSubject = action.attacker ?? action.subject ?? action.target;
      if (attackSubject === undefined) return false;
      let suspensionTriggersFired = false;
      const fireDeferredSuspensionTriggers = async (): Promise<void> => {
        if (suspensionTriggersFired || deferredCostSuspensions.length === 0) return;
        suspensionTriggersFired = true;
        await ctx.fx.fireSuspensionTriggers?.(deferredCostSuspensions, { byEffectSeat: ctx.source.ownerSeat });
      };
      if (action.drainTimingWindowDuringAttack && ctx.fx.isAttackResolving?.()) {
        await fireDeferredSuspensionTriggers();
        return false;
      }
      const opts = {
        withoutSuspending: action.withoutSuspending ?? false,
        attackPlayer: action.attackPlayer,
        afterAttackTriggers: fireDeferredSuspensionTriggers,
        drainTimingWindow: action.drainTimingWindowDuringAttack ? ctx.drainCurrentTimingWindow : undefined,
      };
      if (attackSubject.isSelf || attackSubject.filter?.isSelfRef) {
        const self = ctx.source.permanent();
        if (self !== undefined) await ctx.fx.forceAttack(self.permanentId, opts);
        await fireDeferredSuspensionTriggers();
        return false;
      }
      const ids = await resolvePermanentTargets(ctx, attackSubject);
      for (const id of ids) await ctx.fx.forceAttack(id, opts);
      await fireDeferredSuspensionTriggers();
      return false;
    }
    case "Battle": {
      // Direct battle ("1 of your Digimon may battle 1 of your opponent's Digimon"): resolve
      // an attacker (self or chosen) and a defender (chosen opponent Digimon), then run a §14
      // DP battle. Optional => the controller may decline either pick.
      let attackerId: string | undefined;
      if (action.attacker.isSelf || action.attacker.filter.isSelfRef) {
        attackerId = ctx.source.permanent()?.permanentId;
      } else {
        attackerId = (await resolvePermanentTargets(ctx, action.attacker))[0];
      }
      if (attackerId === undefined) return false;
      // The compiler emits the defender as either `defender` or the alternative `target`
      // (BattleAction allows both); honor whichever is present.
      const defenderTarget = action.defender ?? action.target;
      if (defenderTarget === undefined) return false;
      const defenderId = (await resolvePermanentTargets(ctx, defenderTarget))[0];
      if (defenderId === undefined) return false;
      await ctx.fx.forceBattle?.(attackerId, defenderId);
      return false;
    }
    case "RestrictMemoryGain": {
      const seats = seatsForController(ctx, { controller: action.seat });
      const duration = toDuration(action.duration);
      for (const seat of seats) ctx.fx.restrictMemoryGain(seat, duration);
      return false;
    }
    case "RestrictCostReduction": {
      const seats = seatsForController(ctx, { controller: action.seat });
      const duration = toDuration(action.duration);
      for (const seat of seats) ctx.fx.restrictCostReduction(seat, action.costType, duration);
      return false;
    }
    case "RestrictPlay": {
      // Seat-level "can't play/move <X>" prohibition. The restricted seat is the source's
      // opponent (action.seat === "opponent"); resolve it via the same seat-scoping helper.
      // The IR Filter narrows to a serializable PlayMatch (kind + DP cap) — the only forms the
      // source CardCondition uses (IsOption / IsDigimon + CardDP <= N).
      const seats = seatsForController(ctx, { controller: action.seat });
      const duration = toDuration(action.duration);
      const match = {
        ...(action.filter.kind ? { kinds: action.filter.kind } : {}),
        ...(action.filter.dpAtMost !== undefined ? { dpAtMost: action.filter.dpAtMost } : {}),
      };
      for (const seat of seats)
        ctx.fx.restrictPlay(seat, ctx.source.ownerSeat, match, action.mode, duration, action.byEffectOnly);
      return false;
    }
    case "GlobalRestrict": {
      if (action.restriction === "opponentCannotAddToSecurity") {
        ctx.fx.restrictSecurityAddsFromEffect?.(
          ctx.game.opponentOf(ctx.source.ownerSeat),
          ctx.source.ownerSeat,
          toDuration(action.duration),
        );
      }
      return false;
    }
    case "WinGame": {
      const winner = action.winner === "controller" ? ctx.source.ownerSeat : ctx.game.opponentOf(ctx.source.ownerSeat);
      ctx.fx.declareWinner(winner);
      return false;
    }
    case "ReactivateEffect": {
      const compiled = runtimeCompiledCard(ctx.source.cardId);
      if (!compiled) return false;
      const factor = action.scaling ? scaleFactor(ctx, action.scaling) : 1;
      const reps = action.count * factor;
      const toRun = compiled.effects.filter((e) => e.trigger === action.fromTrigger).slice(0, action.count);
      for (let i = 0; i < reps; i++) {
        for (const eff of toRun) await runEffect(ctx, eff);
      }
      return false;
    }
    case "ActivateForeignEffect":
      await runActivateForeignEffect(ctx, action);
      return false;
    case "ActivateEffect":
      await runActivateEffect(ctx, action);
      return false;
    case "UseOptionWithoutCost":
      await runUseOptionWithoutCost(ctx, action);
      return false;
    case "RawUnparsed":
      unsupported(ctx, action, `unparsed clause: "${action.text}"`);
      return false;
    case "AllowDigiXrosMaterialsFromTrash":
      // Declarative marker consumed statically by the DigiXros validator — no runtime action.
      return false;
    case "GainTriggeredEffect": {
      await runGainTriggeredEffect(ctx, action);
      return false;
    }
    default: {
      // The TypeScript union is exhaustive, but effects.json is data. If a catalog
      // action kind is missing from the Action union, JSON loading can still route it
      // here at runtime. Keep that gap loud instead of silently no-oping.
      unsupported(ctx, action as Action, `unknown action kind "${String((action as { kind?: unknown }).kind)}"`);
      return false;
    }
  }
}

const SUBTRIGGER_EVENT_MAP: Record<string, SubTriggerEventName | undefined> = {
  whenAttacking: "whenAttacking",
  whenOpponentAttacks: "whenOpponentAttacks",
  whenBlocked: "whenBlocked",
  whenBlockerActivated: "whenBlockerActivated",
  // Fired when an in-flight attack's target is redirected (＜Raid＞ / RedirectAttack).
  // The attacker is the event subject; a watcher gates on it via sourceFilter isSelfRef.
  whenAttackTargetSwitched: "whenAttackTargetSwitched",
  whenAttackTargetChanged: "whenAttackTargetSwitched",
  whenAttackTargetChanges: "whenAttackTargetSwitched",
  whenAttackTargetsChange: "whenAttackTargetSwitched",
  whenAttackTargetSwitch: "whenAttackTargetSwitched",
  whenSuspended: "whenSuspended",
  whenUnsuspended: "whenUnsuspended",
  // "whenUnsuspends" is a duplicate spelling introduced by earlier hand-fixed IR (BT24-028,
  // BT25-060). Canonical name is "whenUnsuspended" (matches the `whenSuspended` sibling's
  // tense); the two card files are normalized to it, but the map keeps this alias so any
  // other raw IR carrying the variant spelling still resolves instead of hitting
  // `unsupported()`.
  whenUnsuspends: "whenUnsuspended",
  whenBattleWon: "whenBattleWon",
  whenDeletesInBattle: "whenDeletesInBattle",
  whenOneOfYoursDigivolves: "whenOneOfYoursDigivolves",
  whenAnyDigivolves: "whenAnyDigivolves",
  whenHatch: "whenHatch",
  whenMovedFromBreeding: "whenMovedFromBreeding",
  whenOpponentMovedFromBreeding: "whenOpponentMovedFromBreeding",
  onDeletionOf: "onDeletionOf",
  whenSecurityRemoved: "whenSecurityRemoved",
  whenEffectRemovesFromSecurity: "whenEffectRemovesFromSecurity",
  whenAddSecurity: "whenAddSecurity",
  whenFaceUpCardsAddedToOpponentSecurity: "whenFaceUpCardsAddedToOpponentSecurity",
  onAddDigivolutionCards: "onAddDigivolutionCards",
  whenPlayed: "whenPlayed",
  whenOptionPlayed: "whenOptionPlayed",
  // Parser wording for "place [Option] in the battle area". The placement primitive emits
  // `whenOptionPlayed` as the canonical engine event (distinct from using its [Main] effect).
  whenPlacedInBattleArea: "whenOptionPlayed",
  whenLeavesPlay: "whenLeavesPlay",
  whenLinked: "whenLinked",
  whenLinkTrashed: "whenLinkTrashed",
  whenDigivolutionTrashed: "whenDigivolutionTrashed",
  onDigivolutionCardDiscarded: "onDigivolutionCardDiscarded",
  onDigivolutionCardsDiscardedBatch: "onDigivolutionCardsDiscardedBatch",
  onDigiBurstCardDiscarded: "onDigiBurstCardDiscarded",
  onDigivolutionCardReturnToDeckBottom: "onDigivolutionCardReturnToDeckBottom",
  whenTrashedFromHand: "whenTrashedFromHand",
  whenHandTrashed: "whenHandTrashed",
  onDiscardLibrary: "onDiscardLibrary",
  whenOptionUsed: "whenOptionUsed",
  whenEffectAddsToHand: "whenEffectAddsToHand",
  whenEffectAddsToOpponentHand: "whenEffectAddsToOpponentHand",
  whenEffectAddsToDeck: "whenEffectAddsToDeck",
  whenCardReturnsFromTrashToHand: "whenCardReturnsFromTrashToHand",
  whenEffectSuspends: "whenEffectSuspends",
  whenOpponentDraws: "whenOpponentDraws",
  // ＜Delay＞ watcher event (BT19-099): "when one of your Millenniummon would leave the battle
  // area". Maps to whenLeavesPlay; sourceFilter on the SubTrigger restricts the leaving Digimon.
  whenDigimonWouldLeave: "whenLeavesPlay",
  startOfYourMainPhase: "startOfYourMainPhase",
  // GainTriggeredEffect in card IR may encode the trigger with a capital 'S' (runtime record output).
  StartOfYourMainPhase: "startOfYourMainPhase",
  endOfTurn: "endOfTurn",
  endOfOpponentTurn: "endOfOpponentTurn",
  // "When [matching Digimon] WOULD BE returned to hand/deck" — fires before the return executes.
  // sourceFilter.returnDestination optionally restricts which destinations arm the watcher (CAP-C-11).
  wouldBeReturned: "wouldBeReturned",
  // "When [this card] is trashed by an effect [while in the battle area]" (BT19-093; CAP-E8).
  whenTrashedByEffect: "whenTrashedByEffect",
  // "When this card is trashed from the deck" (BT19-097; CAP-H-01). Fires per milled card;
  // sourceFilter.isSelfRef gates on the milled card ID matching the watcher's source card ID.
  whenTrashedFromDeck: "whenTrashedFromDeck",
  // "When your Digimon checks a face-up security card" (BT20-055; CAP-H-03). Fires at
  // security-check time when the revealed card was already face-up before the check.
  whenCheckedFaceUpSecurity: "whenCheckedFaceUpSecurity",
};

const REPLACEMENT_EVENT_MAP: Record<string, ReplacementEventName | undefined> = {
  wouldLeavePlay: "wouldLeavePlay",
  wouldBeDeleted: "wouldBeDeleted",
  wouldBePlayed: "wouldBePlayed",
  wouldDigivolve: "wouldDigivolve",
};

/**
 * Install a delayed/triggered sub-effect on the engine's sub-trigger bus. The body
 * runs the sub-effect's actions when the engine fires the matching event. A "raw"
 * event (one the parser could not classify) is a loud gap.
 */
async function runSubTrigger(ctx: EffectContext, action: Extract<Action, { kind: "SubTrigger" }>): Promise<void> {
  const event = SUBTRIGGER_EVENT_MAP[action.event];
  if (event === undefined) {
    unsupported(ctx, action, `SubTrigger event "${action.event}" is not a known game event`);
    return;
  }
  // The watcher anchors on the SOURCE by default ("when THIS Digimon attacks"). When the
  // clause grants the trigger to a CHOSEN OTHER permanent ("give 1 of your opponent's
  // Digimon '[Start of Your Main Phase] This Digimon attacks'", documented behavior), `action.on`
  // resolves to that permanent and the watcher is installed on IT — so the sub-effect's
  // "this Digimon" / controller scope resolve to the GRANTED permanent, not the granter.
  const playerScoped = action.playerScoped === true;
  if (playerScoped && action.on !== undefined) {
    unsupported(ctx, action, "player-scoped SubTrigger cannot also target a permanent anchor");
    return;
  }
  const self = ctx.source.permanent();
  let anchorPermanentId = playerScoped ? undefined : self?.permanentId;
  let expiresOnTurnEndOf: typeof ctx.source.ownerSeat | undefined;
  if (action.on !== undefined) {
    const targetIds = await resolvePermanentTargets(ctx, action.on);
    const grantTo = targetIds[0];
    if (grantTo === undefined) return; // no eligible permanent chosen => nothing is granted
    anchorPermanentId = grantTo;
    // A granted watcher with an until-owner-turn-end lifecycle
    // expires when the GRANTED permanent's owner's turn ends. The duration ref names the
    // window relative to the granter; `untilOpponentTurnEnd` (the opponent's turn end) is the
    // owner's-turn-end of the chosen opponent permanent.
    if (action.duration === "untilOpponentTurnEnd" || action.duration === "untilYourTurnEnd") {
      const granted = ctx.game.permanentById(grantTo);
      if (granted !== undefined) expiresOnTurnEndOf = granted.controllerSeat;
    }
  }
  if (playerScoped) {
    if (action.duration === "untilOpponentTurnEnd" || action.duration === "endOfOpponentTurn") {
      expiresOnTurnEndOf = ctx.game.opponentOf(ctx.source.ownerSeat);
    } else if (action.duration === "untilYourTurnEnd") {
      expiresOnTurnEndOf = ctx.source.ownerSeat;
    } else if (action.duration === "forTheTurn") {
      expiresOnTurnEndOf = ctx.source.ownerSeat;
    } else {
      unsupported(ctx, action, "player-scoped SubTrigger requires a turn-end duration");
      return;
    }
  }
  // Capture the per-install sourceFilter ("a green Tamer", "a [Puppet] Digimon") so the
  // engine fires this sub-effect ONLY for a matching event payload. Without it every
  // filtered watcher would run on every play/deletion of its event kind (RESEARCH BLK-01
  // "Model gap" / Pitfall 2: BT10-044 would draw on every play, not just a green Tamer).
  // The filter is evaluated against the freshly bound context's payload subject via the
  // canonical `permanentMatchesFilter` / `definitionMatches` — never a hand-rolled matcher.
  const sourceFilter = action.sourceFilter;
  // Security-removal events carry no subject permanent — their payload names the seat whose
  // security lost a card. Interpret sourceFilter.controller as the watched stack direction:
  // most cards watch "your" stack, while BT9-016 watches the opponent's stack.
  const securityRemovalGate =
    event === "whenEffectRemovesFromSecurity" || event === "whenSecurityRemoved"
      ? (subCtx: EffectContext): boolean => {
          const removedSeat = subCtx.trigger?.removedFromSecuritySeat;
          if (removedSeat === undefined) return false;
          const direction = sourceFilter?.controller ?? "mine";
          if (direction === "any") return true;
          const watchedSeat =
            direction === "opponent" ? subCtx.game.opponentOf(subCtx.source.ownerSeat) : subCtx.source.ownerSeat;
          return removedSeat === watchedSeat;
        }
      : undefined;
  // `onDiscardLibrary` carries no subject permanent — its payload (`addedToHand.byEffect.ownerSeat`)
  // names the seat whose deck top was milled. The watcher's sourceFilter (controller "opponent"/
  // "mine") cannot be a subject filter here; gate instead on the milled deck's owner matching the
  // requested controller relative to the watcher's seat (BT14-077 "when a card in your OPPONENT's
  // deck is trashed"). Defaults to "opponent" since that is the only printed direction in-catalog.
  const discardLibraryGate =
    event === "onDiscardLibrary"
      ? (subCtx: EffectContext): boolean => {
          const milledSeat = subCtx.trigger?.addedToHand?.byEffect?.ownerSeat;
          if (milledSeat === undefined) return false;
          const want = sourceFilter?.controller ?? "opponent";
          if (want === "any") return true;
          const wantSeat =
            want === "opponent" ? subCtx.game.opponentOf(subCtx.source.ownerSeat) : subCtx.source.ownerSeat;
          return milledSeat === wantSeat;
        }
      : undefined;
  const filterMatch =
    sourceFilter === undefined ||
    event === "whenEffectRemovesFromSecurity" ||
    event === "whenSecurityRemoved" ||
    event === "onDiscardLibrary" ||
    event === "onDigivolutionCardReturnToDeckBottom" ||
    event === "whenHandTrashed" ||
    event === "whenOpponentDraws" ||
    event === "endOfOpponentTurn" ||
    event === "whenEffectAddsToOpponentHand" ||
    // whenHatch/whenEffectAddsToHand/whenEffectAddsToDeck/whenCardReturnsFromTrashToHand carry
    // either no subject permanent, or (whenHatch) a subject the generic subjectMatchesFilter
    // can't apply the right "mine"/"opponent" default direction to; each has its own dedicated
    // gate below instead.
    event === "whenHatch" ||
    event === "whenFaceUpCardsAddedToOpponentSecurity" ||
    event === "whenEffectAddsToHand" ||
    event === "whenEffectAddsToDeck" ||
    event === "whenCardReturnsFromTrashToHand" ||
    // whenTrashedByEffect uses trashedByEffectPermanentId (not subjectPermanentId); the
    // isSelfRef + zone gates are handled entirely by whenTrashedByEffectGate below.
    event === "whenTrashedByEffect" ||
    // whenTrashedFromHand fires for a loose hand card (no permanent); the isSelfRef gate
    // is handled by whenTrashedFromHandGate below.
    event === "whenTrashedFromHand" ||
    // whenTrashedFromDeck fires for a loose deck card (no permanent); the isSelfRef gate
    // is handled entirely by whenTrashedFromDeckGate below.
    event === "whenTrashedFromDeck" ||
    event === "onDigivolutionCardDiscarded" ||
    event === "onDigivolutionCardsDiscardedBatch" ||
    event === "onDigiBurstCardDiscarded"
      ? undefined
      : (subCtx: EffectContext): boolean => subjectMatchesFilter(subCtx, sourceFilter);
  // `onDigivolutionCardReturnToDeckBottom` fires for EVERY watcher (the bus is not host-scoped), so
  // gate on (a) the host that lost the stack card (TriggerInfo.subjectPermanentId) being THIS
  // watcher's own anchor permanent — i.e. "this Digimon's digivolution cards" — and (b) the returned
  // card's name matching the watcher's `sourceFilter` (BT11-065: "[Vemmon]").
  const digivolutionReturnGate =
    event === "onDigivolutionCardReturnToDeckBottom"
      ? (subCtx: EffectContext): boolean => {
          const anchor = subCtx.source.permanent()?.permanentId;
          if (anchor === undefined || anchor !== subCtx.trigger?.subjectPermanentId) return false;
          if (sourceFilter === undefined) return true;
          const refs = sourceFilter.nameOrTrait;
          if (refs === undefined || refs.length === 0) return true;
          const cardId = subCtx.trigger?.returnedToDeckCardId;
          if (cardId === undefined) return false;
          const def = getCardDefinition(cardId);
          if (def === undefined) return false;
          return refs.some((ref) => matchNameOrTrait(def as DefinitionFacts, ref));
        }
      : undefined;
  // `whenHandTrashed` carries no subject permanent — its payload names the seat whose hand an
  // action just trashed from. The watcher ("[All Turns] when YOUR hand is trashed from", BT25-084)
  // has no subject sourceFilter; gate purely on the trashed hand being the watcher controller's own.
  const handTrashedGate =
    event === "whenHandTrashed"
      ? (subCtx: EffectContext): boolean => subCtx.trigger?.handTrashedSeat === subCtx.source.ownerSeat
      : undefined;
  // "When THIS Digimon's attack target is switched" is host-scoped even when the IR has no
  // explicit sourceFilter. The event bus broadcasts every switch to every watcher, so bind the
  // payload attacker to the permanent carrying this effect. Without this gate BT11-008/010/014
  // reacted to a neighboring Digimon being blocked or using Raid.
  const attackTargetSwitchedGate =
    event === "whenAttackTargetSwitched" && sourceFilter?.isSelfRef === true && anchorPermanentId !== undefined
      ? (subCtx: EffectContext): boolean => subCtx.trigger.attackerPermanentId === anchorPermanentId
      : undefined;
  // `whenEffectSuspends` without an explicit sourceFilter is the printed self-scoped form:
  // "when an effect suspends THIS Digimon" (EX3-038 and its family). The bus broadcasts every
  // effect-suspension, including the opponent Digimon suspended by the watcher's own body, so
  // leaving this ungated makes every copy react to every Digimon and recursively suspend the
  // opponent's entire board. Filtered forms ("when your effect suspends a Tamer") deliberately
  // keep their broader subject gate above.
  const effectSuspendsSelfGate =
    event === "whenEffectSuspends" && sourceFilter === undefined && anchorPermanentId !== undefined
      ? (subCtx: EffectContext): boolean => subCtx.trigger.suspendedPermanentId === anchorPermanentId
      : undefined;
  // `whenOpponentDraws` carries no subject permanent — its payload names the seat that just drew.
  // The watcher reacts only when the DRAWING seat is the watcher controller's OPPONENT ("when YOUR
  // OPPONENT draws a card"). Gate: drawingSeat !== watcher's owner seat (i.e. it is the opponent).
  const whenOpponentDrawsGate =
    event === "whenOpponentDraws"
      ? (subCtx: EffectContext): boolean => {
          const ds = subCtx.trigger?.drawingSeat;
          return ds !== undefined && ds !== subCtx.source.ownerSeat;
        }
      : undefined;
  // `endOfOpponentTurn` ("at the end of your opponent's turn", EX3-069/EX4-058/EX4-071/EX6-070/
  // BT16-084/BT16-085/BT16-088/BT17-025): fires unconditionally at every OnEndTurn window (the
  // same seam as the plain `endOfTurn` sibling) with NO trigger payload at all, so there is no
  // per-fire field to read. Instead read the ambient game state directly: `state.turnSeat` is
  // still the ENDING player's seat at this exact fire point (the turn machine has not advanced
  // it yet) — the watcher fires only when that seat is its own controller's OPPONENT.
  const endOfOpponentTurnGate =
    event === "endOfOpponentTurn"
      ? (subCtx: EffectContext): boolean => subCtx.game.state.turnSeat !== subCtx.source.ownerSeat
      : undefined;
  // `whenEffectAddsToOpponentHand` carries no subject permanent — its payload names the seat an
  // EFFECT just added cards to. The watcher ("[All Turns] when an effect adds cards to your
  // opponent's hand") reacts only when that seat is its controller's OPPONENT. This is broader
  // than `whenOpponentDraws` (any effect-driven add, not just the draw action) and excludes the
  // normal draw-phase draw (which never routes through the effect hand-add seams).
  const effectAddsToOpponentHandGate =
    event === "whenEffectAddsToOpponentHand"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.effectAddedToHandSeat;
          return seat !== undefined && seat !== subCtx.source.ownerSeat;
        }
      : undefined;
  // `whenHatch` ("[All Turns] when YOU hatch [a Digi-Egg] in the breeding area", BT17-093;
  // KB Q2877: playing INTO breeding without hatching does not count). The payload names the
  // freshly-hatched permanent as the subject; gate on ITS controller matching the watcher's
  // requested seat (sourceFilter.controller — absent means "mine", the only printed
  // direction in-catalog, mirroring onDiscardLibrary's default-direction convention).
  const whenHatchGate =
    event === "whenHatch"
      ? (subCtx: EffectContext): boolean => {
          const hatchedId = subCtx.trigger?.subjectPermanentId;
          if (hatchedId === undefined) return false;
          const hatchedSeat = subCtx.game.permanentById(hatchedId)?.controllerSeat;
          if (hatchedSeat === undefined) return false;
          const want = sourceFilter?.controller ?? "mine";
          if (want === "any") return true;
          const wantSeat =
            want === "opponent" ? subCtx.game.opponentOf(subCtx.source.ownerSeat) : subCtx.source.ownerSeat;
          return hatchedSeat === wantSeat;
        }
      : undefined;
  // `whenFaceUpCardsAddedToOpponentSecurity` ("[Your Turn] when face-up cards are added to
  // your opponent's security stack", EX11-004; KB Q5789/Q5790 binding: fires both when an
  // effect adds a face-up card AND when a security CHECK flips an existing face-down card
  // face up — "added" means "became visibly present face up", not just "newly placed").
  // Shares the whenAddSecurity payload shape (addedToSecuritySeat/addedToSecurityInstanceIds)
  // fired from the same primitives.ts seams, plus a dedicated fire at the security-check flip
  // point (securityCheck.ts) for the check-reveal half. The "ToOpponentSecurity" direction is
  // baked into the name itself (unlike whenAddSecurity, which defaults to "mine"), so the gate
  // hardcodes the opponent-seat check; `triggerAddedSecurityMatches` supplies the "at least one
  // added/flipped card is actually face-up" half (shared with whenAddSecurity's own gate).
  const whenFaceUpCardsAddedToOpponentSecurityGate =
    event === "whenFaceUpCardsAddedToOpponentSecurity"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.addedToSecuritySeat;
          if (seat === undefined) return false;
          if (seat !== subCtx.game.opponentOf(subCtx.source.ownerSeat)) return false;
          return triggerAddedSecurityMatches(subCtx, sourceFilter);
        }
      : undefined;
  // `whenEffectAddsToHand` ("[Your Turn] when an effect adds cards to YOUR hand", BT9-002/
  // BT15-083/BT17-083; KB Q1794/Q1795/Q2861 binding: fires for effect Draw and Return-to-hand,
  // per-add-operation regardless of net hand-size change; Q2862 excludes the digivolution-
  // bonus hand increase, which never routes through these seams anyway). The "mine" mirror of
  // whenEffectAddsToOpponentHand, sharing its effectAddedToHandSeat payload and fire sites.
  const effectAddsToHandGate =
    event === "whenEffectAddsToHand"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.effectAddedToHandSeat;
          return seat !== undefined && seat === subCtx.source.ownerSeat;
        }
      : undefined;
  // `whenEffectAddsToDeck` ("[Your Turn] when your effects add to decks", BT26-015): mirrors
  // whenEffectAddsToHand one zone over, fired from returnToDeck's seam (effectAddedToDeckSeat).
  // "Mine" direction by the same convention (the recipient deck's owner matching the watcher).
  const effectAddsToDeckGate =
    event === "whenEffectAddsToDeck"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.effectAddedToDeckSeat;
          return seat !== undefined && seat === subCtx.source.ownerSeat;
        }
      : undefined;
  // `whenCardReturnsFromTrashToHand` ("[All Turns] when a [red] Digimon card returns from your
  // trash to the hand", BT15-082/BT16-011): a returnToHand carrying loose cards (no subject
  // permanent), scoped to the watcher's own seat ("your trash") and to the sourceFilter's
  // color/kind/trait against each returned card's definition.
  const cardReturnsFromTrashToHandGate =
    event === "whenCardReturnsFromTrashToHand"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.returnedFromTrashSeat;
          if (seat === undefined || seat !== subCtx.source.ownerSeat) return false;
          const cardIds = subCtx.trigger?.returnedFromTrashCardIds ?? [];
          if (cardIds.length === 0) return false;
          if (sourceFilter === undefined) return true;
          return cardIds.some((cardId) => {
            const def = getCardDefinition(cardId);
            return def !== undefined && definitionMatches(sourceFilter, def as DefinitionFacts);
          });
        }
      : undefined;
  // Event payloads attributed to an effect carry the acting seat. `bySourceController`
  // enforces printed clauses such as "one of YOUR effects suspends" and "using one of YOUR
  // effects, trash a card in your hand" without conflating the affected card's controller
  // with the effect's controller. Events without attribution fail this opt-in gate.
  const bySourceControllerGate =
    action.bySourceController !== undefined
      ? (subCtx: EffectContext): boolean => {
          const actingSeat =
            event === "whenEffectSuspends" ? subCtx.trigger?.effectSuspendSeat : subCtx.trigger?.byEffectSeat;
          if (actingSeat === undefined) return false;
          const own = subCtx.source.ownerSeat;
          return action.bySourceController === "mine" ? actingSeat === own : actingSeat !== own;
        }
      : undefined;
  // `startOfYourMainPhase` fires at EVERY main-phase start; the watcher must fire ONLY at the
  // watched permanent's owner's main phase, while it is still on the battle area — the
  // server-side turn-ownership + on-field re-check that stops a client forcing the granted
  // is anchored on the granted permanent, so its CardSource helpers answer for THAT permanent.
  const ownerMainPhaseGate =
    event === "startOfYourMainPhase"
      ? (subCtx: EffectContext): boolean => subCtx.source.isOwnersTurn() && subCtx.source.isOnBattleArea()
      : undefined;
  // A fire-time payload gate ("your security" + the added-card trait check for whenAddSecurity)
  // evaluated against the freshly bound context's TriggerInfo. When it does not hold the watcher
  // body is skipped entirely, so a mandatory tail never runs on an off-gate event (BT23-083).
  const fireConditionGate =
    action.fireCondition === undefined
      ? undefined
      : (subCtx: EffectContext): boolean => evaluateCondition(subCtx, action.fireCondition!);
  // `wouldBeReturned` carries TriggerInfo.returnDestination (the zone the permanent would land in).
  // A watcher with `sourceFilter.returnDestination` only fires when the return target matches that
  // list (BT20-074: ["hand","deck"] — not trash). Absent => no destination gate.
  const returnDestinationGate =
    event === "wouldBeReturned" && sourceFilter?.returnDestination !== undefined
      ? (subCtx: EffectContext): boolean => {
          const dest = subCtx.trigger?.returnDestination;
          return dest !== undefined && (sourceFilter.returnDestination as string[]).includes(dest);
        }
      : undefined;
  // `whenTrashedByEffect` (CAP-E8, BT19-093): fires when the watcher's own anchor permanent
  // is trashed by an effect (the `isSelfRef` sourceFilter means "this card specifically") — OR,
  // for a watcher with NO isSelfRef (a plain kind/zone/color filter, e.g. "an Option in the
  // battle area", P-203/EX7-070/P-159 — the previously-dead "whenEffectTrashes" name collapsed
  // onto this already-live event, since both describe the exact same effect-driven trash seam),
  // matches ANY permanent trashed by an effect whose live definition satisfies that filter
  // (the trashed permanent is still live in the battle area at fire time — see the seam comment
  // in primitives.ts — so its definition/color/kind can be read before it leaves the field).
  // `zone: "battleArea"` requires the permanent was in the battle area at the time (the seam
  // in `deletePermanent` fires only from battle area, so this gate is always true — kept here
  // for explicitness and in case future seams fire from other zones).
  const whenTrashedByEffectGate =
    event === "whenTrashedByEffect"
      ? (subCtx: EffectContext): boolean => {
          const trashedId = subCtx.trigger?.trashedByEffectPermanentId;
          if (trashedId === undefined) return false;
          if (sourceFilter?.zone !== undefined && sourceFilter.zone !== "battleArea") return false;
          if (sourceFilter === undefined || sourceFilter.isSelfRef === true) {
            const anchor = subCtx.source.permanent()?.permanentId ?? anchorPermanentId;
            return anchor !== undefined && trashedId === anchor;
          }
          const def = subCtx.game.permanentById(trashedId)?.topCard;
          if (def === undefined) return false;
          return definitionMatches(sourceFilter, subCtx.game.definitionOf(def) as DefinitionFacts);
        }
      : undefined;
  // `whenTrashedFromDeck` (CAP-H-01, BT19-097): fires per-card when a card is milled from the
  // deck by a TrashTopDeck action. The payload carries `trashedFromDeckCardId` (the card ID of
  // the milled card, not a permanent ID — it is a loose deck card). `sourceFilter.isSelfRef` means
  // "fire only when the milled card ID matches THIS watcher's source card ID." No subject permanent
  // exists; the generic `filterMatch` path is bypassed for this event.
  const whenTrashedFromDeckGate =
    event === "whenTrashedFromDeck"
      ? (subCtx: EffectContext): boolean => {
          const milledCardId = subCtx.trigger?.trashedFromDeckCardId;
          if (milledCardId === undefined) return false;
          if (
            action.excludeSelfEffect === true &&
            subCtx.trigger?.trashedFromDeckByEffectCardId === subCtx.source.cardId
          ) {
            return false;
          }
          if (sourceFilter?.isSelfRef === true) {
            return milledCardId === subCtx.source.cardId;
          }
          return true;
        }
      : undefined;
  const whenTrashedFromHandGate =
    event === "whenTrashedFromHand"
      ? (subCtx: EffectContext): boolean => {
          const cardId = subCtx.trigger?.trashedFromHandCardId;
          if (cardId === undefined) return false;
          const seat = subCtx.trigger?.handTrashedSeat;
          if (seat !== undefined && seat !== subCtx.source.ownerSeat) return false;
          if (sourceFilter?.isSelfRef === true) {
            return subCtx.trigger?.trashedFromHandInstanceId === subCtx.source.instanceId;
          }
          return true;
        }
      : undefined;
  const digivolutionCardDiscardedGate =
    (event === "onDigivolutionCardDiscarded" ||
      event === "onDigivolutionCardsDiscardedBatch" ||
      event === "onDigiBurstCardDiscarded") &&
    sourceFilter?.isSelfRef === true
      ? (subCtx: EffectContext): boolean =>
          event === "onDigiBurstCardDiscarded" || event === "onDigivolutionCardsDiscardedBatch"
            ? (subCtx.trigger?.trashedDigivolutionInstanceIds ?? []).includes(subCtx.source.instanceId)
            : subCtx.trigger?.trashedDigivolutionInstanceId === subCtx.source.instanceId
      : undefined;
  const effectSourceGate =
    action.effectSourceFilter === undefined
      ? undefined
      : (subCtx: EffectContext): boolean => {
          const cardId = subCtx.trigger?.byEffectCardId;
          if (cardId === undefined) return false;
          const def = subCtx.game.definitionOf({ cardId } as never);
          return definitionMatches(action.effectSourceFilter!, def as DefinitionFacts);
        };
  // `triggerFilter` on an `onAddDigivolutionCards` watcher (LANE-F-15, BT20-080/BT21-080):
  // restricts WHICH permanent's digivolution-card additions fire this watcher. The event's
  // `subjectPermanentId` is the RECEIVER permanent (the Digimon whose stack grew). Gate on that
  // permanent matching the filter, evaluated via the same `subjectMatchesFilter` path that the
  // generic `filterMatch` uses for `sourceFilter` on other events.
  //   BT20-080: { isSelfRef: true } — fires only when cards are placed under THIS permanent.
  //   BT21-080: { kind: ["Digimon"], nameOrTrait: [...] } — receiver must be Gammamon/Hero trait.
  // For attack events (whenAttacking / whenOpponentAttacks) the event subject is the
  // ATTACKER, so the same subject-filter gate lets a watcher fire only when the attacker matches —
  // including relative gates like `digivolutionCardsCompareToSource` ("with as many or fewer
  // digivolution cards as this Digimon attacks", BT15-032 and AD1/BT16-family cards).
  const ATTACK_TRIGGER_FILTER_EVENTS = new Set(["whenAttacking", "whenOpponentAttacks"]);
  const triggerFilterGate =
    action.triggerFilter !== undefined &&
    (event === "onAddDigivolutionCards" || ATTACK_TRIGGER_FILTER_EVENTS.has(event))
      ? (subCtx: EffectContext): boolean => subjectMatchesFilter(subCtx, action.triggerFilter!)
      : undefined;
  // `sourceFilter.nameMatchesInheritedHost` (CAP-G2, BT2-059 Kurisarimon): fires ONLY when the
  // played card's name matches the HOST permanent's current top-card name. "This Digimon" in an
  // inherited effect text refers to the Digimon whose digivolution stack contains this card —
  // the anchor permanent. KB Q1024: compare at fire time so a digivolved host's new top-card
  // name is used. The event subject is the just-played permanent (subjectPermanentId).
  const inheritedHostNameGate =
    sourceFilter?.nameMatchesInheritedHost === true
      ? (subCtx: EffectContext): boolean => {
          const hostPerm = anchorPermanentId !== undefined ? subCtx.game.permanentById(anchorPermanentId) : undefined;
          if (hostPerm?.topCard === undefined) return false;
          const hostName = subCtx.game.definitionOf(hostPerm.topCard).nameEn;
          if (hostName === undefined) return false;
          const subjectId = subCtx.trigger.subjectPermanentId;
          if (subjectId === undefined) return false;
          const subject = subCtx.game.permanentById(subjectId);
          if (subject?.topCard === undefined) return false;
          const subjectName = subCtx.game.definitionOf(subject.topCard).nameEn;
          return subjectName === hostName;
        }
      : undefined;
  const sourceDeleteCause = (sourceFilter as (Filter & { deleteCause?: "dpReachedZero" }) | undefined)?.deleteCause;
  const deleteCauseGate =
    event === "onDeletionOf" && sourceDeleteCause === "dpReachedZero"
      ? (subCtx: EffectContext): boolean => subCtx.trigger.removalCause === "byRule"
      : undefined;
  const gates = [
    filterMatch,
    ownerMainPhaseGate,
    fireConditionGate,
    securityRemovalGate,
    discardLibraryGate,
    digivolutionReturnGate,
    handTrashedGate,
    attackTargetSwitchedGate,
    effectSuspendsSelfGate,
    whenOpponentDrawsGate,
    endOfOpponentTurnGate,
    effectAddsToOpponentHandGate,
    whenHatchGate,
    whenFaceUpCardsAddedToOpponentSecurityGate,
    effectAddsToHandGate,
    effectAddsToDeckGate,
    cardReturnsFromTrashToHandGate,
    bySourceControllerGate,
    returnDestinationGate,
    whenTrashedByEffectGate,
    whenTrashedFromDeckGate,
    whenTrashedFromHandGate,
    digivolutionCardDiscardedGate,
    effectSourceGate,
    triggerFilterGate,
    inheritedHostNameGate,
    deleteCauseGate,
  ].filter((g): g is (subCtx: EffectContext) => boolean => g !== undefined);
  const matches = gates.length === 0 ? undefined : (subCtx: EffectContext): boolean => gates.every((g) => g(subCtx));
  ctx.fx.subscribeSubTrigger({
    event,
    sourcePermanentId: anchorPermanentId,
    ...(playerScoped
      ? { activationContext: ctx }
      : action.on !== undefined
        ? {}
        : { sourceInstanceId: ctx.source.instanceId }),
    // Anchor-less fallback (the eighth engine gap): when there is no on-field permanent to
    // anchor to AND the clause was not granted to another permanent (both cases already set
    // anchorPermanentId), the watcher's source is a loose hand/trash-resident CardInstance —
    // bind the fallback anchor to ITS instance so the engine can still resolve a context.
    // A watcher is one-shot only when the clause says so ("at the NEXT end of your opponent's
    // turn", EX3-069 / KB Q5722). `fire` evaluates `matches` BEFORE marking a sub as fired, so a
    // one-shot survives the turn ends its gates reject. Default: persists until its anchor leaves.
    once: action.once === true,
    ...(matches ? { matches } : {}),
    ...(expiresOnTurnEndOf !== undefined ? { expiresOnTurnEndOf } : {}),
    ...(action.oncePerTiming ? { oncePerTiming: true } : {}),
    ...(action.oncePerTiming
      ? {
          oncePerTimingIdentity: `${ctx.source.instanceId}/${event}/${JSON.stringify({
            sourceFilter: action.sourceFilter,
            actions: action.actions,
            raw: action.raw,
          })}`,
        }
      : {}),
    ...(action.oncePerTurnKey ? { oncePerTurnKey: `${ctx.source.instanceId}/${action.oncePerTurnKey}` } : {}),
    description: action.raw,
    run: async (subCtx) => {
      // Preserve the printed clause timing on every decision opened by the future watcher.
      // The freshly rebound context carries the event payload but not the installing effect's
      // activeTiming; without this, UI provenance degrades to a card-only guess (EX3-038's
      // opponent-target prompt lost its [Your Turn] label entirely).
      subCtx.activeTiming ??= ctx.activeTiming;
      subCtx.activeEffectText ??= ctx.activeEffectText;
      // A simultaneous play is one whenPlayed event, but a filtered watcher binds "those
      // Digimon" only to the members of that event that satisfied its sourceFilter. Keep the
      // narrowed provenance on this activation context so sourceRef:"triggerSubject" cannot
      // offer an unrelated card that happened to be played by the same effect (Q3664).
      if (sourceFilter !== undefined && (subCtx.trigger.subjectPermanentIds?.length ?? 0) > 1) {
        const matchingIds = matchingSubjectPermanentIds(subCtx, sourceFilter);
        subCtx.trigger = {
          ...subCtx.trigger,
          subjectPermanentIds: matchingIds,
          subjectPermanentId: matchingIds[0],
        };
      }
      // SubTrigger bodies share the same selection-binding contract as top-level effects.
      // A freshly-built watcher context has no map by default; without initializing it,
      // SelectBind silently drops the chosen permanent and every following
      // fromSelectionRef action no-ops (BT8-081's +3000 DP / unsuspend pair).
      subCtx.selections ??= new Map();
      // CAP-E14: an intrinsic ＜Delay＞ gate (`withIntrinsicDelayGate`, comprehensive rules
      // §16-17) — this watcher belongs to a card printing ＜Delay＞ directly on a continuous
      // trigger. Its OWN optional-ask/cost supersedes `action.optional` below: §16-17-1 makes
      // trashing the source card the activation cost, and §16-17-3 bars activation the turn it
      // entered play.
      if ((action as { delayArmedIntrinsic?: boolean }).delayArmedIntrinsic === true) {
        const self = subCtx.source.permanent();
        if (self === undefined) return;
        if (self.enterFieldTurnCount === subCtx.game.state.turnCount) return;
        const activate = await subCtx.ask.optional(
          subCtx,
          action.raw ?? "Trash this card to activate its ＜Delay＞ effect?",
        );
        if (!activate) return;
        const trashed = await subCtx.fx.deletePermanent([self.permanentId]);
        if (trashed <= 0) return;
      } else {
        const activationCost = action.cost as Cost | undefined;
        const activationCostOptions = (action.costOptions ?? []) as Cost[];
        const additionalCosts = [
          ...((action.additionalCosts ?? []) as Cost[]),
          ...(action.additionalCost !== undefined ? [action.additionalCost as Cost] : []),
        ];
        const hasActivationCost =
          activationCost !== undefined || activationCostOptions.length > 0 || additionalCosts.length > 0;
        if (activationCost !== undefined && !canPayCost(subCtx, activationCost)) return;
        if (activationCostOptions.length > 0 && !activationCostOptions.some((cost) => canPayCost(subCtx, cost))) return;
        if (additionalCosts.some((cost) => !canPayCost(subCtx, cost))) return;

        if (action.optional === true || hasActivationCost) {
          const yes = await subCtx.ask.optional(
            subCtx,
            action.raw ?? activationCost?.raw ?? "Activate this triggered effect?",
          );
          if (!yes) return;
        }
        if (activationCostOptions.length > 0) {
          if (!(await payOneCostOption(subCtx, activationCostOptions))) return;
        } else if (activationCost !== undefined) {
          if (!(await payCost(subCtx, activationCost))) return;
        }
        for (const cost of additionalCosts) {
          if (!(await payCost(subCtx, cost))) return;
        }
      }
      for (const a of action.actions) {
        const abort = await runAction(subCtx, a);
        if (abort) break;
      }
    },
  });
}

/**
 * Grant a triggered effect to a chosen permanent (CAP-C-16, BT21-077).
 *
 * Resolves the target permanent(s) from the action, then installs a SubTrigger watcher
 * anchored on EACH granted permanent so that "this Digimon" / controller scope inside the
 * `gainedActions` body resolve to the GRANTED permanent (not the granter). The watcher fires
 * when `gainedTrigger` matches a live SubTrigger bus event.
 *
 * Duration: `untilOpponentTurnEnd` expires at the end of the granted permanent's controller's
 * own turn (the granter's opponent's turn end = the OPPONENT Digimon owner's turn end).
 * The `expiresOnTurnEndOf` field on the watcher handles the sweep.
 *
 * "StartOfYourMainPhase" maps to `startOfYourMainPhase` via SUBTRIGGER_EVENT_MAP, which is
 * already fired by GameEngine at `OnStartMainPhase`. The `ownerMainPhaseGate` inside the
 * existing SubTrigger machinery restricts it to the granted permanent's owner's phase.
 */
async function runGainTriggeredEffect(
  ctx: EffectContext,
  action: Extract<Action, { kind: "GainTriggeredEffect" }>,
): Promise<void> {
  const event = SUBTRIGGER_EVENT_MAP[action.gainedTrigger];
  if (event === undefined) {
    unsupported(
      ctx,
      action,
      `GainTriggeredEffect gainedTrigger "${action.gainedTrigger}" is not a known SubTrigger event`,
    );
    return;
  }
  const targetIds = await resolvePermanentTargets(ctx, action.target);
  for (const targetPermanentId of targetIds) {
    const grantedPerm = ctx.game.permanentById(targetPermanentId);
    if (grantedPerm === undefined) continue;
    let expiresOnTurnEndOf: typeof ctx.source.ownerSeat | undefined;
    if (action.duration === "forTheTurn") expiresOnTurnEndOf = ctx.source.ownerSeat;
    if (action.duration === "untilYourTurnEnd") expiresOnTurnEndOf = ctx.source.ownerSeat;
    if (action.duration === "untilOpponentTurnEnd") {
      expiresOnTurnEndOf = ctx.game.opponentOf(ctx.source.ownerSeat);
    }
    // `startOfYourMainPhase` requires the watcher to fire only during the GRANTED permanent's
    // owner's main phase; the ownerMainPhaseGate in runSubTrigger handles this via isOwnersTurn()
    // on the watcher's context, which is anchored on the GRANTED permanent. Gate is always added
    const ownerMainPhaseGate =
      event === "startOfYourMainPhase"
        ? (subCtx: EffectContext): boolean => subCtx.source.isOwnersTurn() && subCtx.source.isOnBattleArea()
        : undefined;
    const grantedPermanentDeletionGate =
      event === "onDeletionOf"
        ? (subCtx: EffectContext): boolean => subCtx.trigger.deletedPermanentId === targetPermanentId
        : undefined;
    // A gained "when this Digimon deletes ... in battle" trigger belongs to the
    // granted permanent, not to every attacker controlled by the same player.
    // The combat controller only publishes this event after the attacker survives
    // and the battled defender is deleted, so this identity gate completes the
    // printed condition without duplicating combat semantics here.
    const grantedPermanentBattleDeleteGate =
      event === "whenDeletesInBattle"
        ? (subCtx: EffectContext): boolean => subCtx.trigger.attackerPermanentId === targetPermanentId
        : undefined;
    const gates = [ownerMainPhaseGate, grantedPermanentDeletionGate, grantedPermanentBattleDeleteGate].filter(
      (g): g is (subCtx: EffectContext) => boolean => g !== undefined,
    );
    const matches = gates.length === 0 ? undefined : (subCtx: EffectContext): boolean => gates.every((g) => g(subCtx));
    const gainedActions = action.gainedActions;
    ctx.fx.subscribeSubTrigger({
      event,
      sourcePermanentId: targetPermanentId,
      once: false,
      ...(matches ? { matches } : {}),
      ...(expiresOnTurnEndOf !== undefined ? { expiresOnTurnEndOf } : {}),
      description: action.raw ?? `GainTriggeredEffect(${action.gainedTrigger}) on ${targetPermanentId}`,
      run: async (subCtx) => {
        for (const a of gainedActions) {
          const abort = await runAction(subCtx, a);
          if (abort) break;
        }
      },
    });
  }
}

/**
 * Resolve the permanent whose entry/exit drove a SubTrigger event (the played card, the
 * deleted permanent, the attacker, …) from the freshly bound context's `trigger` payload,
 * and test the captured `sourceFilter` against it. Controller scope ("mine"/"opponent") is
 * checked relative to the watcher's source seat (via `seatsForController`, exactly as the
 * normal target enumeration does); the rest of the filter (kind/colors/level/trait/DP) goes
 * through `permanentMatchesFilter`. An unresolved subject never matches (the event is not
 * about a card this watcher cares for).
 */
function matchingSubjectPermanentIds(subCtx: EffectContext, filter: Filter): string[] {
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

function subjectMatchesFilter(subCtx: EffectContext, filter: Filter): boolean {
  return matchingSubjectPermanentIds(subCtx, filter).length > 0;
}

/**
 * whenAddSecurity trait gate: did at least one card JUST ADDED to the watcher controller's
 * security stack (TriggerInfo.addedToSecurityInstanceIds) match `filter`, while being FACE UP?
 * EqualsTraits("Zaxon"))`). A ＜Recovery＞-style face-down add never satisfies it. An absent
 * filter (no trait clause) means "any added card" — but the IR always carries the trait filter.
 */
function triggerAddedSecurityMatches(ctx: EffectContext, filter: Filter | undefined): boolean {
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
function triggerSubjectMatchesColor(ctx: EffectContext, filter: Filter | undefined): boolean {
  const wanted = filter?.colors;
  if (wanted === undefined || wanted.length === 0) return false;
  const subjectId = ctx.trigger.subjectPermanentId;
  if (subjectId === undefined) return false;
  const subject = ctx.game.permanentById(subjectId);
  if (subject?.topCard === undefined) return false;
  const colors = ctx.game.definitionOf(subject.topCard).colors;
  return wanted.some((w) => colors.includes(w as never));
}

function triggerSubjectMatchesFilter(ctx: EffectContext, filter: Filter | undefined): boolean {
  if (filter === undefined) return false;
  const subjectIds =
    ctx.trigger.subjectPermanentIds ??
    (ctx.trigger.subjectPermanentId === undefined ? [] : [ctx.trigger.subjectPermanentId]);
  return subjectIds.some((subjectId) => {
    const subject = ctx.game.permanentById(subjectId);
    return subject !== undefined && permanentMatchesFilter(ctx, subject, filter, ctx.source);
  });
}

/**
 * Install a replacement effect. `reduceCost` records a cost delta the play/digivolve
 * cost step subtracts; `instead`/`prevent` run a payload when the engine consults the
 * replacement before the replaced event. A "raw" event is a loud gap.
 */
async function runReplacement(ctx: EffectContext, action: Extract<Action, { kind: "Replacement" }>): Promise<void> {
  const event = REPLACEMENT_EVENT_MAP[action.event];
  if (event === undefined) {
    unsupported(ctx, action, `Replacement event "${action.event}" is not a known game event`);
    return;
  }
  if (action.sourceFilter?.zone === "battleArea" && !ctx.source.isOnBattleArea()) return;
  const self = ctx.source.permanent();
  // The prose compiler often emits the prevention as a NESTED `{kind:"Prevent"}` inner action
  // (carrying the prevention's cost) rather than setting `mode:"prevent"` on the Replacement
  // itself — BT18-082 "by trashing the bottom card of your security stack, it doesn't leave".
  // Normalize that shape here so the reaction installs as a real prevent (consulted by the
  // engine's leave-prevention seam) instead of a mode-less dead store the consult skips.
  //
  // A THIRD encoding of the same prevention (BT11-062, BT11-064): a nested `GrantStatic`
  // carrying `grant: { cannotLeavePlay: true }` plus its OWN cost/optional/abortOnDecline,
  // rather than a `{kind:"Prevent"}` sibling. Recognized here alongside it — without this, the
  // outer Replacement defaults to "instead" mode (no cost gate, no protection) and the inner
  // GrantStatic falls through to the engine's fail-loud "no enforcement path" catch-all.
  const isCannotLeavePlayGrant = (grant: unknown): boolean =>
    typeof grant === "object" && grant !== null && (grant as { cannotLeavePlay?: boolean }).cannotLeavePlay === true;
  const nestedPrevent = (
    action.actions as { kind?: string; cost?: Cost; condition?: Condition; grant?: unknown }[] | undefined
  )?.find((a) => a.kind === "Prevent" || (a.kind === "GrantStatic" && isCannotLeavePlayGrant(a.grant)));
  // The prose compiler also emits a CROSS-CARD reduceCost as a nested Replacement — an outer
  // `wouldBePlayed` reaction scoped by `sourceFilter` ("an [Eater] Digimon", not "this card")
  // wrapping the inner `{mode:"reduceCost", amount}` Replacement, rather than setting mode/amount
  // on the outer action itself (BT22-079's [Breeding] resident reducer). Hoist the nested mode +
  // amount the same way nestedPrevent is normalized above, so the installed subscription is a real
  // reduceCost entry `costReductionFor` can sum — not a mode-less dead store.
  const nestedCostModifier = (
    action.actions as
      | { kind?: string; event?: string; mode?: string; amount?: number; condition?: Condition }[]
      | undefined
  )?.find(
    (a) =>
      a.kind === "Replacement" && a.event === action.event && (a.mode === "reduceCost" || a.mode === "increaseCost"),
  );
  // When the prose compiler emits a Replacement with a cost but no explicit
  // mode (e.g. BT18-082 "by trashing the bottom card of your security stack,
  // it doesn't leave"), interpret it as "prevent" — a cost with empty actions
  // can only mean prevention.
  const mode =
    action.mode ??
    (nestedPrevent !== undefined
      ? "prevent"
      : nestedCostModifier !== undefined
        ? nestedCostModifier.mode
        : action.cost
          ? "prevent"
          : "instead");
  let amount = action.amount ?? nestedCostModifier?.amount;
  // Mutually-exclusive amount alternatives (EX6-006 "reduce by 3 ... reduce by 4 instead"):
  // only ONE eligible entry ever installs — never both — because `costReductionFor` SUMS every
  // active reduceCost subscription anchored to this permanent, so two simultaneously-installed
  // amounts would silently stack.
  if (mode === "reduceCost" && action.amountChoices && action.amountChoices.length > 0) {
    const eligible = action.amountChoices.filter(
      (choice) => choice.condition === undefined || evaluateCondition(ctx, choice.condition),
    );
    if (eligible.length === 0) return;
    if (eligible.length === 1) {
      amount = eligible[0]!.amount;
    } else {
      const chosen = await ctx.ask.chooseOption(
        ctx,
        eligible.map((choice) => choice.raw ?? `Reduce the play cost by ${choice.amount}.`),
      );
      amount = eligible[chosen]!.amount;
    }
  }
  const preventCost = action.cost ?? nestedPrevent?.cost;
  // A "prevent" leave/delete reaction: install a protects-predicate (which permanents it
  // guards) + a preventCheck (prompt + pay the cost; true => the removal is prevented). The
  // engine's leave-prevention consult runs these when a permanent would be deleted/leave.
  if (mode === "prevent") {
    const protectsSelf =
      action.target === undefined || action.target.isSelf === true || action.target.filter?.isSelfRef === true;
    const protectsFilter = action.target?.filter;
    // The reaction's owner seat (whose permanents it protects). Used to gate the removal
    // cause: "your effects" / "opponent's effect" are relative to this seat.
    const ownerSeat = ctx.source.ownerSeat;
    // sourceFilter.leaveReason="effect" is an alternative encoding of leaveCause:"byEffect"
    // (used by cards like BT19-048 where the cause gate is embedded in the sourceFilter
    // rather than the top-level leaveCause field). leaveCause wins when both are present.
    const sourceleaveReason = action.sourceFilter?.leaveReason;
    const leaveCause = action.leaveCause ?? (sourceleaveReason === "effect" ? "byEffect" : "any");
    const exceptDeletion = action.exceptDeletion === true;
    ctx.fx.subscribeReplacement({
      event,
      sourcePermanentId: self?.permanentId,
      mode: "prevent",
      affectsAll: action.affectsAll,
      description: action.raw,
      causeAllows: (cause, resolvingSeat, isBounce) => {
        // "Can't leave EXCEPT by deletion" (EX6-044): a deletion (a non-bounce removal) is
        // allowed through; only a move/bounce is prevented (KB EX6-044 Q3771).
        if (exceptDeletion && !isBounce) return false;
        switch (leaveCause) {
          case "byOpponentEffect":
            // Only an opponent's effect: removal must be effect-driven by a non-owner seat.
            return cause === "byEffect" && resolvingSeat !== undefined && resolvingSeat !== ownerSeat;
          case "otherThanYourEffect":
            // Anything except the owner's own effect.
            return !(cause === "byEffect" && resolvingSeat === ownerSeat);
          case "byEffect":
            return cause === "byEffect";
          case "byBattle":
            return cause === "byBattle";
          case "otherThanBattle":
            return cause !== "byBattle";
          case "any":
          default:
            return true;
        }
      },
      protects: (subCtx, leavingId) => {
        if (protectsSelf) return subCtx.source.permanent()?.permanentId === leavingId;
        const leaving = subCtx.game.permanentById(leavingId);
        if (leaving === undefined || protectsFilter === undefined) return false;
        // Controller gate ("any of YOUR Digimon"): permanentMatchesFilter checks definition
        // facts only, not the seat, so a "mine"/"opponent" filter must be honored here against
        // the leaving permanent's controller relative to the reaction's owner.
        if (protectsFilter.controller === "mine" && leaving.controllerSeat !== ownerSeat) return false;
        if (protectsFilter.controller === "opponent" && leaving.controllerSeat === ownerSeat) return false;
        return permanentMatchesFilter(subCtx, leaving, protectsFilter, subCtx.source);
      },
      preventCheck: async (subCtx) => {
        // "You may [pay cost] to prevent" — the cost is the gate. Decline => not prevented.
        if (action.optional !== false) {
          const yes = await subCtx.ask.optional(subCtx, `Prevent leaving the battle area? (${action.raw})`);
          if (!yes) return false;
        }
        const runCtx: EffectContext =
          action.requiresDelayArmed === true ? { ...subCtx, delayArmedConsumed: true } : subCtx;
        if (action.requiresDelayArmed === true) {
          const source = subCtx.source.permanent();
          if (source === undefined) return false;
          if (source.enterFieldTurnCount === subCtx.game.state.turnCount) return false;
          const hasDelay = (subCtx.fx.grantedKeywords?.(source.permanentId) ?? []).some((g) => g.keyword === "Delay");
          if (!hasDelay) return false;
          subCtx.fx.revokeKeyword?.(source.permanentId, "Delay");
          const trashed = await subCtx.fx.deletePermanent([source.permanentId]);
          if (trashed <= 0) return false;
        }
        // CAP-E14: an intrinsic ＜Delay＞ gate (`withIntrinsicDelayGate`, comprehensive rules
        // §16-17) — the printed keyword's OWN cost, not the separate GainKeyword-armed model
        // above. §16-17-3 bars activation the turn the card entered play; §16-17-1 makes
        // trashing the source card (already asked as the "prevent?" confirm above) the cost.
        if ((action as { delayArmedIntrinsic?: boolean }).delayArmedIntrinsic === true) {
          const source = subCtx.source.permanent();
          if (source === undefined) return false;
          if (source.enterFieldTurnCount === subCtx.game.state.turnCount) return false;
          const trashed = await subCtx.fx.deletePermanent([source.permanentId]);
          if (trashed <= 0) return false;
        }
        const preventCosts = action.costOptions ?? (preventCost ? [preventCost] : []);
        if (preventCosts.length > 0) {
          const paid = await payOneCostOption(subCtx, preventCosts);
          if (!paid) return false;
        }
        for (const inner of action.actions ?? []) {
          if (inner.kind === "Prevent") continue;
          if (inner.kind === "GrantStatic" && isCannotLeavePlayGrant((inner as { grant?: unknown }).grant)) continue;
          const abort = await runAction(runCtx, inner);
          if (abort) break;
        }
        if (nestedPrevent?.condition !== undefined && !evaluateCondition(runCtx, nestedPrevent.condition)) {
          return false;
        }
        return true;
      },
    });
    return;
  }
  // The mode/amount hoist above lifts a nested reduceCost Replacement's own gate too — dropping
  // it would install the cost reduction UNCONDITIONALLY. This is the one reduceCost path the
  // engine actually consumes for digivolve costs (GameEngine's wouldDigivolve costReductionFor),
  // so a dropped condition here silently discounts every digivolve, condition or not
  // (P-117/BT13-049/BT13-050/EX2-026/BT14-044's "you have a [green] Tamer" gate).
  if (
    mode === "reduceCost" &&
    nestedCostModifier?.condition !== undefined &&
    !evaluateCondition(ctx, nestedCostModifier.condition)
  ) {
    return;
  }
  const intoFilter = action.into;
  if (mode === "reduceCost" || mode === "increaseCost") {
    const interactiveCost = action.cost;
    const ownerSeat = ctx.source.ownerSeat;
    ctx.fx.subscribeReplacement({
      event,
      sourcePermanentId: self?.permanentId,
      mode: "reduceCost",
      amount: mode === "increaseCost" ? -(amount ?? 0) : amount,
      description: action.raw,
      digisorptionRedirect: action.digisorptionRedirect,
      // "when this Digimon would digivolve INTO a card with [X] trait/name": restrict the
      // cost reduction to only when the digivolution target satisfies the into-filter.
      intoMatches: intoFilter !== undefined ? (def) => definitionMatches(intoFilter, def) : undefined,
      ...(mode === "increaseCost"
        ? {
            appliesTo: (target: Permanent) => {
              // A Tamer used through a Hybrid "as if level 3 Digimon" path is the Digimon
              // that would digivolve for this reaction (EX3-016 Q3382/Q3383). The action verb
              // has already established that special identity, so do not reject it merely
              // because its printed CardKind is Tamer at this lower cost seam.
              const { kind: _digivolvingKind, ...filter } = action.sourceFilter ?? {};
              return permanentMatchesFilter(ctx, target, filter, ctx.source);
            },
          }
        : {}),
      ...(interactiveCost !== undefined
        ? {
            controllerSeat: ownerSeat,
            appliesTo: (target: Permanent) =>
              target.controllerSeat === ownerSeat &&
              !target.inBreeding &&
              permanentMatchesFilter(ctx, target, action.sourceFilter ?? {}, ctx.source),
            activate: async (runtimeCtx: EffectContext) => {
              if (action.optional !== false) {
                const accepted = await runtimeCtx.ask.optional(
                  runtimeCtx,
                  action.raw ?? "Pay the cost to reduce the digivolution cost?",
                );
                if (!accepted) return false;
              }
              if (
                interactiveCost.kind === "suspend" &&
                (interactiveCost.target?.isSelf === true || interactiveCost.target?.filter.isSelfRef === true)
              ) {
                return self !== undefined && runtimeCtx.fx.payActivationCost?.(self.permanentId, "suspend") === true;
              }
              return payCost(runtimeCtx, interactiveCost);
            },
            consumeOnActivate: true,
          }
        : {}),
    });
    return;
  }
  // mode === "instead": a substitute side effect the leave-prevention consult runs alongside
  // (not instead of, despite the name — see ReplacementInstallInstead's doc comment) the
  // event; it never itself blocks the removal.
  ctx.fx.subscribeReplacement({
    event,
    sourcePermanentId: self?.permanentId,
    mode: "instead",
    description: action.raw,
    digisorptionRedirect: action.digisorptionRedirect,
    causeAllows: (cause) => {
      switch (action.leaveCause ?? "any") {
        case "byBattle":
          return cause === "byBattle";
        case "byEffect":
          return cause === "byEffect";
        case "otherThanBattle":
          return cause !== "byBattle";
        case "any":
          return true;
        default:
          return true;
      }
    },
    appliesTo: (_subCtx, leavingPermanentId) => {
      const candidate = _subCtx.game.permanentById(leavingPermanentId);
      if (candidate === undefined) return false;
      const filter = action.sourceFilter ?? action.target?.filter;
      if (filter !== undefined) {
        if (filter.controller === "mine" && candidate.controllerSeat !== ctx.source.ownerSeat) return false;
        if (filter.controller === "opponent" && candidate.controllerSeat === ctx.source.ownerSeat) return false;
        if (!permanentMatchesFilter(_subCtx, candidate, filter, _subCtx.source)) return false;
      }
      if (intoFilter !== undefined) {
        const intoCardId = _subCtx.trigger.digivolvingIntoCardId;
        const into = intoCardId === undefined ? undefined : getCardDefinition(intoCardId);
        if (into === undefined || !definitionMatches(intoFilter, into)) return false;
      }
      return true;
    },
    apply: async (subCtx) => {
      for (const a of action.actions ?? []) {
        const abort = await runAction(subCtx, a);
        if (abort) break;
      }
    },
  });
}

async function runPrevent(ctx: EffectContext, action: Extract<Action, { kind: "Prevent" }>): Promise<void> {
  const event = action.mode === "delete" ? "wouldBeDeleted" : "wouldLeavePlay";
  await runReplacement(ctx, {
    ...action,
    kind: "Replacement",
    event,
    mode: "prevent",
    raw: action.raw ?? "legacy Prevent",
  });
}

/** "Activate N of the effects below" — ask the controller which option(s), run them. */
async function runModal(ctx: EffectContext, action: Extract<Action, { kind: "Modal" }>): Promise<void> {
  if (action.options.length === 0) return;
  const availableIndices = action.options
    .map((option, idx) => ({ option, idx }))
    .filter(({ option }) => option.some((nested) => canAttemptModalAction(ctx, nested)))
    .map(({ idx }) => idx)
    .filter((idx) => {
      const condition = action.optionConditions?.[idx];
      return condition == null || evaluateCondition(ctx, condition);
    });
  if (availableIndices.length === 0) return;
  if (action.chooseAll !== undefined && evaluateCondition(ctx, action.chooseAll.condition)) {
    for (const idx of availableIndices) {
      const option = action.options[idx]!;
      for (const nestedAction of option) {
        const abort = await runAction(ctx, nestedAction);
        if (abort) break;
      }
    }
    return;
  }
  const rawChoose = action.chooseScaling !== undefined ? scaleFactor(ctx, action.chooseScaling) : action.choose;
  const choose = Math.min(rawChoose, availableIndices.length);
  const chosenIndices: number[] = choose === 1 && availableIndices.length === 1 ? [availableIndices[0]!] : [];
  for (let i = 0; i < choose; i++) {
    if (chosenIndices.length >= choose) break;
    const remaining = availableIndices.filter((idx) => !chosenIndices.includes(idx));
    if (remaining.length === 0) break;
    const labels = remaining.map(
      (idx) =>
        action.labels?.[idx] ??
        (action.options[idx]!.length > 0
          ? action.options[idx]!.map(describeAction).join(" · ")
          : describeAction({ kind: "RawUnparsed", text: `option ${idx}` })),
    );
    const pick = await ctx.ask.chooseOption(ctx, labels);
    const chosen = remaining[pick] ?? remaining[0]!;
    chosenIndices.push(chosen);
  }
  for (const idx of chosenIndices) {
    for (const a of action.options[idx]!) {
      const abort = await runAction(ctx, a);
      if (abort) break;
    }
  }
}

/** Synchronous availability for one nested modal action; no decisions or mutations. */
function canAttemptModalAction(ctx: EffectContext, action: Action): boolean {
  if (
    action.condition?.kind !== undefined &&
    action.condition.kind !== "raw" &&
    !evaluateCondition(ctx, action.condition)
  ) {
    return false;
  }
  if (action.cost !== undefined && !canPayCost(ctx, action.cost)) return false;
  if (action.kind === "Digivolve") return canAttemptDigivolve(ctx, action);
  if (action.kind === "DnaDigivolve") return canAttemptDnaDigivolve(ctx, action);
  return action.kind !== "RawUnparsed";
}

/** ST23-05: optional trash of a most-security player's top, then ＜Recovery +N＞. */
async function runRecoverByTrashingMostSecurity(
  ctx: EffectContext,
  action: Extract<Action, { kind: "RecoverByTrashingMostSecurity" }>,
): Promise<void> {
  const mine = ctx.source.ownerSeat;
  const { trashed } = await ctx.fx.trashTopSecurityOfPlayerWithMostSecurity(mine);
  if (trashed.length === 0) return;
  if (action.recover !== false) await ctx.fx.recoverToSecurity(mine, action.amount ?? 1);
}

/** Security-stack manipulation: shuffle / trash top N / place cards as security. */
async function runSecurityManipulation(
  ctx: EffectContext,
  action: Extract<Action, { kind: "SecurityManipulation" }>,
): Promise<void> {
  const mine = ctx.source.ownerSeat;
  const opp = ctx.game.opponentOf(mine);
  const seat = action.controller === "opponent" ? opp : mine;
  // "both players' security": apply the op to each seat's stack (e.g. BT3-090 trashes
  // 1 from the top of each player's security).
  if (action.bothPlayers && (action.op === "trashTop" || action.op === "trash" || action.op === "shuffle")) {
    for (const s of [mine, opp]) {
      if (action.op === "trashTop" || action.op === "trash")
        await ctx.fx.trashFromSecurity(s, action.amount ?? 1, { fromTop: true });
      else ctx.fx.shuffleSecurity(s);
    }
    return;
  }
  if (action.optionalFor !== undefined) {
    const optionalSeat = action.optionalFor === "opponent" ? opp : mine;
    const decisionCtx =
      optionalSeat === ctx.source.ownerSeat ? ctx : { ...ctx, source: { ...ctx.source, ownerSeat: optionalSeat } };
    const accepted = await ctx.ask.optional(decisionCtx, describeAction(action));
    if (!accepted) {
      ctx.lastEffectActed = false;
      if (action.bindResultAs) {
        if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
        ctx.boundPlayed!.set(action.bindResultAs, new Set());
      }
      return;
    }
  }
  switch (action.op) {
    case "shuffle":
      ctx.fx.shuffleSecurity(seat);
      return;
    case "trash": // alias for trashTop — "trash top security" (BT18-101)
    case "trashTop": {
      const baseAmount = action.amount ?? 1;
      const scaledAmount =
        action.scaling === undefined
          ? baseAmount
          : action.scaling.bonus !== undefined
            ? baseAmount + action.scaling.bonus * scaleFactor(ctx, action.scaling)
            : baseAmount * scaleFactor(ctx, action.scaling);
      const maximum =
        action.leaveCount !== undefined
          ? Math.max(0, ctx.game.player(seat).security.length - action.leaveCount)
          : scaledAmount;
      const amount =
        action.upTo === true && maximum > 0
          ? await ctx.ask.chooseOption(
              ctx,
              Array.from(
                { length: maximum + 1 },
                (_, count) => `Trash ${count} security card${count === 1 ? "" : "s"}`,
              ),
            )
          : maximum;
      if (amount <= 0) {
        ctx.lastEffectActed = false;
        if (action.bindResultAs) {
          if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
          ctx.boundPlayed!.set(action.bindResultAs, new Set());
        }
        return;
      }
      let selectedSecurityIds: string[] | undefined;
      if (action.source === "reveal") {
        const security = ctx.game.player(seat).security;
        const candidates = security.map((card) => card.instanceId);
        const count = Math.min(amount, candidates.length);
        selectedSecurityIds =
          count > 0
            ? await ctx.ask.selectCards(ctx, {
                candidates,
                min: count,
                max: count,
                visible: candidates,
              })
            : [];
      }
      const trashed = await ctx.fx.trashFromSecurity(seat, amount, {
        fromTop: true,
        ...(selectedSecurityIds !== undefined ? { instanceIds: selectedSecurityIds } : {}),
      });
      ctx.lastEffectActed = trashed.length > 0;
      if (action.trackCount !== undefined) {
        ctx.namedCounts ??= new Map();
        ctx.namedCounts.set(action.trackCount, trashed.length);
      }
      if (action.bindResultAs) {
        if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
        ctx.boundPlayed!.set(action.bindResultAs, new Set(trashed.map((c) => c.instanceId)));
      }
      return;
    }
    case "toHand": {
      const amount = action.amount ?? 1;
      let moved;
      if (action.chooseFromSecurity) {
        const visibleSecurity = looseCardsInZone(ctx, seat, "security");
        const candidates = visibleSecurity
          .filter(
            (card) =>
              action.selectionFilter === undefined ||
              definitionMatches(
                action.selectionFilter,
                ctx.game.definitionOf({ cardId: card.cardId } as never) as DefinitionFacts,
              ),
          )
          .map((card) => card.instanceId);
        const chosen =
          candidates.length === 0
            ? []
            : visibleSecurity.length <= amount && candidates.length <= amount
              ? candidates.slice(0, amount)
              : await ctx.ask.selectCards(ctx, {
                  candidates,
                  min: Math.min(amount, candidates.length),
                  max: Math.min(amount, candidates.length),
                  // A security search reveals the whole private zone to its owner even when
                  // only a subset is eligible. Keep the full visible set distinct from the
                  // candidates so the UI can render non-matching cards disabled (BT7-088).
                  visible: visibleSecurity.map((card) => card.instanceId),
                  visibleCards: visibleSecurity.map((card) => ({
                    instanceId: card.instanceId,
                    cardId: card.cardId,
                  })),
                });
        moved = await ctx.fx.securityToHand(seat, amount, { instanceIds: chosen });
      } else {
        moved = await ctx.fx.securityToHand(seat, amount, { fromTop: action.toTop ?? true });
      }
      ctx.lastEffectActed = moved.length > 0;
      if (action.bindResultAs) {
        if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
        ctx.boundPlayed!.set(action.bindResultAs, new Set(moved.map((c) => c.instanceId)));
      }
      return;
    }
    case "lookAndMayAddToHand": {
      // The card remains face-down in the same top position when declined (BT9-034 Q1833),
      // so there is no temporary zone move to undo. The owning player can inspect their private
      // security stack before answering; no information is exposed to the opponent.
      if (ctx.game.player(seat).security[0] === undefined) return;
      const addToHand = await ctx.ask.optional(ctx, "Add the top security card to your hand?");
      const branch = addToHand ? action.ifAddedToHand : action.ifNotAddedToHand;
      if (addToHand) {
        await ctx.fx.securityToHand(seat, 1, { fromTop: true });
      } else {
        // Q1833 explicitly returns the card face-down, including when another effect
        // had already left the top security card face-up.
        ctx.game.player(seat).security[0]!.faceUp = false;
      }
      for (const followUp of branch ?? []) {
        const abort = await runAction(ctx, followUp);
        if (abort) break;
      }
      return;
    }
    case "flipFaceUp":
      // Flip the first FACE-DOWN security card of the targeted stack face up (EX11-064).
      ctx.fx.flipSecurityFaceUp(seat, { fromTop: true });
      return;
    case "placeAsSecurity": {
      // Place cards onto the security stack. Two source shapes:
      //  - LOOSE source ("place 1 card from your hand/trash/deck as security"): resolve
      //    the candidate loose instances by filter across the stated zones, prompt the
      //    controller, and add the chosen instances directly.
      //  - FIELD source ("place 1 of your Digimon ... on top of security"): resolve the
      //    permanents and add their top-card instances.
      const fromLoose =
        action.from && (action.from.includes("hand") || action.from.includes("trash") || action.from.includes("deck"));
      if (fromLoose) {
        if (action.source === undefined || typeof action.source === "string") {
          unsupported(ctx, action, "SecurityManipulation placeAsSecurity from a loose zone without a source target");
          return;
        }
        const zones = action.from!.filter((z): z is ZoneRef => z === "hand" || z === "trash" || z === "deck");
        const sourceScale = action.scaling === undefined ? 1 : scaleFactor(ctx, action.scaling);
        const baseCount = action.source.count === "all" ? "all" : action.source.count;
        const scaledSource = baseCount === "all" ? action.source : { ...action.source, count: baseCount * sourceScale };
        const candidates = candidateLooseInstances(ctx, scaledSource, zones);
        const chosen = await pickLoose(ctx, scaledSource, candidates);
        if (chosen.length > 0)
          await ctx.fx.addSecurity(seat, chosen, { toTop: action.toTop ?? true, faceUp: action.faceUp });
        return;
      }
      if (action.source === undefined) {
        // Self form: the resolving card becomes security (common on [Security] effects).
        await ctx.fx.addSecurity(seat, [ctx.source.instanceId], {
          toTop: action.toTop ?? true,
          faceUp: action.faceUp,
        });
        return;
      }
      if (typeof action.source === "string") {
        unsupported(ctx, action, `SecurityManipulation placeAsSecurity source ${action.source} unsupported`);
        return;
      }
      const ids = topInstanceIds(ctx, await resolvePermanentTargets(ctx, action.source));
      if (ids.length === 0) return;
      await ctx.fx.addSecurity(seat, ids, {
        toTop: action.toTop ?? true,
        faceUp: action.faceUp,
        detachPermanentTop: action.detachPermanentTop,
      });
      return;
    }
    case "addTop":
    case "addBottom":
    case "addTopOrBottom": {
      // Checked AFTER the cost above is paid — a `postCostCondition` gates only the Recovery
      // itself, not the right to pay the cost (EX9-029 KB Q4783).
      if (action.postCostCondition && !evaluateCondition(ctx, action.postCostCondition)) return;
      await runSecurityAdd(ctx, action, seat);
      return;
    }
    case "revealTop":
    case "revealBottom": {
      // "Reveal the top/bottom card of <controller>'s security stack" (RB1-027 / P-078):
      // the card flips face up IN PLACE (revealed to both players; it stays in security).
      // The same effects later place it back face down — the `source:"revealed"` add in
      // runSecurityAdd flips it back.
      ctx.fx.flipSecurityFaceUp(seat, { fromTop: action.op === "revealTop" });
      return;
    }
    case "flipUp": {
      // "Flip <controller>'s top face-down security card face up" (EX11-041/-043),
      // `amount` times (one card per flip, scanning from the top).
      const n = action.amount ?? 1;
      for (let i = 0; i < n; i++) ctx.fx.flipSecurityFaceUp(seat, { fromTop: true });
      return;
    }
    default:
      unsupported(ctx, action, `SecurityManipulation op ${String(action.op)} unsupported`);
      return;
  }
}

/**
 * SecurityManipulation addTop / addBottom / addTopOrBottom: place card(s) onto the
 * targeted security stack. The compiled IR's `source` is loosely typed across compiler
 * generations, so every observed shape is resolved here:
 *   - undefined / "deck"        → deck top onto the security top (the ＜Recovery＞ shape,
 *                                  5-card cap — EX2-018 Q3304),
 *   - "this" / self-Target      → the resolving card itself (BT18-098 / P-181 / EX9-021),
 *   - "hand" / "handOrTrash"    → loose pick by the action-level `filter` (BT25-037 /
 *                                  BT19-036 / EX11-034),
 *   - Target with loose zones   → loose pick across the filter's stated zones (BT19-096),
 *   - field Target              → a battle-area permanent placed as security (EX11-016 /
 *                                  BT23-102), via its top-card instance like placeAsSecurity,
 *   - "revealed"                → the card revealed by a prior revealTop never left the
 *                                  top of the stack; re-placing it face down is a flip-back.
 * Context-bound sources this cannot resolve ("rest", "digimonTopCard") stay loud gaps.
 */
async function runSecurityAdd(
  ctx: EffectContext,
  action: Extract<Action, { kind: "SecurityManipulation" }>,
  seat: Seat,
): Promise<void> {
  const source = (action as { source?: Target | string }).source;
  const actionFilter = (action as { filter?: Filter }).filter;
  const toTop =
    action.op === "addTop"
      ? true
      : action.op === "addBottom"
        ? false
        : (await ctx.ask.chooseOption(ctx, ["Top of security", "Bottom of security"])) === 0;
  const opts = { toTop, faceUp: action.faceUp };
  const baseCount = action.amount ?? 1;
  const count = action.scaling === undefined ? baseCount : baseCount * scaleFactor(ctx, action.scaling);
  const ownController = action.controller === "opponent" ? ("opponent" as const) : ("mine" as const);

  if (source === "revealed") {
    ctx.fx.flipTopSecurity(seat);
    return;
  }
  if (source === "rest") {
    // Full-stack reveal effects (BT10-086) never remove the unchosen cards from security.
    // Returning "the rest" means hiding those same cards again before the following shuffle.
    for (const card of ctx.game.player(seat).security) card.faceUp = false;
    return;
  }
  // `fromDigivolutionTop: true` — take the top card of the SOURCE permanent's digivolution
  // stack (the card just under the top). BT20-055: "place the top card of this Digimon face-up
  // at the bottom of your security stack." Source is resolved via action.source filter (isSelfRef
  // → the watcher's own anchor permanent in the SubTrigger context).
  if ((action as { fromDigivolutionTop?: boolean }).fromDigivolutionTop === true) {
    const sourcePermanent =
      typeof source === "object" && source !== null
        ? ctx.game.permanentById((await resolvePermanentTargets(ctx, source as Target))[0] ?? "")
        : ctx.source.permanent();
    if (sourcePermanent === undefined) return;
    const topDigivolveCard = sourcePermanent.stack[sourcePermanent.stack.length - 1];
    if (topDigivolveCard === undefined) return; // empty digivolution stack; nothing to place
    await ctx.fx.addSecurity(seat, [topDigivolveCard.instanceId], opts);
    return;
  }
  if (
    source === "this" ||
    (typeof source === "object" && source !== null && (source.isSelf || source.filter?.isSelfRef))
  ) {
    await ctx.fx.addSecurity(seat, [ctx.source.instanceId], opts);
    return;
  }
  if (source === undefined || source === "deck") {
    if (!toTop) {
      unsupported(ctx, action, `SecurityManipulation ${action.op} from the deck to the bottom unsupported`);
      return;
    }
    await ctx.fx.recoverToSecurity(seat, count);
    return;
  }
  if (source === "hand" || source === "handOrTrash") {
    const zones: ZoneRef[] = source === "hand" ? ["hand"] : ["hand", "trash"];
    const target: Target = {
      filter: { controllerDefault: ownController, ...(actionFilter ?? {}) },
      count,
      upTo: action.optional === true,
    };
    const candidates = candidateLooseInstances(ctx, target, zones);
    const chosen = await pickLoose(ctx, target, candidates);
    if (chosen.length > 0) await ctx.fx.addSecurity(seat, chosen, opts);
    return;
  }
  if (typeof source === "object" && source !== null) {
    const filterZones = source.filter as { zone?: ZoneRef | ZoneRef[]; location?: ZoneRef[] };
    const zones = ([] as ZoneRef[])
      .concat(filterZones.zone ?? [])
      .concat(filterZones.location ?? [])
      .filter((z) => z === "hand" || z === "trash" || z === "deck" || z === "digivolutionCards");
    if (zones.length > 0) {
      const candidates = candidateLooseInstances(ctx, source, zones);
      const chosen = await pickLoose(ctx, source, candidates);
      if (chosen.length > 0) await ctx.fx.addSecurity(seat, chosen, opts);
      return;
    }
    const ids = topInstanceIds(ctx, await resolvePermanentTargets(ctx, source));
    if (ids.length > 0) await ctx.fx.addSecurity(seat, ids, opts);
    return;
  }
  unsupported(ctx, action, `SecurityManipulation ${action.op} source ${String(source)} unsupported`);
}

/** A foreign card eligible to lend a borrowed effect (its instance + the borrowable effects). */
interface ForeignCandidate {
  instanceId: string;
  cardId: string;
  permanentId?: string;
  borrowable: CardEffect[];
}

/**
 * Collect the foreign cards whose compiled [On Play]/[When Digivolving] effects this card
 * may borrow, from the requested zone, filtered by `filter`. Only face-up cards qualify
 * (a face-down security card / flipped digivolution card has no readable effect; source
 * `!cardSource.IsFlipped`). A card with no matching borrowable effect is skipped.
 */
function collectForeignCandidates(
  ctx: EffectContext,
  action: Extract<Action, { kind: "ActivateForeignEffect" }>,
): ForeignCandidate[] {
  const mine = ctx.source.ownerSeat;
  const seat = action.filter.controller === "opponent" ? ctx.game.opponentOf(mine) : mine;
  const player = ctx.game.player(seat);

  const sources: { instanceId: string; cardId: string; permanentId?: string }[] = [];
  if (action.zone === "security") {
    for (const card of player.security)
      if (card.faceUp) sources.push({ instanceId: card.instanceId, cardId: card.cardId });
  } else if (action.zone === "digivolutionCards") {
    // The activating Digimon's OWN digivolution stack (EX8-054: "in this Digimon's
    // digivolution cards"). A flipped (face-down) stack card is excluded.
    const self = ctx.source.permanent();
    if (self !== undefined) {
      for (const card of self.stack)
        if (card.faceUp) sources.push({ instanceId: card.instanceId, cardId: card.cardId });
    }
  } else {
    // battleArea: a battle-area permanent's TOP card the right seat controls (BT24-102:
    // "1 of your [Olympos XII] trait Digimon").
    const selfPermanentId = ctx.source.permanent()?.permanentId;
    for (const permanent of player.battleArea) {
      if (action.filter.isSelfRef === true && permanent.permanentId !== selfPermanentId) continue;
      if (action.filter.boundRef !== undefined) {
        const bound = ctx.boundPlayed?.get(action.filter.boundRef);
        const selected = ctx.selections?.get(action.filter.boundRef);
        if ((bound === undefined || !bound.has(permanent.permanentId)) && selected !== permanent.permanentId) continue;
      }
      const top = permanent.topCard;
      if (top !== undefined)
        sources.push({ instanceId: top.instanceId, cardId: top.cardId, permanentId: permanent.permanentId });
    }
  }

  const out: ForeignCandidate[] = [];
  for (const src of sources) {
    if (action.lastPlacedOnly === true && !(ctx.lastPlacedUnderInstanceIds ?? []).includes(src.instanceId)) continue;
    const def = ctx.game.definitionOf({ cardId: src.cardId } as never);
    if (def === undefined) continue;
    if (!definitionMatches(action.filter, def as unknown as DefinitionFacts)) continue;
    const compiled = runtimeCompiledCard(src.cardId);
    if (compiled === undefined) continue;
    // Borrowable = an [On Play]/[When Digivolving] effect (security effects are never
    // borrowable, source `!cardEffect.IsSecurityEffect`).
    const borrowable = compiled.effects.filter((e) => action.fromTriggers.includes(e.trigger) && e.isSecurity !== true);
    if (borrowable.length === 0) continue;
    out.push({ instanceId: src.instanceId, cardId: src.cardId, permanentId: src.permanentId, borrowable });
  }
  return out;
}

/**
 * Activate a NAMED other card's [On Play]/[When Digivolving] effect AS this Digimon's
 * effect (BT23-060 / BT24-102 / EX8-054). Server-authoritative: the engine enumerates
 * the eligible foreign cards, prompts the controller to pick one (and, when the chosen
 * card has more than one borrowable effect, which effect), then runs the borrowed
 * effect(s) under the ACTIVATING card's control/timing — `ctx.source` stays this card,
 * so controller-relative targets ("your opponent's Digimon") resolve from the activating
 * card's owner (source `selectedEffect.SetIsDigimonEffect(true)` + the activating card's
 * hashtable). The client never supplies the effect body; it only chooses among the
 * engine-resolved candidates (threat T-04-14).
 */
async function runActivateForeignEffect(
  ctx: EffectContext,
  action: Extract<Action, { kind: "ActivateForeignEffect" }>,
): Promise<void> {
  const candidates = collectForeignCandidates(ctx, action);
  if (candidates.length === 0) return;

  // Pick WHICH foreign card lends its effect.
  let chosen: ForeignCandidate | undefined;
  if (candidates.length === 1) {
    chosen = candidates[0];
  } else {
    const picked = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((c) => c.instanceId),
      min: 1,
      max: 1,
    });
    chosen = candidates.find((c) => c.instanceId === picked[0]);
  }
  if (chosen === undefined) return;

  // A borrowed timing effect is still that permanent's timing effect for suppression
  // purposes. Venusmon therefore prevents Seiken Meppa from activating Jesmon GX's
  // [When Digivolving] effect (BT10-110 Q2039), even though the Option initiated it.
  if (
    chosen.permanentId !== undefined &&
    action.fromTriggers.includes("WhenDigivolving") &&
    (ctx.fx.isTimingEffectDisabled?.(chosen.permanentId, "whenDigivolving") ??
      ctx.game.isTimingEffectDisabled?.(chosen.permanentId, "whenDigivolving")) === true
  ) {
    return;
  }

  // When the chosen card has multiple borrowable effects, the controller picks which one
  // (source's second select over the candidate effects). With exactly one, auto-resolve.
  let toRun: CardEffect[];
  if (chosen.borrowable.length <= 1) {
    toRun = chosen.borrowable;
  } else {
    const labels = chosen.borrowable.map((e) => describeEffect(e));
    const idx = await ctx.ask.chooseOption(ctx, labels);
    const picked = chosen.borrowable[idx];
    toRun = picked ? [picked] : [];
  }

  // Run the borrowed effect(s) as THIS card's effect (ctx.source unchanged). The borrowed
  // CardEffect resolves through the same `runEffect` path the original card would use, but
  // bound to the activating card's source — so timing, control and targeting are this
  // Digimon's, not the lender's.
  let runCtx = ctx;
  if (action.useLenderAsSource === true && chosen.permanentId !== undefined) {
    const permanentId = chosen.permanentId;
    const definition = ctx.game.definitionOf({ cardId: chosen.cardId } as never);
    runCtx = {
      ...ctx,
      source: {
        instanceId: chosen.instanceId,
        cardId: chosen.cardId,
        ownerSeat: ctx.source.ownerSeat,
        definition,
        permanent: () => ctx.game.permanentById(permanentId),
        isOnBattleArea: () => ctx.game.permanentById(permanentId) !== undefined,
        isOwnersTurn: () => ctx.game.state.turnSeat === ctx.source.ownerSeat,
        hasColor: (color) => definition.colors.includes(color),
      },
    };
  }
  for (const eff of toRun.slice(0, action.count)) await runEffect(runCtx, eff);
}

const BORROWABLE_EFFECT_TRIGGERS: readonly EffectTrigger[] = ["OnPlay", "WhenDigivolving"];

async function runActivateEffect(
  ctx: EffectContext,
  action: Extract<Action, { kind: "ActivateEffect" }>,
): Promise<void> {
  const trigger = action.effectType;
  if (action.target === undefined || !BORROWABLE_EFFECT_TRIGGERS.includes(trigger as EffectTrigger)) {
    unsupported(ctx, action, `legacy ActivateEffect payload is not specific enough to normalize`);
    return;
  }
  const filter = { ...(action.target.filter ?? {}) };
  if (filter.controller === undefined && filter.controllerDefault !== undefined) {
    filter.controller = filter.controllerDefault;
  }
  const targetCount = typeof action.target.count === "number" ? action.target.count : 1;
  await runActivateForeignEffect(ctx, {
    ...action,
    kind: "ActivateForeignEffect",
    zone: filter.zone === "digivolutionCards" ? "digivolutionCards" : "battleArea",
    fromTriggers: [trigger as EffectTrigger],
    filter,
    count: action.count ?? targetCount,
    lastPlacedOnly: action.lastPlacedOnly,
    useLenderAsSource: action.useLenderAsSource,
  });
}

/**
 * "Use 1 [Option] card from your hand without paying the cost" (EX8-037 / BT15-092 / BT16-094 /
 * BT19-040). Server-authoritative and a sibling of `runActivateForeignEffect`: the engine
 * enumerates the eligible Options server-side, prompts the controller to pick WHICH one (the use
 * is optional — source `canNoSelect: true`), then hands off to `ctx.fx.useOptionFromHand`,
 * which resolves that Option's [Main] effect under the USING card's control/timing (`ctx.source`
 * unchanged).
 * The client supplies only the choice among the engine-resolved candidates — never an effect body
 * (threat T-08-10/11). Eligibility (single-color, cost-<=5, not under a CanNotPlayThisOption
 * restriction) is the SERVER predicate (T-08-11). The Option is not a permanent, so it resolves
 * then goes to trash (the `playInstances` `isPermanentKind` gap). The use RESULT binds on
 * `ctx.lastOptionUsed` at use-time (KB EX8-037 Q4738) so an `ifThisEffectUsed` tail can gate.
 */
async function runUseOptionWithoutCost(
  ctx: EffectContext,
  action: Extract<Action, { kind: "UseOptionWithoutCost" }>,
): Promise<void> {
  // Bind the use OUTCOME on ctx up-front: false until an Option is actually used (read by a
  // subsequent "if this effect used" Condition; KB EX8-037 Q3923/Q4737).
  ctx.lastOptionUsed = false;

  const seat = ctx.source.ownerSeat; // the printed form is always "from YOUR hand"
  // Resolve source zones: `action.from` (top-level) or `action.target.from` (wrapped form).
  const zones: ZoneRef[] =
    (action.from?.length ?? 0) > 0
      ? (action.from as ZoneRef[])
      : (action.target?.from?.length ?? 0) > 0
        ? (action.target!.from as ZoneRef[])
        : (["hand"] as ZoneRef[]);

  // Resolve the eligibility filter: top-level `action.filter` (BT19-040 / EX8-037) or
  // `action.target.filter` (BT10-039 / BT21-062 / BT24-085 / EX4-030 / ST22-07 / BT10-041).
  // EX2-060 has neither (a minimal "any Option" shape); undefined = no filter, all Options pass.
  const filter = (action as { filter?: Filter }).filter ?? action.target?.filter;

  // Cost cap: honor playCostLte from the resolved filter; fall back to 5 (historical EX8-037 default).
  const exactCosts = filter?.playCostOneOf ?? [];
  const costCap = filter?.playCostLte ?? (exactCosts.length > 0 ? Math.max(...exactCosts) : 5);
  // Server-side eligibility: a single-color Option within the cost cap matching the filter, not
  // under a CanNotPlayThisOption play restriction.
  const candidates: string[] = [];
  for (const zone of zones) {
    for (const cand of looseCardsInZone(ctx, seat, zone as ZoneRef)) {
      if (candidates.includes(cand.instanceId)) continue;
      const def = ctx.game.definitionOf({ cardId: cand.cardId } as never);
      if (filter !== undefined && !definitionMatches(filter, def)) continue;
      if (!def.kinds.includes(CardKind.Option)) continue;
      if (def.colors.length !== 1) continue;
      if (def.playCost > costCap) continue;
      if (ctx.fx.isPlayProhibited?.(seat, cand.cardId, "play") === true) continue;
      candidates.push(cand.instanceId);
    }
  }
  if (candidates.length === 0) return;

  // The controller picks WHICH eligible Option (the use is optional: min 0). The client can only
  // name an engine-offered candidate; it never injects an effect.
  const picked = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
  const chosenId = picked[0];
  if (chosenId === undefined || !candidates.includes(chosenId)) return;

  // Fetch the chosen Option's compiled [Main] effect SERVER-SIDE and run it under THIS card's
  // control (ctx.source unchanged — same pattern as the borrowed-effect run). Options carry their
  // active effect on the `Main` trigger.
  // Resolve the pick from the SAME zone set used to build the candidates — `action.from` may name
  // a non-hand zone (e.g. ["trash"]), so retrieving from "hand" only would drop a non-hand pick's
  // borrowed effect while still trashing the card and setting lastOptionUsed (WR-02).
  const chosenCard = zones
    .flatMap((z) => looseCardsInZone(ctx, seat, z as ZoneRef))
    .find((c) => c.instanceId === chosenId);

  // Pay cost before running the effect (mirrors normal Option use flow). The ORIGINAL printed
  // cost is used for the whenOptionUsed watcher gate (KB Q5471-Q5473), not the reduced value.
  if (action.payCost === true && chosenCard !== undefined) {
    const chosenDef = ctx.game.definitionOf({ cardId: chosenCard.cardId } as never);
    const reducedCost = Math.max(0, chosenDef.playCost - (action.reduceCostBy ?? 0));
    if (reducedCost > 0) ctx.fx.gainMemory(-reducedCost);
  }

  // Effect resolution + lifecycle (trash the Option, fire whenOptionUsed) both now live behind
  // `ctx.fx.useOptionFromHand` (primitives.ts), which resolves the chosen card's registered
  // EffectModule for EffectTiming.OnUseOption itself — via the shared registry, so it covers a
  // hand-written module too, not just IR-compiled ones (the old inline `getCompiledCard` +
  // `runEffect` here never ran a hand-written Option's effect). Bind the use result TRUE at
  // use-time — Q4738: bound even if the Option's effect digivolved the source away. Carry the
  // Option's ORIGINAL use cost so a whenOptionUsed watcher can gate on "a cost of 2 or more"
  // (BT19-040; KB Q5471-Q5473 read the cost itself, not the paid/reduced value).
  const usedCost = chosenCard ? ctx.game.definitionOf({ cardId: chosenCard.cardId } as never).playCost : undefined;
  await ctx.fx.useOptionFromHand(ctx, chosenId, usedCost);
  ctx.lastOptionUsed = true;
}

/**
 * Effect-driven digivolve ("this Digimon may digivolve into [X] in the hand without
 * paying the cost"). `target` is the permanent that digivolves (self or a filtered
 * battle-area Digimon); `into` is the filter for the card to play from the controller's
 * hand/trash. Resolve the digivolving permanent and the source card, then stack it via
 * the digivolve-from-effect primitive.
 */
/**
 * Is `instanceId` a security card that is currently FACE DOWN? Scans both players' security
 * stacks; a card found face-up (or not in any security stack at all, e.g. a hand/trash source)
 * returns false. Used to exclude face-down security cards from a face-up-security digivolve
 * source.
 */
function isFaceDownSecurityCard(ctx: EffectContext, instanceId: string): boolean {
  for (const player of ctx.game.state.players) {
    const card = player.security.find((c) => c.instanceId === instanceId);
    if (card !== undefined) return card.faceUp !== true;
  }
  return false;
}

/**
 * The subset of `pool` that `basePermanentId` may legally digivolve into.
 *
 * Unless requirements are explicitly waived, the base must satisfy the into-card's digivolution
 * requirement (printed EvoCost color+level, or an alternate trait/name/level path) — this holds
 * whether or not the digivolution cost is paid: waiving the memory cost ("without paying the
 * cost") does NOT waive the requirement; only "ignoring its digivolution requirements" does.
 * Without this gate the `into` filter alone (a trait/name match like "[Titan]") would offer
 * level-illegal targets — e.g. a Lv.6 base digivolving into a Lv.4 [Titan] from the trash
 * (BT24-009's inherited path). Mirrors the authoritative gate in digivolveFromInstance; the
 * selection prompt must not present picks the primitive will reject server-side.
 */
function legalIntoCandidates(
  ctx: EffectContext,
  basePermanentId: string,
  pool: LooseCandidate[],
  enforceRequirements: boolean,
  digivolutionCostMax?: number,
): LooseCandidate[] {
  const base = ctx.game.permanentById(basePermanentId);
  const baseDef = base?.topCard ? ctx.game.definitionOf(base.topCard) : undefined;
  // Only filter when the base carries a level: a level-less base satisfies no level-gated
  // requirement (Q4242), and the requirement match is meaningless without it.
  //
  // KNOWN GAP: a Tamer base is level-less, so this skips the filter and offers every
  // `into`-matching card — including Hybrids with no Tamer path, which `digivolveFromInstance`
  // then refuses. Tightening it (filter level-less bases by the alternate requirement when
  // `pays`) is correct but currently fails three tests whose fake definitions omit `level`
  // (BT19-084 x2, BT25-026); those fakes model real leveled Digimon and need fixing first.
  if (baseDef === undefined || baseDef.level === undefined) return pool;
  return pool.filter((c) => {
    const intoDef = ctx.game.definitionOf({ cardId: c.cardId } as never);
    const ordinary = matchingEvoCost(intoDef, baseDef);
    const alternate = matchingAlternateDigivolutionRequirement(intoDef, baseDef);
    if (enforceRequirements && ordinary === undefined && alternate === undefined) return false;
    if (digivolutionCostMax === undefined) return true;
    return [ordinary?.memoryCost, alternate?.cost].some((cost) => cost !== undefined && cost <= digivolutionCostMax);
  });
}

/** Normalize both accepted IR encodings for an effect-driven digivolution destination. */
function digivolveIntoTarget(action: Extract<Action, { kind: "Digivolve" }>): Target | undefined {
  if (action.into === undefined) return undefined;
  const encoded = action.into as Filter | Target;
  return "filter" in encoded
    ? ({ ...encoded, count: encoded.count ?? 1 } as Target)
    : { filter: encoded as Filter, count: 1 };
}

/**
 * Synchronous preflight for an optional effect-driven digivolution. It mirrors the source
 * zones, destination filter and printed-requirement gate used by runDigivolve, but opens no
 * target/card decisions. The resolver remains authoritative for payment and mutation.
 */
function canAttemptDigivolve(ctx: EffectContext, action: Extract<Action, { kind: "Digivolve" }>): boolean {
  if (!action.target) return false;
  const intoTarget = digivolveIntoTarget(action);
  if (intoTarget === undefined) return false;
  const zones: ZoneRef[] = action.from ?? ["hand", "trash"];
  let pool = candidateLooseInstances(ctx, intoTarget, zones);
  if (action.amongPreviousSearch) {
    const searched = new Set((ctx.lastRevealedCards ?? []).map((card) => card.instanceId));
    pool = pool.filter((candidate) => searched.has(candidate.instanceId));
  }
  if (zones.includes("security") && action.faceDownSecurityOk !== true) {
    pool = pool.filter((candidate) => !isFaceDownSecurityCard(ctx, candidate.instanceId));
  }
  if (pool.length === 0) return false;

  const requestedIgnoreRequirements =
    action.ignoreReqs === true ||
    action.ignoreRequirements === true ||
    action.ignoreDigivolutionRequirements === true ||
    action.ignoreLevelRequirement === true;
  const enforceRequirements = !(
    requestedIgnoreRequirements && ctx.fx.isDigivolutionRequirementIgnoreBlocked?.(ctx.source.ownerSeat) !== true
  );
  const hasLegalDestination = (permanentId: string): boolean => {
    let candidates = pool;
    if (action.colorsMatchDigivolvingSource === true) {
      const base = ctx.game.permanentById(permanentId);
      const baseColors = base?.topCard ? ctx.game.definitionOf(base.topCard).colors : [];
      candidates = candidates.filter((candidate) => {
        const intoColors = ctx.game.definitionOf({ cardId: candidate.cardId } as never).colors;
        return baseColors.some((color) => intoColors.includes(color));
      });
    }
    return (
      legalIntoCandidates(ctx, permanentId, candidates, enforceRequirements, intoTarget.filter.digivolutionCostMax)
        .length > 0
    );
  };

  if (action.target.targetBreeding === true) {
    const breeding = ctx.game.player(ctx.source.ownerSeat).breeding;
    return breeding !== undefined && hasLegalDestination(breeding.permanentId);
  }
  return candidatePermanents(ctx, action.target).some((permanent) => hasLegalDestination(permanent.permanentId));
}

/** Cards the controller can see in the source zones while choosing what to digivolve into. */
function visibleDigivolveSourceIds(
  ctx: EffectContext,
  action: Extract<Action, { kind: "Digivolve" }>,
  zones: ZoneRef[],
): string[] {
  let visible = candidateLooseInstances(ctx, { filter: { controllerDefault: "mine" }, count: "all" }, zones);
  if (action.amongPreviousSearch) {
    const searched = new Set((ctx.lastRevealedCards ?? []).map((card) => card.instanceId));
    visible = visible.filter((candidate) => searched.has(candidate.instanceId));
  }
  if (zones.includes("security") && action.faceDownSecurityOk !== true) {
    visible = visible.filter((candidate) => !isFaceDownSecurityCard(ctx, candidate.instanceId));
  }
  return visible.map(({ instanceId }) => instanceId);
}

async function runDigivolve(ctx: EffectContext, action: Extract<Action, { kind: "Digivolve" }>): Promise<void> {
  // Static metadata-only Digivolve actions that register alternate digivolution paths
  // (e.g. Frontier tamer-onto effects with `onto` + `asLevel`) carry no runtime `target`
  // and are consumed by registerTamerOntoFromEffects — never resolved.
  if (!action.target) return;

  // Bind the digivolve OUTCOME on ctx (effect-result binding): false until a digivolve actually
  // happens, read by a subsequent "then (if it digivolved)" Condition (KB BT19-084 Q3146-Q3150).
  ctx.lastDigivolveResult = false;

  // CAP-G3: targetBreeding — the digivolve base is the controller's breeding-area Digimon
  // (BT20-018 Ouryumon). Find the matching breeding permanent, move it to battle area via
  // movePermanentZone("toBattle"), then proceed with the standard digivolveFromInstance path.
  // KB Q4300: does NOT fire [When Digivolving] effects — the effect is a placement, not a
  // normal digivolve window; the interpreter skips the digivolving-trigger chain here.
  if (action.target.targetBreeding === true) {
    const mine = ctx.source.ownerSeat;
    const breedingPerm = ctx.game.player(mine).breeding;
    if (breedingPerm === undefined || breedingPerm.topCard === undefined) return;
    // Filter check: does the breeding permanent satisfy the target filter?
    if (action.target.filter !== undefined) {
      const filterKinds = action.target.filter.kind;
      if (filterKinds !== undefined) {
        const topDef = ctx.game.definitionOf(breedingPerm.topCard);
        const matchesKind = filterKinds.some((k) => topDef.kinds.includes(k as never));
        if (!matchesKind) return;
      }
    }
    const moved = await ctx.fx.movePermanentZone(breedingPerm.permanentId, "toBattle");
    if (!moved) return;
    // The breeding permanent is now in battle area; proceed as a standard Digivolve from here.
    // (permanentIds will be the moved permanent's id)
    const pid = breedingPerm.permanentId;
    const intoTarget = digivolveIntoTarget(action);
    if (intoTarget === undefined) {
      unsupported(ctx, action, "Digivolve without an `into` filter (what to digivolve into) is unresolvable");
      return;
    }
    const zones: ZoneRef[] = action.from ?? ["hand", "trash"];
    const pays = action.payCost === true;
    const numericPayCost = typeof action.payCost === "number" ? (action.payCost as number) : undefined;
    const costOverride = action.costOverride ?? numericPayCost;
    const requestedIgnoreRequirements =
      action.ignoreReqs === true ||
      action.ignoreRequirements === true ||
      action.ignoreDigivolutionRequirements === true;
    const ignoreRequirements =
      requestedIgnoreRequirements && ctx.fx.isDigivolutionRequirementIgnoreBlocked?.(ctx.source.ownerSeat) !== true;
    const candidates = legalIntoCandidates(
      ctx,
      pid,
      candidateLooseInstances(ctx, intoTarget, zones),
      !ignoreRequirements,
      intoTarget.filter.digivolutionCostMax,
    );
    if (candidates.length === 0) return;
    const chosen = action.optional
      ? await pickLoose(
          ctx,
          { ...intoTarget, upTo: true },
          candidates,
          undefined,
          ctx.ask,
          visibleDigivolveSourceIds(ctx, action, zones),
        )
      : await pickLoose(ctx, intoTarget, candidates, undefined, ctx.ask, visibleDigivolveSourceIds(ctx, action, zones));
    if (chosen.length === 0) return;
    const result = await ctx.fx.digivolveFromInstance(pid, chosen[0]!, {
      payCost: pays || numericPayCost !== undefined,
      costOverride,
      ignoreRequirements,
    });
    if (result !== undefined) {
      ctx.lastDigivolveResult = true;
      if (action.bindResultAs) {
        if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
        ctx.boundPlayed!.set(action.bindResultAs, new Set([result.permanentId]));
      }
    }
    return;
  }

  // The card to digivolve into is a loose card matching `into` in the controller's
  // hand (the common "in the hand" form) or trash. `action.costDelta` (a digivolution-cost
  // reduction folded into the verb, e.g. "... for its digivolution cost -2") is forwarded
  // so the primitive lowers the paid cost. A missing `into` is only reported as unsupported
  // AFTER the targets resolve (below) — a metadata-only Digivolve that registers an alternate
  // path (BT7-047) carries no `into` and resolves no targets, and must not raise.
  const intoTarget = digivolveIntoTarget(action);
  // The digivolve-into card's source zone(s). Defaults to hand/trash; alternate-digivolve
  // cards declare their own (digivolutionCards under a Tamer, security, trash-only). The
  // loose-card enumerator already supports all of these.
  const zones: ZoneRef[] = action.from ?? ["hand", "trash"];
  // Face-up-security digivolve SOURCE (BT19-084 "digivolve into a Digimon card in your FACE-UP
  // security cards"): the loose-card enumerator returns every security card regardless of
  // orientation, but a digivolve may only consume a FACE-UP one (documented behavior `!cardSource.IsFlipped`,
  // documented behavior). When "security" is a source zone, drop face-down security candidates
  // here; other zones (hand/trash) are unaffected. (A2 resolved: candidateLooseInstances does
  // NOT face-up-filter "security" — looseCardsInZone collects the whole stack.)
  const sourcesSecurity = zones.includes("security");
  // controller may pick any security card regardless of orientation.
  const faceDownOk = action.faceDownSecurityOk === true;
  // `payCost` is normally a boolean, but a legacy prose-compiler encoding stores the fixed cost as
  // a NUMBER ("for a digivolution cost of N" -> payCost:N). Normalize: a numeric payCost means
  // "pay exactly N" (a costOverride), so the digivolve still pays.
  const numericPayCost = typeof action.payCost === "number" ? (action.payCost as number) : undefined;
  const pays = action.payCost === true || numericPayCost !== undefined;
  const costOverride = action.costOverride ?? numericPayCost;
  const requestedIgnoreRequirements =
    action.ignoreReqs === true ||
    action.ignoreRequirements === true ||
    action.ignoreDigivolutionRequirements === true ||
    action.ignoreLevelRequirement === true;
  const ignoreRequirements =
    requestedIgnoreRequirements && ctx.fx.isDigivolutionRequirementIgnoreBlocked?.(ctx.source.ownerSeat) !== true;
  const enforceRequirements = !ignoreRequirements;
  /** The `into` pool as it stands right now, before any base-specific legality. */
  const intoPool = (): LooseCandidate[] => {
    if (intoTarget === undefined) return [];
    let candidates = candidateLooseInstances(ctx, intoTarget, zones);
    if (action.amongPreviousSearch) {
      const searched = new Set((ctx.lastRevealedCards ?? []).map((card) => card.instanceId));
      candidates = candidates.filter((candidate) => searched.has(candidate.instanceId));
    }
    if (sourcesSecurity && !faceDownOk) {
      candidates = candidates.filter((c) => !isFaceDownSecurityCard(ctx, c.instanceId));
    }
    return candidates;
  };
  const legalIntoForBase = (basePermanentId: string, pool: LooseCandidate[]): LooseCandidate[] => {
    let candidates = pool;
    if (action.colorsMatchDigivolvingSource === true) {
      const base = ctx.game.permanentById(basePermanentId);
      const baseColors = base?.topCard ? ctx.game.definitionOf(base.topCard).colors : [];
      candidates = candidates.filter((candidate) => {
        const intoColors = ctx.game.definitionOf({ cardId: candidate.cardId } as never).colors;
        return baseColors.some((color) => intoColors.includes(color));
      });
    }
    return legalIntoCandidates(
      ctx,
      basePermanentId,
      candidates,
      enforceRequirements,
      intoTarget?.filter.digivolutionCostMax,
    );
  };
  // A base with no legal card to digivolve into must not be offered as a digivolve target:
  // choosing it silently consumes the (often optional, once-per-turn) effect and nothing
  // happens. The pool is snapshotted before the prompt — the same pool every base is later
  // filtered against — so the offer and the resolution agree.
  const availableIntoPool = intoPool();
  const permanentIds = await resolvePermanentTargets(ctx, action.target, {
    eligible: (pid) => intoTarget === undefined || legalIntoForBase(pid, availableIntoPool).length > 0,
  });
  if (permanentIds.length === 0) return;
  // `bindAs` on the digivolve TARGET records which Digimon was chosen to digivolve, so a
  // later action can act on that one specifically — "If you do, unsuspend that Digimon"
  // (BT8-110, KB Q1789: "only the Digimon you chose to digivolve will unsuspend"). Same
  // handle namespace `SelectBind` writes, which is what `fromSelectionRef` reads. The
  // permanent keeps its id across the digivolution, so the handle stays valid afterwards.
  // Only a card that sets the field is affected; every other Digivolve is untouched.
  if (action.target.bindAs !== undefined && ctx.selections) {
    ctx.selections.set(action.target.bindAs, permanentIds[0]!);
  }
  if (intoTarget === undefined) {
    unsupported(ctx, action, "Digivolve without an `into` filter (what to digivolve into) is unresolvable");
    return;
  }
  for (const pid of permanentIds) {
    // Re-read the pool per base: an earlier iteration consumed a card out of it.
    const candidates = legalIntoForBase(pid, intoPool());
    if (candidates.length === 0) continue;
    const chosen = await pickLoose(
      ctx,
      intoTarget,
      candidates,
      undefined,
      ctx.ask,
      visibleDigivolveSourceIds(ctx, action, zones),
    );
    if (chosen.length === 0) continue;
    // "Ignoring its level" preserves the printed digivolution COST for a matching-color
    // requirement; it only waives the requirement's source level. A full
    // ignoreRequirements call cannot derive that cost from the level-4 base, so recover it
    // from the chosen card's printed same-color evo-cost row (BT7-110).
    let resolvedCostOverride = costOverride;
    if (action.ignoreLevelRequirement === true && resolvedCostOverride === undefined) {
      const base = ctx.game.permanentById(pid);
      const chosenCandidate = candidates.find((candidate) => candidate.instanceId === chosen[0]);
      const intoDef = chosenCandidate ? ctx.game.definitionOf({ cardId: chosenCandidate.cardId } as never) : undefined;
      const baseColors = base?.topCard ? ctx.game.definitionOf(base.topCard).colors : [];
      const matchingCosts = (intoDef?.evoCosts ?? [])
        .filter((cost) => baseColors.includes(cost.color))
        .map((cost) => cost.memoryCost);
      if (matchingCosts.length > 0) resolvedCostOverride = Math.min(...matchingCosts);
    }
    // Older compiled IR carries the folded reduction as positive `reduceCost` (the
    // current runtime record emits the SIGNED `costDelta`); accept both so in-tree IR
    // stays effective. reduceCost is a reduction amount, so it negates into the delta.
    const reduceCost = (action as { reduceCost?: number }).reduceCost;
    const fixedDelta = action.costDelta ?? (reduceCost !== undefined ? -reduceCost : undefined);
    // A `reduceCostScaling` reduction is counted at resolution time and folded into the same
    // verb (BT21-082 "for each of your red Tamers with different names"), stacking with any
    // fixed delta. The board is counted per base so a multi-target digivolve re-reads it.
    const scaledReduction = action.reduceCostScaling ? scaleFactor(ctx, action.reduceCostScaling) : 0;
    const costDelta = scaledReduction > 0 ? (fixedDelta ?? 0) - scaledReduction : fixedDelta;
    const result = await ctx.fx.digivolveFromInstance(pid, chosen[0]!, {
      payCost: pays,
      costDelta,
      costOverride: resolvedCostOverride,
      ignoreRequirements,
    });
    if (result !== undefined) {
      ctx.lastDigivolveResult = true;
      if (action.bindResultAs) {
        if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
        ctx.boundPlayed!.set(action.bindResultAs, new Set([result.permanentId]));
      }
    }
  }
}

/**
 * Effect-driven DNA-digivolve. `materials` resolves to two-or-more battle-area
 * permanents (self + others, or a filtered set); `into` is the result card to play
 * from the controller's hand. Consume the materials and play the result on top.
 */
function dnaResultTarget(into: NonNullable<Extract<Action, { kind: "DnaDigivolve" }>["into"]>): Target {
  const encodedInto = into as Filter | Target;
  return "filter" in encodedInto ? (encodedInto as Target) : { filter: encodedInto as Filter, count: 1 };
}

async function runDnaDigivolve(ctx: EffectContext, action: Extract<Action, { kind: "DnaDigivolve" }>): Promise<void> {
  if (action.into === undefined) {
    unsupported(ctx, action, "DnaDigivolve without an `into` filter is unresolvable");
    return;
  }
  const intoTarget = dnaResultTarget(action.into);
  const { hasDnaDigivolutionRequirement: _dnaRequirement, ...visibleIntoFilter } = intoTarget.filter;
  const visibleIntoTarget: Target = { ...intoTarget, filter: visibleIntoFilter };
  const intoZone = intoTarget.filter.zone;
  const intoZones: ZoneRef[] =
    intoZone !== undefined ? [Array.isArray(intoZone) ? intoZone[0]! : (intoZone as ZoneRef)] : ["hand"];
  const resultPool = candidateLooseInstances(ctx, intoTarget, intoZones);
  const visibleResultPool = candidateLooseInstances(ctx, visibleIntoTarget, intoZones);

  // Resolve the material permanents. "this Digimon and 1 of your other Digimon" is the
  // common shape; the IR may carry only `isSelf` (self + an implied partner) — in that
  // case we also include the source so there are >=2 materials.
  //
  // `materials.filter.zone` can name a non-permanent zone (BT17-095/EX6-072: "1 card in the
  // hand" compiles to `materials.filter.zone: "hand"`) — resolvePermanentTargets only scans
  // battleArea/breeding and always returns empty for those, so the whole slot must instead
  // resolve the same way `looseMaterials` already does (candidateLooseInstances + pickLoose).
  let materialIds: string[] = [];
  let looseMaterialIds: string[] = [];
  if (Array.isArray(action.materials)) {
    // W7-E-2: per-slot zone specs — each entry resolves independently in its own zone
    // (e.g. EX6-072: 1 field Digimon + 1 hand card). Every slot contributes its own
    // materials; there is no isSelf/includeRef handling in this form.
    const fieldOnlySlots = action.materials.every(
      (slot) => slot.zone === undefined || slot.zone === "battleArea" || slot.zone === "breeding",
    );
    for (let slotIndex = 0; slotIndex < action.materials.length; slotIndex += 1) {
      const slot = action.materials[slotIndex]!;
      const slotTarget: Target = { ...slot, filter: slot.filter, count: slot.count } as Target;
      // An omitted zone is the normal printed "this Digimon / another Digimon in play"
      // shape (ST10-02/ST10-04), so it defaults to battle-area permanents. Only an explicit
      // loose zone (hand/trash/security/...) uses the loose-card resolver.
      if (slot.zone === undefined || slot.zone === "battleArea" || slot.zone === "breeding") {
        const wanted = typeof slot.count === "number" ? slot.count : 1;
        const eligible =
          fieldOnlySlots && wanted === 1
            ? (permanentId: string): boolean =>
                hasLegalDnaCompletion(
                  ctx,
                  action.materials as typeof action.materials & readonly DnaMaterialSlot[],
                  slotIndex + 1,
                  [...materialIds, permanentId],
                  resultPool,
                )
            : undefined;
        materialIds.push(...(await resolvePermanentTargets(ctx, slotTarget, eligible ? { eligible } : undefined)));
      } else {
        looseMaterialIds.push(
          ...(await pickLoose(ctx, slotTarget, candidateLooseInstances(ctx, slotTarget, [slot.zone]))),
        );
      }
    }
  } else {
    const materialsZone = action.materials.filter.zone;
    const materialsAreLoose =
      materialsZone !== undefined && materialsZone !== "battleArea" && materialsZone !== "breeding";
    materialIds = materialsAreLoose ? [] : await resolvePermanentTargets(ctx, action.materials);
    looseMaterialIds = materialsAreLoose
      ? await pickLoose(
          ctx,
          action.materials,
          candidateLooseInstances(ctx, action.materials, [materialsZone as ZoneRef]),
        )
      : [];
    if (
      !materialsAreLoose &&
      (action.materials.isSelf || action.materials.filter.isSelfRef || action.materials.filter.includesSelf)
    ) {
      // `includesSelf` on the materials filter: the source permanent is always one of the selected
      // materials (BT21-046 "this Digimon and any of your other Digimon"). Pre-fill self, then let
      // the controller pick the remaining count-1 partners from the rest of the filter (excluding self).
      const self = ctx.source.permanent();
      const remainingCount = Math.max(1, (typeof action.materials.count === "number" ? action.materials.count : 2) - 1);
      const others = await resolvePermanentTargets(ctx, {
        filter: {
          ...action.materials.filter,
          isSelfRef: undefined,
          includesSelf: undefined,
          excludeSelf: true,
        },
        count: remainingCount,
      });
      materialIds = [...(self ? [self.permanentId] : []), ...others];
    } else if (!materialsAreLoose && action.materials.includeRef !== undefined) {
      // One material slot is pinned to a referenced permanent; the player picks the
      // remaining count-1 materials from the filter, excluding the pinned id.
      const pinnedId =
        action.materials.includeRef === "triggerSubject"
          ? (ctx.trigger.subjectPermanentId ?? ctx.trigger.deletedPermanentId ?? ctx.trigger.attackerPermanentId)
          : ctx.source.permanent()?.permanentId;
      if (pinnedId === undefined) {
        // The pinned permanent is absent (e.g. the Replacement fired with no subject yet
        // recorded, or the trigger is from a non-permanent event). The DNA digivolve is not
        // legal — return without acting.
        return;
      }
      const remainingCount = (action.materials.count as number) - 1;
      let rest: string[] = [];
      if (remainingCount > 0) {
        // Build candidate pool from the filter, then exclude the pinned id so the controller
        // cannot select it again as the "other" material.
        const partnerCandidates = candidatePermanents(ctx, {
          filter: action.materials.filter,
          count: remainingCount,
        })
          .filter((p) => p.permanentId !== pinnedId)
          .map((p) => p.permanentId);
        const min = Math.min(remainingCount, partnerCandidates.length);
        rest = await ctx.ask.chooseTargets(ctx, {
          candidates: partnerCandidates,
          min,
          max: min,
        });
      }
      materialIds = [pinnedId, ...rest];
    }
  }
  if (action.looseMaterials !== undefined) {
    const zones = action.looseMaterials.from ?? ["trash"];
    looseMaterialIds = [
      ...looseMaterialIds,
      ...(await pickLoose(ctx, action.looseMaterials, candidateLooseInstances(ctx, action.looseMaterials, zones))),
    ];
  }
  if (materialIds.length + looseMaterialIds.length < 2) {
    // An optional DNA effect simply has no legal action when both required materials
    // are unavailable. It must never degrade into a one-stack normal digivolution or
    // surface a capability error to the player.
    return;
  }
  const candidates = resultPool.filter(
    (candidate) => ctx.fx.canDnaDigivolve?.(materialIds, candidate.instanceId) !== false,
  );
  if (candidates.length === 0) return;
  const chosen = await pickLoose(
    ctx,
    intoTarget,
    candidates,
    undefined,
    ctx.ask,
    visibleResultPool.map(({ instanceId }) => instanceId),
  );
  if (chosen.length === 0) return;
  const result = await ctx.fx.dnaDigivolveInto(materialIds, chosen[0]!, {
    payCost: action.payCost,
    ...(looseMaterialIds.length > 0 ? { extraMaterialInstanceIds: looseMaterialIds } : {}),
  });
  if (action.bindResultAs && result !== undefined) {
    if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
    ctx.boundPlayed!.set(action.bindResultAs, new Set([result.permanentId]));
  }
}

type DnaMaterialSlot =
  Extract<Action, { kind: "DnaDigivolve" }> extends { materials: infer Materials }
    ? Materials extends readonly (infer Slot)[]
      ? Slot
      : never
    : never;

function hasLegalDnaCompletion(
  ctx: EffectContext,
  slots: readonly DnaMaterialSlot[],
  slotIndex: number,
  selected: string[],
  results: readonly { instanceId: string }[],
): boolean {
  if (slotIndex >= slots.length) {
    if (selected.length < 2) return false;
    return results.some(({ instanceId }) => ctx.fx.canDnaDigivolve?.(selected, instanceId) !== false);
  }
  const slot = slots[slotIndex]!;
  if (slot.zone !== undefined && slot.zone !== "battleArea" && slot.zone !== "breeding") return true;
  const wanted = typeof slot.count === "number" ? slot.count : 1;
  const self =
    (slot as DnaMaterialSlot & { isSelf?: boolean }).isSelf === true || slot.filter.isSelfRef === true
      ? ctx.source.permanent()
      : undefined;
  const available = (
    self !== undefined
      ? [self.permanentId]
      : candidatePermanents(ctx, { ...slot, filter: slot.filter, count: "all" } as Target).map(
          ({ permanentId }) => permanentId,
        )
  ).filter((permanentId) => !selected.includes(permanentId));

  function choose(start: number, chosen: string[]): boolean {
    if (chosen.length === wanted) {
      return hasLegalDnaCompletion(ctx, slots, slotIndex + 1, [...selected, ...chosen], results);
    }
    for (let index = start; index < available.length; index += 1) {
      if (choose(index + 1, [...chosen, available[index]!])) return true;
    }
    return false;
  }
  return choose(0, []);
}

/**
 * PlayPerLevel (BT20-098 Apparition Legion).
 *
 * 1. Pay cost: the controller selects Digimon from `cost.target` (opponent's trash) whose
 *    printed levels sum to EXACTLY `cost.target.totalLevels`. Returns them to the bottom of deck.
 * 2. For each returned card at level L, play 1 card matching `playFilter` at level L from the
 *    controller's trash without paying its cost.
 * 3. Write the set of newly-played permanentIds under `bindResultAs` so downstream GainKeyword
 *    actions can reference them via `filter.boundRef`.
 *
 * The level-sum selection is done greedily by the engine (server-authoritative); the optional flag
 * on the action means the whole sequence may be declined at step 1.
 */
async function runPlayPerLevel(ctx: EffectContext, action: Extract<Action, { kind: "PlayPerLevel" }>): Promise<void> {
  const cost = action.cost;
  if (!cost.target) return;

  const budget = cost.target.totalLevels;
  if (budget === undefined || budget <= 0) return;

  // Collect candidates from the cost target zone (opponent's trash for BT20-098).
  const costZone: ZoneRef = (cost.target.filter.zone as ZoneRef) ?? "trash";
  const costCandidates = candidateLooseInstances(ctx, cost.target, [costZone]);
  if (costCandidates.length === 0) return;

  // Filter to cards that have a numeric printed level (cards without a level cannot contribute).
  const leveled = costCandidates
    .map((c) => ({ ...c, level: ctx.game.definitionOf({ cardId: c.cardId } as never).level }))
    .filter((c): c is typeof c & { level: number } => c.level !== undefined && c.level > 0);

  // Select exactly `budget` levels' worth. Use a simple greedy approach: ask the controller to
  // choose cards whose levels sum to exactly the budget.
  const chosen: string[] = await ctx.ask.selectCards(ctx, {
    candidates: leveled.map((c) => c.instanceId),
    min: 0,
    max: leveled.length,
  });

  // Validate the level sum is exactly the budget; decline if the selection is invalid.
  const chosenLevels = chosen.map((id) => {
    const c = leveled.find((l) => l.instanceId === id);
    return c?.level ?? 0;
  });
  const levelSum = chosenLevels.reduce((a, b) => a + b, 0);
  if (levelSum !== budget) return;

  // Pay the cost: return chosen cards to the bottom of the deck.
  await ctx.fx.returnToDeck(chosen, { toTop: false });

  // For each returned card's level, play 1 matching card from `playFilter` zone.
  const playZone: ZoneRef = (action.playFilter.zone as ZoneRef) ?? "trash";
  const playedIds: string[] = [];

  for (const level of chosenLevels) {
    const levelFilter: Filter = { ...action.playFilter, levelComparison: { op: "eq", value: level } };
    const playCandidates = candidateLooseInstances(ctx, { filter: levelFilter, count: 1 }, [playZone]);
    if (playCandidates.length === 0) continue;
    const pick = await pickLoose(ctx, { filter: levelFilter, count: 1 }, playCandidates);
    if (pick.length === 0) continue;
    await ctx.fx.playInstances(pick, {
      payCost: action.payCost,
      ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
    });
    playedIds.push(...pick);
  }

  // Bind the played permanentIds under `bindResultAs` for downstream filter.boundRef consumers.
  if (action.bindResultAs && playedIds.length > 0) {
    if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
    ctx.boundPlayed!.set(action.bindResultAs, new Set(playedIds));
  }
}

/**
 * App Fusion (the Appmon mechanic). `source` resolves to the fusing battle-area Digimon
 * ("1 of your Digimon"); `into` filters the fusion-result card; `from` is its zone (trash for
 * BT24-087, hand for BT25-089). For the chosen fusing permanent, the candidate result cards
 * are those that (a) match `into` AND (b) the permanent legally satisfies their
 * `appFusionRequirement`. The fusion plays the result
 * on top, carrying the source's stack underneath, paying the target's app-fusion cost.
 */
async function runAppFuse(ctx: EffectContext, action: Extract<Action, { kind: "AppFuse" }>): Promise<void> {
  const sourceIds = await resolvePermanentTargets(ctx, action.source);
  if (sourceIds.length === 0) return;
  const intoTarget: Target = { filter: action.into, count: 1 };
  for (const sourceId of sourceIds) {
    const permanent = ctx.game.permanentById(sourceId);
    if (permanent === undefined || permanent.topCard === undefined) continue;
    const topName = requireCardDefinition(permanent.topCard.cardId).nameEn;
    const linkedNames = Array.from(permanent.linked).map((c) => requireCardDefinition(c.cardId).nameEn);
    // Only fusion-target cards whose app-fusion condition this permanent satisfies are eligible.
    const candidates = candidateLooseInstances(ctx, intoTarget, action.from).filter(
      (c) => appFusionCostFor(c.cardId, { topName, linkedNames }) !== undefined,
    );
    if (candidates.length === 0) continue;
    const chosen = await pickLoose(ctx, intoTarget, candidates);
    if (chosen.length === 0) continue;
    await ctx.fx.appFuseInto(sourceId, chosen[0]!);
  }
}

/**
 * "Place [X] under <permanent>" / "place as the bottom digivolution card". The common
 * executable shape places filtered loose cards (from hand/trash) under the SOURCE
 * permanent. The self-placing shape ("place this card under 1 of your Digimon") is a
 * loud gap until the destination selection is modeled.
 */
async function runPlaceUnder(ctx: EffectContext, action: Extract<Action, { kind: "PlaceUnder" }>): Promise<void> {
  const self = ctx.source.permanent();
  // "Place the top card of your Digi-Egg deck as this Digimon's bottom digivolution card"
  // (BT13-007 / EX6-006). The card source is the Digi-Egg deck (not loose cards), routed
  // through the dedicated primitive; the host is the SOURCE permanent. The primitive no-ops
  // when the Digi-Egg deck is empty (Q3694: the rest of the effect still resolves).
  if (action.fromEggDeck) {
    if (self === undefined) return;
    if (action.asTop) {
      // BT22-007: place the Digi-Egg-deck top as the host's TOP digivolution card (revealed), but
      // A non-matching top is left in the deck (Q4857: returned face down — i.e. unmoved).
      const top = ctx.game.player(ctx.source.ownerSeat).eggDeck?.[0];
      if (top === undefined) return;
      const filter = action.target.filter;
      if (filter.nameOrTrait !== undefined && filter.nameOrTrait.length > 0) {
        const def = ctx.game.definitionOf({ cardId: top.cardId } as never);
        if (!filter.nameOrTrait.some((ref) => matchNameOrTrait(def, ref))) return;
      }
      // The placement is "you may" — offer it; the controller may decline (Q4857).
      if (action.optional === true && !(await ctx.ask.optional(ctx, "Place as top digivolution card?"))) {
        return;
      }
      await ctx.fx.placeAsTopFromEggDeck(self.permanentId, ctx.source.ownerSeat);
      return;
    }
    await ctx.fx.placeUnderFromEggDeck(self.permanentId, ctx.source.ownerSeat);
    return;
  }
  // "Place [a battle-area permanent A] under another permanent B" (the cross-select
  // IPlacePermanentToDigivolutionCards form): relocating a whole permanent-with-stack under
  // another is a mechanic the placeUnder primitive (loose cards only) does not yet implement.
  // The IR captures it; execution is a loud gap until the relocate-permanent primitive exists.
  if (action.targetIsPermanent) {
    const sourceIds = await resolvePermanentTargets(ctx, action.target);
    if (sourceIds.length === 0) return;
    let destId: string | undefined;
    if (action.underSelectionRef && ctx.selections?.has(action.underSelectionRef)) {
      destId = ctx.selections.get(action.underSelectionRef);
    } else if (action.underFilter) {
      const destTarget: Target = { filter: action.underFilter, count: 1 };
      const destIds = await resolvePermanentTargets(ctx, destTarget);
      if (destIds.length === 0) return;
      destId =
        destIds.length === 1
          ? destIds[0]
          : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
    } else {
      unsupported(ctx, action, "PlaceUnder permanent relocation without underFilter/underSelectionRef");
      return;
    }
    if (destId === undefined) return;
    for (const sourcePermanentId of sourceIds) {
      await relocateByEffect(ctx, destId, sourcePermanentId, { belowTop: true });
    }
    return;
  }
  if (action.target?.isSelf || action.target?.filter?.isSelfRef) {
    // ＜Save＞ form: place THIS card under one of the controller's Tamers (chosen).
    // `underFilter` carries the destination predicate (mine, Tamer, non-Token).
    const underFilter = action.underFilter ?? {
      controller: "mine",
      kind: ["Tamer", "Digimon"],
      excludeToken: true,
    };
    if (underFilter) {
      // `lastPlayed`: the host is whatever this effect's own PlayWithoutCost just played
      // ("place this card as the PLAYED Digimon's bottom digivolution card" — EX9-005),
      // not a fresh choice among the controller's board.
      const destIds =
        action.underFilter?.lastPlayed === true
          ? (ctx.lastPlayedPermanentIds ?? [])
          : await resolvePermanentTargets(ctx, { filter: underFilter, count: 1 });
      if (destIds.length === 0) return;
      const chosen =
        destIds.length === 1 ? destIds : await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 });
      if (chosen.length === 0) return;
      // When the source is a battle-area permanent, relocate the whole permanent
      // (top card + digivolution stack) under the chosen Tamer. The placeUnder
      // primitive only handles loose cards and cannot remove a permanent's top card.
      const sourcePerm = ctx.source.permanent();
      if (sourcePerm !== undefined) {
        await relocateByEffect(ctx, chosen[0]!, sourcePerm.permanentId, {
          belowTop: action.position !== "bottom",
        });
      } else {
        await ctx.fx.placeUnder(chosen[0]!, [ctx.source.instanceId], {
          belowTop: action.position !== "bottom",
        });
      }
      if (action.bindHostAs) {
        ctx.boundPlayed ??= new Map();
        ctx.boundPlayed.set(action.bindHostAs, new Set([chosen[0]!]));
      }
      return;
    }
    unsupported(ctx, action, "PlaceUnder of this card under a chosen permanent needs a destination selection");
    return;
  }
  // "Place the top card of your deck face down under this Tamer / under any of
  // your [TRAIT] Tamer" (ST23-13, ST24-03 etc.): take the top card of the
  // controller's main deck. When underFilter is set the controller picks a
  // destination permanent; otherwise the source permanent is the host.
  if (action.fromDeckTop) {
    const top = ctx.game.player(ctx.source.ownerSeat).deck[0];
    if (top === undefined) return;
    let destId: string | undefined;
    if (action.underFilter) {
      const destTarget: Target = { filter: action.underFilter, count: 1 };
      const destIds = await resolvePermanentTargets(ctx, destTarget);
      if (destIds.length === 0) return;
      destId =
        destIds.length === 1
          ? destIds[0]
          : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
    } else if (self !== undefined) {
      destId = self.permanentId;
    }
    if (destId === undefined) return;
    await ctx.fx.placeUnder(destId, [top.instanceId], { belowTop: true, faceUp: false });
    return;
  }
  // Cards to place: loose cards matching the target filter.
  // Priority: action.from (top-level) > action.target.from > target.filter.zone (for non-default
  // zones like "underTamer" used by BT19-081) > legacy hand/trash/deck sweep.
  const zones: ZoneRef[] =
    (action.from?.length ?? 0) > 0
      ? (action.from as ZoneRef[])
      : (action.target.from?.length ?? 0) > 0
        ? (action.target.from as ZoneRef[])
        : action.target.filter.zone !== undefined
          ? [action.target.filter.zone]
          : ["hand", "trash", "deck"];
  const candidates = candidateLooseInstances(ctx, action.target, zones);
  if (candidates.length === 0) return;
  // Destination host (priority): explicit `destination` selector (BT19-038: place a card
  // from hand/trash under a chosen Tamer) > `underFilter` > the source permanent itself.
  let hostId: string | undefined;
  if (action.destination) {
    const destTarget: Target = { filter: action.destination.filter, count: action.destination.count };
    const destIds = await resolvePermanentTargets(ctx, destTarget);
    if (destIds.length === 0) return;
    hostId =
      destIds.length === 1
        ? destIds[0]
        : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
  } else if (action.underSelectionRef && ctx.selections?.has(action.underSelectionRef)) {
    hostId = ctx.selections.get(action.underSelectionRef);
  } else if (action.underFilter?.isTriggerSource === true) {
    // `isTriggerSource: true` in underFilter resolves to the permanent that drove the
    // enclosing trigger: the Digimon being played for wouldBePlayed replacements, or
    // the Digimon that just digivolved for SubTrigger bodies such as BT12 Tamers.
    const triggerPermanentId =
      ctx.trigger?.wouldBePlayedInstanceId ??
      ctx.trigger?.subjectPermanentId ??
      ctx.trigger?.attackerPermanentId ??
      ctx.trigger?.deletedPermanentId;
    if (triggerPermanentId !== undefined) {
      const triggerPermanent = ctx.game.permanentById(triggerPermanentId);
      if (triggerPermanent !== undefined) hostId = triggerPermanent.permanentId;
    }
    if (hostId === undefined) return;
  } else if (action.underFilter) {
    const destTarget: Target = { filter: action.underFilter, count: 1 };
    const destIds = await resolvePermanentTargets(ctx, destTarget);
    if (destIds.length === 0) return;
    hostId =
      destIds.length === 1
        ? destIds[0]
        : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
  } else {
    if (self === undefined) {
      unsupported(ctx, action, "PlaceUnder onto the source needs the source to be a battle-area permanent");
      return;
    }
    hostId = self.permanentId;
  }
  if (hostId === undefined) return;
  let chosen = await pickLoose(ctx, action.target, candidates);
  if (action.order === "any" && chosen.length > 1 && ctx.ask.orderCards !== undefined) {
    chosen = await ctx.ask.orderCards(ctx, {
      candidates: chosen,
      visibleCards: chosen
        .map((instanceId) => candidates.find((candidate) => candidate.instanceId === instanceId))
        .filter((candidate): candidate is LooseCandidate => candidate !== undefined)
        .map(({ instanceId, cardId }) => ({ instanceId, cardId })),
      destination: "stackBottom",
    });
  }
  ctx.lastPlacedUnderInstanceIds = chosen;
  // `asDigiXrosMaterial: true` marks placed cards as DigiXros materials for the host Digimon.
  // The placeUnder primitive records them as material cards in the host's stack (belowTop as
  // the DigiXros convention; the flag is structural metadata for the DigiXros system to read).
  if (chosen.length > 0) {
    await ctx.fx.placeUnder(hostId, chosen, { belowTop: action.position !== "bottom" });
  }
  if (action.bindHostAs && chosen.length > 0) {
    ctx.boundPlayed ??= new Map();
    ctx.boundPlayed.set(action.bindHostAs, new Set([hostId]));
  }
  // Bind the branch-acted result so an "if this effect placed" tail (AD1-020) can gate.
  ctx.lastEffectActed = chosen.length > 0;
  // Record the placed count so a later `namedCount` scaling can read it (EX6-015: "for each
  // card placed in this Digimon's digivolution cards, add 1 to the level this effect may return").
  if (action.trackCount !== undefined) {
    if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
    ctx.namedCounts.set(action.trackCount, chosen.length);
  }
}

/**
 * Preflight the ordinary loose-card PlaceUnder shape before an optional confirmation is
 * published. Specialized shapes own different source/destination rules and keep their
 * existing resolver-specific handling.
 */
function canAttemptPlaceUnder(ctx: EffectContext, action: Extract<Action, { kind: "PlaceUnder" }>): boolean {
  if (
    action.fromEggDeck === true ||
    action.fromDeckTop === true ||
    action.targetIsPermanent === true ||
    action.target?.isSelf === true ||
    action.target?.filter?.isSelfRef === true
  ) {
    return true;
  }

  const zones: ZoneRef[] =
    (action.from?.length ?? 0) > 0
      ? (action.from as ZoneRef[])
      : (action.target.from?.length ?? 0) > 0
        ? (action.target.from as ZoneRef[])
        : action.target.filter.zone !== undefined
          ? [action.target.filter.zone]
          : ["hand", "trash", "deck"];
  if (candidateLooseInstances(ctx, action.target, zones).length === 0) return false;

  if (action.destination !== undefined) {
    return (
      candidatePermanents(ctx, {
        filter: action.destination.filter,
        count: action.destination.count,
      }).length > 0
    );
  }
  if (action.underSelectionRef !== undefined) {
    const hostId = ctx.selections?.get(action.underSelectionRef);
    return hostId !== undefined && ctx.game.permanentById(hostId) !== undefined;
  }
  if (action.underFilter?.isTriggerSource === true) {
    const triggerPermanentId =
      ctx.trigger?.wouldBePlayedInstanceId ??
      ctx.trigger?.subjectPermanentId ??
      ctx.trigger?.attackerPermanentId ??
      ctx.trigger?.deletedPermanentId;
    return triggerPermanentId !== undefined && ctx.game.permanentById(triggerPermanentId) !== undefined;
  }
  if (action.underFilter !== undefined) {
    return candidatePermanents(ctx, { filter: action.underFilter, count: 1 }).length > 0;
  }
  return ctx.source.permanent() !== undefined;
}

/**
 * "Trash the top/bottom digivolution card of <target>". Resolve the target permanents,
 * then for each take `amount` source cards from the top (last in `stack` — the card
 * directly beneath the top, which is the "top" digivolution card) or bottom (`stack`
 * front) and trash them via the trash verb (which can move a stack card to its owner's
 * trash). A permanent with no digivolution cards is unaffected.
 */
async function runTrashDigivolution(
  ctx: EffectContext,
  action: Extract<Action, { kind: "TrashDigivolution" }>,
): Promise<boolean> {
  const amount = action.amount ?? 1;
  const fromTop = action.fromTop ?? true;

  // "acrossDigimon": pool all digivolution cards from every matching permanent and let
  // the controller pick `amount` from the combined pool (EX12-035 "any 4 digivolution
  // cards from your opponent's Digimon"). NOT routed through redirectDigivolutionTrashHosts:
  // no KB ruling describes how a pooled, individually-per-card selection across several hosts
  // collapses onto one reacting Digimon, so this scope is left outside BT10-084's redirect
  // rather than guessed at (residual — see BT10-084.ts).
  if (action.scope === "acrossDigimon") {
    const permanents = candidatePermanents(ctx, action.target);
    // Build a flat candidate list: each entry knows which host permanent it came from.
    const pool: { instanceId: string; permanentId: string }[] = [];
    for (const permanent of permanents) {
      for (const card of permanent.stack) {
        pool.push({ instanceId: card.instanceId, permanentId: permanent.permanentId });
      }
    }
    if (pool.length === 0) {
      ctx.lastEffectActed = false;
      return false;
    }
    if (
      action.optional === true &&
      action.abortOnDecline === true &&
      typeof amount === "number" &&
      pool.length < amount
    ) {
      ctx.lastEffectActed = false;
      return false;
    }
    const take = amount === "all" ? pool.length : Math.min(amount, pool.length);
    let chosen: string[];
    if (pool.length <= take) {
      chosen = pool.map((c) => c.instanceId);
    } else {
      chosen = await ctx.ask.selectCards(ctx, {
        candidates: pool.map((c) => c.instanceId),
        min: take,
        max: take,
      });
    }
    // Group chosen instance ids back to their host permanents, then trash per-host.
    const byHost = new Map<string, string[]>();
    for (const id of chosen) {
      const entry = pool.find((c) => c.instanceId === id);
      if (entry === undefined) continue;
      const bucket = byHost.get(entry.permanentId) ?? [];
      bucket.push(id);
      byHost.set(entry.permanentId, bucket);
    }
    for (const [pid, ids] of byHost) {
      if (ids.length > 0) await ctx.fx.trashDigivolutionCards(pid, ids, { byEffectSeat: ctx.source.ownerSeat });
    }
    ctx.lastEffectActed = chosen.length > 0;
    return amount === "all" ? chosen.length > 0 : chosen.length === amount;
  }

  // Default: single-target path — resolve 1 permanent, trash `amount` from its stack.
  const resolvedIds = await resolvePermanentTargets(ctx, action.target);
  if (resolvedIds.length === 0) {
    ctx.lastEffectActed = false;
    return false;
  }
  // Redirect BEFORE selecting which cards to take (KB BT10-084 Q2002-Q2008): a "would trash"
  // reaction may collapse this whole operation onto ONE reacting Digimon's stack instead. The
  // loop below then re-applies the SAME fromTop/choose/amount logic to whichever ids come back,
  // which is what preserves the original action's count and selection kind after a redirect.
  const permanentIds = await ctx.fx.redirectDigivolutionTrashHosts(resolvedIds);
  // An optional fixed-count action that gates the rest of its effect is an atomic
  // activation cost (for example BT5-111: "by trashing 2 ... end the attack").
  // If any selected host cannot supply the printed count, do not partially trash its
  // remaining cards and abort the payload. Mandatory trash effects still do as much as
  // possible, including after a BT10-084 redirect.
  if (
    action.optional === true &&
    action.abortOnDecline === true &&
    typeof amount === "number" &&
    permanentIds.some((pid) => (ctx.game.permanentById(pid)?.stack.length ?? 0) < amount)
  ) {
    ctx.lastEffectActed = false;
    return false;
  }
  // Per host permanent: which of its digivolution-stack cards this effect trashes. The
  // dedicated primitive trashes them AND fires whenDigivolutionTrashed (carrying the host as
  // subject) — a GENUINE effect-trash. A return-to-hand bounce clears digivolution cards via
  // returnToHand, a different path that never routes here, so it does not fire (KB P-004 Q4113).
  // Track the total cards actually trashed across every host so "this effect didn't trash"
  // (BT18-034, EX7-067's "then" clause) reads a real outcome instead of defaulting to unset.
  let totalTrashed = 0;
  for (const pid of permanentIds) {
    const permanent = ctx.game.permanentById(pid);
    if (permanent === undefined) continue;
    const stack = permanent.stack;
    const take = amount === "all" ? stack.length : Math.min(amount, stack.length);
    let ids: string[];
    if (action.choose === true) {
      // "trash any 1 card under [permanent]" (RB1-016, KB Q4094): the controller picks freely
      // from the whole stack rather than a deterministic top/bottom slice.
      const candidateIds = stack.map((card) => card.instanceId);
      ids =
        candidateIds.length <= take
          ? candidateIds
          : await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: take, max: take });
    } else {
      ids = [];
      for (let i = 0; i < take; i++) {
        // `stack` is ordered bottom (index 0) -> top (last); the "top digivolution card"
        // is the most-recently-added source at the end.
        const idx = fromTop ? stack.length - 1 - i : i;
        const instance = stack[idx];
        if (instance !== undefined) ids.push(instance.instanceId);
      }
    }
    if (ids.length > 0) {
      await ctx.fx.trashDigivolutionCards(pid, ids, { byEffectSeat: ctx.source.ownerSeat });
      totalTrashed += ids.length;
    }
  }
  ctx.lastEffectActed = totalTrashed > 0;
  if (amount === "all") return totalTrashed > 0;
  return totalTrashed === amount * permanentIds.length;
}

/**
 * "Link N [X] from your hand or this Digimon's digivolution cards to this Digimon".
 * The cards to link are loose cards matching the target filter; they join the SOURCE
 * permanent's linked list.
 */
async function runLink(ctx: EffectContext, action: Extract<Action, { kind: "Link" }>): Promise<void> {
  // The recipient is a chosen friendly Digimon ("link ... to 1 of your Digimon") or, by
  // default, the source permanent ("to this Digimon").
  let recipientId = ctx.source.permanent()?.permanentId;
  if (action.recipient !== undefined) {
    const recipientFilter: Filter = { controller: "mine", kind: ["Digimon"], ...action.recipient.filter };
    // Dynamic recipient eligibility: only a
    // non-token, non-breeding Digimon that satisfies the link card's structured target condition
    // may RECEIVE the link. Filter the candidate recipients through the predicate so an
    // ineligible recipient is never offered (server-authoritative — V4/V5).
    const matches = (p: Permanent, f: Filter): boolean => permanentMatchesFilter(ctx, p, f, ctx.source);
    const recipients = candidatePermanents(ctx, { ...action.recipient, filter: recipientFilter }).filter((p) =>
      canLinkToTargetPermanent(p, recipientFilter, matches, ctx.game.definitionOf),
    );
    if (recipients.length === 0) return;
    const recipientTarget = action.recipient.count === "all" ? recipients.length : (action.recipient.count ?? 1);
    if (recipients.length <= recipientTarget && !action.recipient.upTo) {
      recipientId = recipients[0]?.permanentId;
    } else {
      const chosenRecipient = await ctx.ask.chooseTargets(ctx, {
        candidates: recipients.map((p) => p.permanentId),
        min: action.recipient.upTo ? 0 : 1,
        max: 1,
      });
      if (chosenRecipient.length > 0) recipientId = chosenRecipient[0];
    }
  }
  if (recipientId === undefined) {
    unsupported(ctx, action, "Link needs a recipient permanent (source not on the battle area)");
    return;
  }
  const recipient = ctx.game.permanentById(recipientId);
  if (recipient === undefined) {
    unsupported(ctx, action, "Link recipient permanent not on the battle area");
    return;
  }
  // Server-authoritative <Link> eligibility (KB Q4881): only cards carrying the Link
  // mechanic may be linked. A client link intent against a no-<Link> target is rejected
  // here by excluding it from the selectable set — never trusted.
  const candidates = candidateLooseInstances(ctx, action.target, action.from ?? ["hand", "digivolutionCards"]).filter(
    (cand) => linkEligible(ctx.game.definitionOf({ cardId: cand.cardId } as never)),
  );
  if (candidates.length === 0) return;
  // The link limit is NOT a declaration-time gate. §4-8-5: "1 card can have a maximum of 1
  // link card. When linking to a Digimon that has already reached the link limit, the same
  // number of the existing link cards are trashed at the same time as the newly linked cards" —
  // the link is ALLOWED and the pre-existing excess is trashed alongside it, not refused.
  // §17-1-3-2-5 (Rule Checks) confirms the cleanup happens as a state-based sweep AFTER the
  // fact ("Link cards for a Digimon that has exceeded the link limit — only the cards that
  // exceed link limit are trashed"), which is exactly what GameEngine's `trashExcessLinkCards`
  // rule-check pass already does on every fixpoint pass. So `runLink` must land the full
  // requested count here and let that sweep trim any excess, the same way the player-facing
  // `linkCard` verb (actions/link.ts) never gates on headroom either — both paths must agree.
  const chosen = await pickLoose(ctx, action.target, candidates);
  if (chosen.length === 0) return;
  // Real link-cost calculation (the seam Phase 8's BT25-004/045 link-cost REDUCTION builds on).
  // Each link card carries a printed link cost ("Cost N" in linkRequirement); `costDelta` is a
  // signed adjustment ("with the cost reduced by N" => negative). Pay the floored cost per card
  // via the shared memory plumbing — the engine now HAS a link cost to reduce.
  for (const instanceId of chosen) {
    const cand = candidates.find((c) => c.instanceId === instanceId);
    if (cand === undefined) continue;
    const def = ctx.game.definitionOf({ cardId: cand.cardId } as never);
    // The link cost combines the declaring action's own `costDelta` (BT25-045's baked self-link
    // reduction) with the RECIPIENT's continuous link-cost-reduction grant (BT25-004's cross-actor
    // rule implementation): when a [Social]/[Tool]/[Game] card would link to a granted
    // recipient, ANY actor's declaration is reduced. Per KB BT25-089 Q6423 the recipient grant does
    // not stack on one declaration (the store returns its largest single matching grant); both the
    // self delta and the recipient reduction are signed-summed and floored at 0 by linkCostOf.
    const cardTraits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
    const recipientReduction = ctx.game.linkCostReduction?.(recipientId, cardTraits) ?? 0;
    const cost = action.payCost === false ? 0 : linkCostOf(def, (action.costDelta ?? 0) - recipientReduction);
    if (cost > 0) ctx.fx.gainMemory(-cost);
  }
  await ctx.fx.link(recipientId, chosen);
}

/**
 * Printed link cost of a link card plus a signed `costDelta`, floored at 0. The base cost is
 * encoded in `CardDefinition.linkRequirement` as "Cost N" (e.g. "[Link] [Appmon] trait: Cost 1");
 * parseable "Cost N" is treated as cost 0.
 */
export function linkCostOf(def: CardDefinition, costDelta: number): number {
  const match = /Cost\s+(\d+)/i.exec(def.linkRequirement ?? "");
  const base = match ? Number(match[1]) : 0;
  return Math.max(0, base + costDelta);
}

/**
 * ＜Mind Link＞ — relocate this Tamer permanent under a chosen Digimon as the bottom
 * digivolution card when that Digimon has no Tamer cards in its digivolution cards.
 */
async function runMindLink(ctx: EffectContext, action: Extract<Action, { kind: "MindLink" }>): Promise<void> {
  const tamer = ctx.source.permanent();
  if (tamer === undefined) {
    unsupported(ctx, action, "MindLink needs the source to be a battle-area Tamer");
    return;
  }
  if (!isTamer(ctx.source.definition)) {
    unsupported(ctx, action, "MindLink source must be a Tamer");
    return;
  }
  const filter: Filter = {
    controller: "mine",
    kind: ["Digimon"],
    excludeToken: true,
    ...action.target.filter,
  };
  const matches = (p: Permanent, f: Filter) => permanentMatchesFilter(ctx, p, f, ctx.source);
  const candidates = candidatePermanents(ctx, { ...action.target, filter }).filter((p) =>
    digimonEligibleForMindLink(p, filter, matches, ctx.game.definitionOf),
  );
  if (candidates.length === 0) return;
  const want = action.target.count === "all" ? candidates.length : action.target.count;
  let chosenIds: string[];
  if (candidates.length <= want) {
    chosenIds = candidates.map((p) => p.permanentId);
  } else {
    chosenIds = await ctx.ask.chooseTargets(ctx, {
      candidates: candidates.map((p) => p.permanentId),
      min: action.optional ? 0 : 1,
      max: want,
    });
  }
  if (chosenIds.length === 0) return;
  for (const digimonId of chosenIds) {
    await relocateByEffect(ctx, digimonId, tamer.permanentId, { belowTop: false });
  }
}

/**
 * "Activate this card's [Main] effect" — run the source card's own [Main]-timing
 * effect from the current (non-main) context (the common [Security] "activate this
 * card's [Main] effect" form). Looks up the compiled record and runs every Main
 * effect's actions through the interpreter. A loud gap when the card has no compiled
 * [Main] effect (so a silent no-op cannot hide a missing main ability).
 */
async function runActivateMain(ctx: EffectContext): Promise<void> {
  const compiled = runtimeCompiledCard(ctx.source.cardId);
  const mains = (compiled?.effects ?? []).filter((e) => e.trigger === "Main" && !e.isSecurity);
  if (mains.length === 0) {
    unsupported(ctx, { kind: "ActivateMain" }, `ActivateMain found no [Main] effect on ${ctx.source.cardId}`);
    return;
  }
  for (const effect of mains) await runEffect(ctx, effect);
}

/**
 * Reveal without moving cards. Deck reveals use the primitive that flips the top N
 * cards face-up in place. Hand reveals select the cards to expose but intentionally
 * perform no zone movement; the follow-up actions carry any actual disposition.
 */
async function runReveal(ctx: EffectContext, action: Extract<Action, { kind: "Reveal" }>): Promise<void> {
  const target = action.target;
  const targetFilter = target?.filter as (Filter & { location?: string; top?: boolean }) | undefined;
  const targetZone = targetFilter?.zone ?? targetFilter?.location ?? action.zone;
  const count = target?.count === "all" ? 10000 : (target?.count ?? action.count ?? 1);

  if (target !== undefined && targetZone === "hand") {
    const candidates = candidateLooseInstances(ctx, target, ["hand"]);
    await pickLoose(ctx, target, candidates);
    return;
  }

  if (targetZone === "deck" || targetZone === undefined) {
    let seat = ctx.source.ownerSeat;
    const controller = targetFilter?.controller ?? action.controller;
    if (controller === "opponent") {
      seat = ctx.game.opponentOf(ctx.source.ownerSeat);
    } else if (controller === "any") {
      const choice = await ctx.ask.chooseOption(ctx, ["Your deck", "Opponent's deck"]);
      seat = choice === 0 ? ctx.source.ownerSeat : ctx.game.opponentOf(ctx.source.ownerSeat);
    }
    const revealed = await ctx.fx.reveal(seat, count);
    ctx.lastRevealedCards = revealed.map((card) => ({
      instanceId: card.instanceId,
      cardId: card.cardId,
      ownerSeat: card.ownerSeat,
    }));
    return;
  }

  unsupported(ctx, action, `Reveal from unsupported zone "${String(targetZone)}"`);
}

/**
 * Reveal the top N, then dispatch each matching revealed card per its `to`
 * disposition (add to hand / play without cost), and send the rest to the deck
 * bottom/top (or trash) in any order. The reveal flips the top N face-up in place;
 * `returnToHand`/`returnToDeck`/`trash` then act on those deck instances.
 *
 * "play" is executable: the chosen revealed deck card is moved to hand and played
 * free (the net effect of "play a card among them without paying its cost").
 * "digivolve" moves a chosen revealed card onto a compatible host without paying
 * its cost. Its evolution bonus draw occurs while the unrevealed deck is still
 * separate; the remaining revealed cards return before [When Digivolving] opens
 * (BT1-078 KB Q931/Q932).
 */
async function runRevealAdd(ctx: EffectContext, action: Extract<Action, { kind: "RevealAdd" }>): Promise<void> {
  const seat = ctx.source.ownerSeat;
  if (action.trackCount !== undefined) {
    ctx.namedCounts ??= new Map();
    ctx.namedCounts.set(action.trackCount, 0);
  }
  const revealed = await ctx.fx.reveal(seat, action.revealCount);
  if (revealed.length === 0) return;
  ctx.lastRevealedCards = revealed.map((card) => ({
    instanceId: card.instanceId,
    cardId: card.cardId,
    ownerSeat: card.ownerSeat,
  }));

  const taken = new Set<string>();
  const toHand: string[] = [];
  const toTrash: string[] = [];
  const toPlay: { instanceId: string; costDelta?: number }[] = [];
  const toDigivolve: { instanceId: string; target?: Target; payCost?: boolean }[] = [];
  const toSecurity: { instanceId: string; toTop: boolean; faceDown: boolean }[] = [];
  const toPlaceUnder: { instanceId: string; underFilter?: import("@aegis/shared").Filter }[] = [];
  const toUnderTamer: { instanceId: string; underFilter?: import("@aegis/shared").Filter }[] = [];
  if (action.trashFilter !== undefined) {
    for (const card of revealed) {
      if (definitionMatches(action.trashFilter, ctx.game.definitionOf(card))) {
        taken.add(card.instanceId);
        toTrash.push(card.instanceId);
      }
    }
  }
  // EX2-072 Blue Card: first offer a free digivolution into one compatible,
  // non-white revealed Digimon.  Only cards that have at least one legal host are
  // selectable; the full reveal remains visible so the UI can render ineligible cards
  // disabled instead of hiding them. Declining (or having no legal pair) unlocks the
  // printed "if you don't" add-to-hand fallback below.
  let digivolveDeclined = true;
  if (action.digivolveOption !== undefined) {
    const option = action.digivolveOption;
    const targetSpec = option.target ?? {
      filter: { controller: "mine", kind: ["Digimon"] },
      count: 1,
    };
    const hosts = ctx.game.player(seat).battleArea.filter((permanent) => {
      if (permanent.topCard === undefined) return false;
      return permanentMatchesFilter(ctx, permanent, targetSpec.filter, ctx.source);
    });
    const compatible = revealed.filter((card) => {
      const into = ctx.game.definitionOf(card);
      if (!definitionMatches(option.into, into)) return false;
      return hosts.some((host) => {
        if (host.topCard === undefined) return false;
        const base = ctx.game.definitionOf(host.topCard);
        return (
          matchingEvoCost(into, base) !== undefined ||
          matchingAlternateDigivolutionRequirement(into, base) !== undefined
        );
      });
    });
    if (compatible.length > 0) {
      const chosen = await ctx.ask.selectCards(ctx, {
        candidates: compatible.map((card) => card.instanceId),
        visible: revealed.map((card) => card.instanceId),
        visibleCards: revealed.map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
        min: option.optional === true ? 0 : 1,
        max: 1,
      });
      const selected = compatible.find((card) => card.instanceId === chosen[0]);
      if (selected !== undefined) {
        taken.add(selected.instanceId);
        toDigivolve.push({
          instanceId: selected.instanceId,
          target: option.target,
          payCost: option.payCost,
        });
        digivolveDeclined = false;
      }
    }
  }
  for (const spec of action.add) {
    if (spec.ifDigivolveDeclined === true && !digivolveDeclined) continue;
    const qualifies = (c: import("@aegis/shared").CardInstance) => {
      const def = ctx.game.definitionOf(c);
      // "Add 1 [X] or 1 Y card among them": a card qualifies under EITHER alternative;
      // `count` is the total across the union, so the player adds 1 from either, not one each.
      return definitionMatches(spec.filter, def) || (spec.orFilters ?? []).some((alt) => definitionMatches(alt, def));
    };
    // requiresMinRevealed: count ALL matching cards among the FULL revealed set (including already
    // taken by earlier slots) — KB Q3114 "if 2+ applicable cards are revealed" refers to the total
    // revealed applicables, not the remaining after earlier slots have consumed some.
    if (spec.requiresMinRevealed !== undefined) {
      const totalApplicable = revealed.filter(qualifies).length;
      if (totalApplicable < spec.requiresMinRevealed) continue;
    }
    let matches = revealed.filter((c) => !taken.has(c.instanceId) && qualifies(c));
    if (spec.to === "digivolve") {
      const target = spec.digivolveTarget ?? {
        filter: { controller: "mine", kind: ["Digimon"] },
        count: 1,
      };
      const hosts = candidatePermanents(ctx, target);
      // A revealed card is selectable only when at least one legal host can
      // actually digivolve into it. Previously the prompt filtered only the
      // printed card filter (trait/color/level), so an incompatible pick was
      // marked as taken and then neither digivolved nor reached `rest`.
      matches = matches.filter((card) => {
        const into = ctx.game.definitionOf(card);
        return hosts.some((host) => {
          if (host.topCard === undefined) return false;
          const base = ctx.game.definitionOf(host.topCard);
          return (
            matchingEvoCost(into, base) !== undefined ||
            matchingAlternateDigivolutionRequirement(into, base) !== undefined
          );
        });
      });
    }
    // Budget-constrained free play: choose any subset whose SUMMED play cost <= costBudget
    // ("total play costs add up to N or less", BT11-044 / "N play cost's total worth", BT14-068).
    // The card count is bounded by the budget, not a fixed `count`; the pick is always optional.
    if (spec.costBudget !== undefined) {
      const budget = spec.costBudget;
      const playCostOf = (c: import("@aegis/shared").CardInstance) => ctx.game.definitionOf(c).playCost ?? 0;
      // A card can only ever be part of a within-budget subset if it individually fits.
      const affordable = matches.filter((c) => playCostOf(c) <= budget);
      if (affordable.length > 0) {
        const ids = await ctx.ask.selectCards(ctx, {
          candidates: affordable.map((c) => c.instanceId),
          visible: revealed.map((c) => c.instanceId),
          visibleCards: revealed.map((c) => ({ instanceId: c.instanceId, cardId: c.cardId })),
          min: 0,
          max: affordable.length,
          maxTotalPlayCost: budget,
        });
        let selected = affordable.filter((c) => ids.includes(c.instanceId));
        // Enforce the budget server-side — never trust the client. Drop the most expensive
        // picks until the running total is within budget, so an over-budget selection is
        // rejected down to a legal subset rather than played in full.
        selected.sort((a, b) => playCostOf(b) - playCostOf(a));
        let total = selected.reduce((sum, c) => sum + playCostOf(c), 0);
        while (total > budget && selected.length > 0) {
          total -= playCostOf(selected[0]!);
          selected = selected.slice(1);
        }
        for (const c of selected) {
          taken.add(c.instanceId);
          toPlay.push({ instanceId: c.instanceId });
        }
      }
      continue;
    }
    const want =
      spec.count === "all"
        ? matches.length
        : effectiveTargetCount(ctx, {
            filter: spec.filter,
            count: spec.count,
            ...(spec.countModifier !== undefined ? { countModifier: spec.countModifier } : {}),
          } as Target);
    let chosen = matches.slice(0, want);
    // A bounded reveal selection is confirmed even when only one card is eligible. This keeps
    // every disposition (hand, play, security, place-under, etc.) on the same UI path and lets
    // the player inspect the full reveal, including ineligible cards shown as disabled. Slots
    // that take every matching card remain forced; optional/up-to slots still allow 0.
    if (matches.length > 0 && (spec.optional || spec.upTo || spec.count !== "all")) {
      const ids = await ctx.ask.selectCards(ctx, {
        candidates: matches.map((c) => c.instanceId),
        visible: revealed.map((c) => c.instanceId),
        visibleCards: revealed.map((c) => ({ instanceId: c.instanceId, cardId: c.cardId })),
        min: spec.optional || spec.upTo ? 0 : Math.min(want, matches.length),
        max: want,
      });
      chosen = matches.filter((c) => ids.includes(c.instanceId));
    }
    for (const c of chosen) {
      taken.add(c.instanceId);
      let disposition: {
        to?: "hand" | "trash" | "play" | "digivolve" | "placeUnder" | "underTamer" | "security";
        underFilter?: import("@aegis/shared").Filter;
        toTop?: boolean;
        faceDown?: boolean;
      } = { to: spec.to, underFilter: spec.underFilter, toTop: spec.toTop, faceDown: spec.faceDown };
      const alternatives = spec.orDispositions ?? [];
      if (alternatives.length > 0) {
        const choices = [disposition, ...alternatives];
        const labels = choices.map((choice) => choice.to ?? "hand");
        const picked = await ctx.ask.chooseOption(ctx, labels);
        disposition = choices[picked] ?? disposition;
      }
      if (disposition.to === "play") toPlay.push({ instanceId: c.instanceId, costDelta: spec.costDelta });
      else if (disposition.to === "trash") toTrash.push(c.instanceId);
      else if (disposition.to === "digivolve")
        toDigivolve.push({ instanceId: c.instanceId, target: spec.digivolveTarget });
      else if (disposition.to === "security")
        toSecurity.push({
          instanceId: c.instanceId,
          toTop: disposition.toTop ?? true,
          faceDown: disposition.faceDown ?? true,
        });
      else if (disposition.to === "placeUnder")
        toPlaceUnder.push({ instanceId: c.instanceId, underFilter: disposition.underFilter });
      else if (disposition.to === "underTamer")
        toUnderTamer.push({ instanceId: c.instanceId, underFilter: disposition.underFilter });
      else toHand.push(c.instanceId);
    }
  }

  for (const selected of toSecurity) {
    await ctx.fx.addSecurity(seat, [selected.instanceId], {
      toTop: selected.toTop,
      faceUp: !selected.faceDown,
    });
  }
  if (toHand.length > 0) await ctx.fx.returnToHand(toHand);
  if (action.trackCount !== undefined) {
    ctx.namedCounts ??= new Map();
    ctx.namedCounts.set(action.trackCount, toHand.length);
  }
  if (action.trackPlayedCount !== undefined) {
    ctx.namedCounts ??= new Map();
    ctx.namedCounts.set(action.trackPlayedCount, toPlay.length);
  }
  if (toTrash.length > 0) await ctx.fx.trash(toTrash, { byEffectSeat: ctx.source.ownerSeat });
  if (toPlay.length > 0) {
    const toPlayIds = toPlay.map((p) => p.instanceId);
    await ctx.fx.returnToHand(toPlayIds, { silent: true });
    // Group by costDelta so a "play with the cost reduced by N" spec (BT25-074) plays
    // separately from a plain "without paying the cost" spec (payCost: false) in the
    // same RevealAdd action.
    const freeIds = toPlay.filter((p) => p.costDelta === undefined).map((p) => p.instanceId);
    const reducedGroups = new Map<number, string[]>();
    for (const p of toPlay) {
      if (p.costDelta === undefined) continue;
      const group = reducedGroups.get(p.costDelta) ?? [];
      group.push(p.instanceId);
      reducedGroups.set(p.costDelta, group);
    }
    // Effect-played cards must open their own [On Play] window and `whenPlayed` bus.
    // `playFromHand` is the legacy placement-only primitive; `playInstances` owns the
    // complete effect-play lifecycle (ST13-02 revealing ST13-09, and the wider reveal-play
    // family). The revealed cards were staged into hand above solely to leave the reveal pool.
    if (freeIds.length > 0) await ctx.fx.playInstances(freeIds, { payCost: false });
    for (const [costDelta, ids] of reducedGroups) {
      // "With the play cost reduced by N" is not a free play. The old call omitted
      // `payCost:true`, silently waiving the remaining cost in every RevealAdd reduced-play.
      await ctx.fx.playInstances(ids, { payCost: true, costDelta });
    }
  }
  // "place N [X] as the bottom digivolution card of one of your [Y] Digimon"
  if (toPlaceUnder.length > 0) {
    for (const { instanceId, underFilter } of toPlaceUnder) {
      const candidates = ctx.game.player(seat).battleArea.filter((p) => {
        if (!p.topCard || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
        return underFilter === undefined || permanentMatchesFilter(ctx, p, underFilter, ctx.source);
      });
      if (candidates.length === 0) {
        // No legal host; return to deck bottom (the effect can't fire without a valid host).
        await ctx.fx.returnToDeck([instanceId], { toTop: false });
        continue;
      }
      let hostPermanentId = candidates[0]!.permanentId;
      if (candidates.length > 1) {
        const chosen = await ctx.ask.chooseTargets(ctx, {
          candidates: candidates.map((p) => p.permanentId),
          min: 1,
          max: 1,
        });
        if (chosen.length > 0) hostPermanentId = chosen[0]!;
      }
      // Move the revealed card from the revealed pool to the host's digivolution stack (bottom).
      await ctx.fx.placeUnder(hostPermanentId, [instanceId]);
    }
  }
  // "place N [X] under one of your Tamer permanents" (BT19-055 `to:"underTamer"`):
  // controller chooses which of their Tamer permanents receives the card.
  if (toUnderTamer.length > 0) {
    const tamerCandidates = ctx.game.player(seat).battleArea.filter((p) => {
      if (!p.topCard) return false;
      const topDef = ctx.game.definitionOf(p.topCard);
      return topDef.kinds.includes("Tamer" as never);
    });
    for (const { instanceId, underFilter } of toUnderTamer) {
      const candidates = tamerCandidates.filter(
        (p) => underFilter === undefined || permanentMatchesFilter(ctx, p, underFilter, ctx.source),
      );
      if (candidates.length === 0) {
        await ctx.fx.returnToDeck([instanceId], { toTop: false });
        continue;
      }
      let hostPermanentId = candidates[0]!.permanentId;
      if (candidates.length > 1) {
        const chosen = await ctx.ask.chooseTargets(ctx, {
          candidates: candidates.map((p) => p.permanentId),
          min: 1,
          max: 1,
        });
        if (chosen.length > 0) hostPermanentId = chosen[0]!;
      }
      await ctx.fx.placeUnder(hostPermanentId, [instanceId]);
    }
  }
  // The rest: send to deck bottom/top (trash is rarer; treated as deckBottom). A
  // reveal-evolution calls this after its bonus draw but before the evolved card's
  // [When Digivolving] window (BT1-078 KB Q931/Q932).
  const disposeRest = async (): Promise<void> => {
    let rest = revealed.filter((c) => !taken.has(c.instanceId)).map((c) => c.instanceId);
    if (rest.length === 0) return;
    if (action.rest === "trash") await ctx.fx.trash(rest, { byEffectSeat: ctx.source.ownerSeat });
    else if (action.rest === "deckTopOrBottom") {
      const choice = await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"]);
      if (rest.length > 1) {
        rest =
          (await ctx.ask.orderCards?.(ctx, {
            candidates: rest,
            visibleCards: revealed
              .filter((card) => rest.includes(card.instanceId))
              .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
            destination: choice === 0 ? "deckTop" : "deckBottom",
          })) ?? rest;
      }
      const toTop = choice === 0;
      await ctx.fx.returnToDeck(toTop ? [...rest].reverse() : rest, { toTop });
    } else {
      if (rest.length > 1) {
        rest =
          (await ctx.ask.orderCards?.(ctx, {
            candidates: rest,
            visibleCards: revealed
              .filter((card) => rest.includes(card.instanceId))
              .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
            destination: action.rest === "deckTop" ? "deckTop" : "deckBottom",
          })) ?? rest;
      }
      const toTop = action.rest === "deckTop";
      await ctx.fx.returnToDeck(toTop ? [...rest].reverse() : rest, { toTop });
    }
  };

  let restDisposed = false;
  // `reveal()` exposes cards in place at the top of the deck. Stage the unchosen
  // portion out of that deck before an effect-driven digivolution so its mandatory
  // bonus draw cannot take one of the revealed cards. `silent` is essential: this is
  // a transient reveal pool, not an effect adding cards to hand.
  if (toDigivolve.length > 0) {
    const restToStage = revealed.filter((card) => !taken.has(card.instanceId)).map((card) => card.instanceId);
    if (restToStage.length > 0) await ctx.fx.returnToHand(restToStage, { silent: true });
  }
  // Effect-driven "digivolve into a revealed card" resolves its bonus draw before
  // returning the remaining reveal pool, which keeps that draw restricted to the
  // unrevealed deck. The primitive invokes the callback before it opens the evolved
  // card's [When Digivolving] window, so the returned cards are no longer visible
  // to that window.
  for (const pending of toDigivolve) {
    const revealedCard = revealed.find((card) => card.instanceId === pending.instanceId);
    if (revealedCard === undefined) continue;
    const into = ctx.game.definitionOf(revealedCard);
    const target = pending.target ?? { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 };
    const targets = await resolvePermanentTargets(ctx, target, {
      eligible: (permanentId) => {
        const permanent = ctx.game.permanentById(permanentId);
        if (permanent?.topCard === undefined) return false;
        const base = ctx.game.definitionOf(permanent.topCard);
        return (
          matchingEvoCost(into, base) !== undefined ||
          matchingAlternateDigivolutionRequirement(into, base) !== undefined
        );
      },
    });
    if (targets.length === 0) continue;
    await ctx.fx.returnToHand([pending.instanceId], { silent: true });
    await ctx.fx.digivolveFromInstance(targets[0]!, pending.instanceId, {
      payCost: pending.payCost ?? false,
      draw: true,
      beforeWhenDigivolving: async () => {
        if (restDisposed) return;
        restDisposed = true;
        await disposeRest();
      },
    });
  }
  if (!restDisposed) await disposeRest();
}

/**
 * BT14-067-style reveal-reference budget:
 * opponent reveals top N, controller chooses one revealed Digimon card, deletes
 * opponent Digimon whose total printed play cost is <= the chosen card's play cost,
 * then returns the revealed pool to top or bottom of the revealed player's deck.
 */
async function runRevealChooseDeleteBudget(
  ctx: EffectContext,
  action: Extract<Action, { kind: "RevealChooseDeleteBudget" }>,
): Promise<void> {
  const ownerSeat = ctx.source.ownerSeat;
  const revealSeat = action.revealController === "opponent" ? ctx.game.opponentOf(ownerSeat) : ownerSeat;
  const revealed = await ctx.fx.reveal(revealSeat, action.revealCount);
  if (revealed.length === 0) {
    ctx.lastDeleteCount = 0;
    return;
  }
  ctx.lastRevealedCards = revealed.map((card) => ({
    instanceId: card.instanceId,
    cardId: card.cardId,
    ownerSeat: card.ownerSeat,
  }));

  const visible = revealed.map((card) => card.instanceId);
  const referenceCandidates = revealed.filter((card) =>
    definitionMatches(action.chooseFilter, ctx.game.definitionOf(card)),
  );
  if (referenceCandidates.length > 0) {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: referenceCandidates.map((card) => card.instanceId),
      visible,
      visibleCards: revealed.map((card) => ({
        instanceId: card.instanceId,
        cardId: card.cardId,
      })),
      min: 1,
      max: 1,
    });
    const reference = referenceCandidates.find((card) => card.instanceId === chosen[0]);
    const budget = reference !== undefined ? (ctx.game.definitionOf(reference).playCost ?? 0) : 0;
    const candidates = candidatePermanents(ctx, {
      filter: action.deleteFilter,
      count: "all",
    } as Target);
    if (action.deleteCount !== undefined) {
      const eligible = candidates.filter((permanent) => {
        const cost = permanent.topCard !== undefined ? (ctx.game.definitionOf(permanent.topCard).playCost ?? 0) : 0;
        return cost <= budget;
      });
      const max = Math.min(action.deleteCount, eligible.length);
      const min = action.upTo ? 0 : max;
      const chosenTargets =
        max > 0
          ? await ctx.ask.chooseTargets(ctx, {
              candidates: eligible.map((permanent) => permanent.permanentId),
              min,
              max,
            })
          : [];
      ctx.lastDeleteCount = chosenTargets.length > 0 ? await ctx.fx.deletePermanent(chosenTargets) : 0;
    } else {
      const byCost = candidates
        .map((permanent) => {
          const cost = permanent.topCard !== undefined ? (ctx.game.definitionOf(permanent.topCard).playCost ?? 0) : 0;
          return { permanentId: permanent.permanentId, cost };
        })
        .sort((a, b) => a.cost - b.cost);
      const selected: string[] = [];
      let spent = 0;
      for (const candidate of byCost) {
        if (spent + candidate.cost > budget) {
          if (action.upTo) continue;
          break;
        }
        const yes = action.upTo
          ? await ctx.ask.optional(
              ctx,
              `Delete ${candidate.permanentId} (cost ${candidate.cost}, spent ${spent}/${budget})?`,
            )
          : true;
        if (yes) {
          selected.push(candidate.permanentId);
          spent += candidate.cost;
        }
      }
      ctx.lastDeleteCount = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
    }
  } else {
    ctx.lastDeleteCount = 0;
  }

  let ordered = visible;
  if (action.returnOrder === "controllerChoice" && visible.length > 1) {
    const chosenOrder = await ctx.ask.selectCards(ctx, {
      candidates: visible,
      visible,
      visibleCards: revealed.map((card) => ({
        instanceId: card.instanceId,
        cardId: card.cardId,
      })),
      min: visible.length,
      max: visible.length,
    });
    if (chosenOrder.length === visible.length) ordered = chosenOrder;
  }

  if (action.returnRevealed === "trash") {
    await ctx.fx.trash(ordered, { byEffectSeat: ctx.source.ownerSeat });
  } else if (action.returnRevealed === "deckTopOrBottom") {
    const choice = await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"]);
    const toTop = choice === 0;
    await ctx.fx.returnToDeck(toTop ? [...ordered].reverse() : ordered, { toTop });
  } else {
    const toTop = action.returnRevealed === "deckTop";
    await ctx.fx.returnToDeck(toTop ? [...ordered].reverse() : ordered, { toTop });
  }
}

/**
 * Turn an IR action kind into a readable phrase ("GainMemory" -> "Gain memory").
 * This is the last resort for {@link describeAction}: every prompt it produces is
 * shown to a player, so a bare internal identifier must never reach the client.
 */
function humanizeActionKind(kind: string): string {
  const words = kind.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(" ");
  const [first, ...rest] = words;
  return [first, ...rest.map((word) => (word.length > 2 ? word.toLowerCase() : word))].join(" ");
}

/** Short human description of an action for an optional prompt / log. */
function describeAction(action: Action): string {
  switch (action.kind) {
    case "Draw":
      return `Draw ${action.amount}`;
    case "Delete":
      return action.raw ?? `Delete ${String(action.target.count)} target(s)`;
    case "Trash":
      return `Trash ${String(action.target.count)} card(s)`;
    case "Return":
      return `Return ${String(action.target.count)} to ${action.to}`;
    case "ModifyDP":
      return `Modify DP by ${action.amount}`;
    case "SetBaseDP":
      return `Set base DP to ${action.value}`;
    case "PlayWithoutCost":
      return "Play without paying the cost";
    case "PlaceUnder":
      return `Place ${action.target.upTo ? "up to " : ""}${String(action.target.count)} card(s) under`;
    case "RevealAdd":
      return `Reveal top ${action.revealCount} and add`;
    case "GainMemory":
      return action.amount < 0 ? `Lose ${-action.amount} memory` : `Gain ${action.amount} memory`;
    case "SetMemory":
      return `Set memory to ${action.value}`;
    case "Suspend":
      return `Suspend ${String(action.target.count)} target(s)`;
    case "Unsuspend":
      return `Unsuspend ${String(action.target.count)} target(s)`;
    case "GainKeyword":
      return `Gain ${action.keyword.raw ?? action.keyword.keyword}`;
    case "TrashTopDeck":
      return `Trash ${action.upTo ? "up to " : ""}${action.amount} card(s) from the top of the deck`;
    case "Hatch":
      return "Hatch a Digi-Egg";
    case "Search":
      return "Search your deck";
    case "Digivolve":
      return "Digivolve";
    case "DnaDigivolve":
      return "DNA digivolve";
    case "DeDigivolve":
      return "De-Digivolve";
    default:
      return humanizeActionKind(action.kind);
  }
}

// ---------------------------------------------------------------------------
// IR -> EffectModule factory
// ---------------------------------------------------------------------------

/**
 * Map an IR trigger + the source flags to an engine EffectTiming. Returns
 * undefined for triggers with no current EffectTiming home (the card simply
 * contributes nothing at any timing for that effect — visible as "none" stub).
 */
function timingForTrigger(effect: CardEffect): EffectTiming | undefined {
  if (effect.isSecurity) return EffectTiming.SecuritySkill;
  switch (effect.trigger) {
    case "OnPlay":
      return EffectTiming.OnPlay;
    case "BeforePayCost":
      // "When this card would be played" — the pay-time window fired by the play action for the
      // in-hand card BEFORE memory is paid (EX9-043 / BT25-076 interactive cost reduction).
      return EffectTiming.BeforePayCost;
    case "WhenDigivolving":
      return EffectTiming.WhenDigivolving;
    case "WhenAttacking":
      return EffectTiming.OnUseAttack;
    case "WhenBlocked":
      return EffectTiming.OnBlockAnyone;
    case "OnDeletion":
      return EffectTiming.OnDestroyedAnyone;
    case "EndOfAttack":
      return EffectTiming.OnEndAttack;
    case "WhenBattleDeleteOpponent":
      return EffectTiming.OnBattleDeleteOpponent;
    case "whenTrashedFromBattleArea":
      return EffectTiming.WhenTrashedFromBattleArea;
    case "StartOfYourTurn":
    case "StartOfOpponentsTurn":
      return EffectTiming.OnStartTurn;
    case "StartOfYourMainPhase":
    case "StartOfOpponentsMainPhase":
      return EffectTiming.OnStartMainPhase;
    case "EndOfYourTurn":
    case "EndOfOpponentsTurn":
    case "EndOfAllTurns":
      return EffectTiming.OnEndTurn;
    case "Main":
      // A ＜Delay＞-keyworded [Main] clause is NOT the on-play option effect — it is the
      // delayed activatable ("by trashing this card in your battle area, [payload]; can't
      // activate the turn it enters"), surfaced as an OnDeclaration ability on the option
      // permanent the on-play effect placed. Routing it here keeps it OFF the OnUseOption play
      // resolution so it no longer fires immediately on play.
      if ((effect.keywords ?? []).some((kw) => kw.keyword === "Delay")) {
        return EffectTiming.OnDeclaration;
      }
      return EffectTiming.OnUseOption;
    case "Security":
      return EffectTiming.SecuritySkill;
    case "Hand":
      return EffectTiming.OnDeclaration;
    case "Counter":
      // A ＜Blast Digivolve＞/＜Blast DNA Digivolve＞-keyworded "Counter" entry is NOT a real
      // [Counter] effect — it's the compiler's marker for those keywords (§16-26/§16-31; see
      // BT14-014/AD1-005/BT19-050's empty-actions Counter entries and EX5-053's hand-written
      // self-GainKeyword variant, plus the "[Hand][Counter] marker" callout in
      // ch16c-deletion-and-advanced-keywords.test.ts's AD1-005 case — isBlastDigivolveMarker
      // recognizes both compile shapes). §16-26-1/§16-31-1's actual behavior — digivolving from
      // hand without paying the cost — is implemented at the `digivolve` verb (GameEngine's
      // digivolveDeps -> DigivolveDeps.costWaived, sourced from registerBlastDigivolveFromEffects'
      // hasBlastDigivolveKeyword registry below), NOT through this marker's IR routing: its
      // `actions` are empty, so there is nothing for the effect-activation framework to resolve
      // either way. Routing it here keeps it OFF the real §11-3 Counter Timing window (which
      // would otherwise offer a no-op/mistagged activation there) and back at its old
      // OnDeclaration home — already unreachable there (activateEffect.ts gates on the turn
      // player / Phase.Main / a board-placed source, none of which a defending player's hand
      // card satisfies), so this preserves prior behavior.
      if (isBlastDigivolveMarker(effect)) {
        return EffectTiming.OnDeclaration;
      }
      // §11-3 Counter Timing: activated by the non-turn (defending) player between
      // an attack's When Attacking effects and block timing, capped at 1 per attack
      // (§11-3-2) — its own window, distinct from the turn-player's OnDeclaration
      // [Main]-activation bucket (activateEffect.ts ACTIVATE_TIMING).
      return EffectTiming.OnCounterTiming;
    case "WhenMoving":
      // §15-16-16-1: "[When Moving] triggers at the point the card with that effect is
      // moved." — the engine's own OnMove window (GameEngine fires it exactly at the
      // breeding <-> battle move point), not the continuous/static bucket.
      return EffectTiming.OnMove;
    case "AllTurns":
    case "YourTurn":
    case "OpponentsTurn":
    case "Trash":
    case "Breeding":
    case "Rule":
    case "Static":
      return EffectTiming.None; // continuous / static window
    default:
      return EffectTiming.None;
  }
}

/**
 * Every EffectTiming window an effect contributes at. Usually one (timingForTrigger),
 * but a `[Main]` effect has TWO homes, reconciling the IR with the engine's two
 * distinct main windows:
 *   - {@link EffectTiming.OnUseOption} — an Option's [Main] body, fired by play-card
 *     when the Option resolves from hand.
 *   - {@link EffectTiming.OnDeclaration} — a player-activated [Main] ability on a
 *     permanent, reached via the `activateEffect` verb (ACTIVATE_TIMING). The IR files
 *     every `[Main]` under one trigger, so without also exposing it here a permanent's
 *     activated [Main] ability would be unreachable (the verb queries OnDeclaration).
 * The kernel/verb placement guards keep each correct: play-card only fires OnUseOption
 * for the resolving Option, and activateEffect only reaches a controlled source.
 *
 * The OnDeclaration co-home must NOT be given to an Option's ON-PLAY BODY — its first [Main]
 * clause, the one play-card fires via OnUseOption. Exposing that at OnDeclaration too would make
 * an Option that places itself as a battle-area permanent (the whole option-permanent family)
 * re-activate its play effect on the permanent. A LATER [Main] clause on an option permanent IS a
 * genuine activated ability (e.g. P-103/P-104's "trash self, then digivolve") and keeps the
 * co-home; a ＜Delay＞ clause is keyworded and already routes to OnDeclaration via timingForTrigger.
 * `isOptionPlayBody` (computed by irCardModule, which tracks the first plain [Main]) flags the one
 * clause to restrict.
 */
function timingsForTrigger(effect: CardEffect, isOptionPlayBody: boolean): EffectTiming[] {
  const primary = timingForTrigger(effect);
  if (primary === undefined) return [];
  const isDelay = (effect.keywords ?? []).some((kw) => kw.keyword === "Delay");
  if (!effect.isSecurity && effect.trigger === "Main" && !isDelay && !isOptionPlayBody) {
    return [EffectTiming.OnUseOption, EffectTiming.OnDeclaration];
  }
  return [primary];
}

/**
 * A `Static` effect whose only job is a digivolve-cost CostModifier (e.g. BT7-040's
 * "When digivolving into this card from your hand, the cost = your security count")
 * is HAND-RESIDENT: the source is the digivolution target sitting in hand, so it must
 * NOT carry the on-field base guard that `staticModifier` applies (which would make it
 * inert). Detect that shape so the IR routes it through `digivolveCostStatic`.
 */
function isHandResidentDigivolveCostStatic(effect: CardEffect): boolean {
  const isStaticTrigger = effect.trigger === "Static" || effect.trigger === "Rule";
  if (!isStaticTrigger) return false;
  const actions = effect.actions ?? [];
  if (actions.length === 0) return false;
  // Gate on the POSITIVE hand-resident marker the runtime record emits (documented behavior
  // `HandCards.Contains(card)` + `cardSource == card`), not merely on "all actions are
  // digivolve CostModifiers". An on-field digivolve-cost static (which lacks the marker)
  // must NOT lose its on-field base guard via this hand-permissive route (WR-01).
  return actions.every((a) => a.kind === "CostModifier" && a.handResident === true);
}

/**
 * A `Static`/`Rule` effect whose actions are ALL `WaiveColorRequirement` (§16-42 ＜Use
 * Req.＞ and the pre-existing corpus idiom it now matches — EX2-072, BT19-093, BT7-110,
 * ...) must not carry `staticModifier`'s on-field base guard. `WaiveColorRequirement`'s
 * only supported shape is self-targeted, so the effect always describes "waive the SAME
 * card's own color requirement" — checked at PLAY time (playCard.ts) or DIGIVOLVE time
 * (digivolve.ts), i.e. while the card is off the battle area. Requiring on-field presence
 * first makes the waiver permanently inert for that moment (see `colorWaiverStatic` in
 * builders.ts for the full writeup). Scoped narrowly, mirroring
 * `isHandResidentDigivolveCostStatic`: an ordinary Static effect that ALSO does something
 * else keeps the on-field guard untouched.
 */
function isColorWaiverStatic(effect: CardEffect): boolean {
  const isStaticTrigger = effect.trigger === "Static" || effect.trigger === "Rule";
  if (!isStaticTrigger) return false;
  const actions = effect.actions ?? [];
  if (actions.length === 0) return false;
  return actions.every((a) => a.kind === "WaiveColorRequirement");
}

/**
 * A Static/Rule/YourTurn/AllTurns/OpponentsTurn effect whose actions are ALL a SubTrigger
 * install for a HAND-anchor-less event ("when this card is trashed from the hand", "when
 * your hand is trashed" — BT24-013/-026/-045) must not carry `staticModifier`'s on-field
 * base guard: the watching card is resident in HAND when these events are relevant, never
 * on the battle area (the same shape `isColorWaiverStatic`/`isHandResidentDigivolveCostStatic`
 * handle one gate over). Without this, `canTrigger` fails before the effect ever reaches
 * `resolve()`, so the eighth-gap anchor-less `subscribeSubTrigger` fix never gets a chance
 * to install the watcher at all — proven empirically (BT24-013 registered in hand, trashed,
 * no draw fired) even after the anchor fix alone.
 */
const HAND_TRASH_ANCHOR_LESS_EVENTS = new Set(["whenTrashedFromHand", "whenHandTrashed"]);
function isHandTrashWatcherHost(effect: CardEffect): boolean {
  // Inherited reactions only exist while their card is in a Digimon's stack. Routing them
  // through the hand-resident builder makes loose copies in hand/trash install phantom
  // watchers (BT6-006/-069/-073), so a later discard can trigger cards that were never in play.
  if (effect.isInherited) return false;
  const continuousLikeTrigger =
    effect.trigger === "Static" ||
    effect.trigger === "Rule" ||
    effect.trigger === "YourTurn" ||
    effect.trigger === "AllTurns" ||
    effect.trigger === "OpponentsTurn";
  if (!continuousLikeTrigger) return false;
  const actions = effect.actions ?? [];
  if (actions.length === 0) return false;
  return actions.every(
    (a) => a.kind === "SubTrigger" && HAND_TRASH_ANCHOR_LESS_EVENTS.has((a as { event?: string }).event ?? ""),
  );
}

/** Pick the timing builder that matches an IR trigger. */
function builderForTrigger(effect: CardEffect): (opts: BuilderOptions) => Effect {
  if (effect.isSecurity || effect.trigger === "Security") return security;
  if (isHandResidentDigivolveCostStatic(effect)) return digivolveCostStatic;
  if (isColorWaiverStatic(effect)) return colorWaiverStatic;
  if (isHandTrashWatcherHost(effect)) return onAddHand;
  // A `{Breeding}` timed effect (BT22-007 {Breeding}[Start of Your Main Phase]) keeps its timing
  // (OnStartMainPhase) and turn-owner gate, but its base "still-relevant" guard is "in breeding"
  // rather than "on the battle area". The `breeding` builder supplies
  // that base guard; turnOwnerGuard(effect.trigger) is still ANDed in via the builder `when`.
  if (effect.isBreeding) return breeding;
  // `[Trash]`-tagged timed/continuous effects (§15-14-3-1, e.g. BT26-078's `[Trash][Your
  // Turn]`) keep their timing but swap the base "still-relevant" guard from on-field to
  // actual trash residency — mirroring `effect.isBreeding` above. `[Trash][Main]` is
  // handled separately (see `activated`'s `isFromTrash` opt): it shares the `Main`
  // trigger with every ordinary activated ability, so it cannot be routed by builder
  // selection alone.
  if (effect.isFromTrash && effect.trigger !== "Main") return inTrash;
  switch (effect.trigger) {
    case "OnPlay":
      return onPlay;
    case "BeforePayCost":
      return beforePayCost;
    case "WhenDigivolving":
      return whenDigivolving;
    case "WhenAttacking":
      return whenAttacking;
    case "OnDeletion":
      return onDeletion;
    case "whenTrashedFromBattleArea":
      return whenTrashedFromBattleArea;
    case "Main":
      return activated;
    case "Hand":
      return onAddHand;
    case "Trash":
      return inTrash;
    case "Breeding":
      return breeding;
    case "AllTurns":
    case "YourTurn":
    case "OpponentsTurn":
    case "Static":
    case "Rule":
      return staticModifier;
    default:
      return turnTiming;
  }
}

/**
 * Mark every top-level SubTrigger/Replacement action of a continuous-window ＜Delay＞ effect
 * (CAP-E14 fix, comprehensive rules §16-17) with an INTRINSIC delay gate: "while this card is
 * in the battle area, by trashing it, the effect activates" applies regardless of whether the
 * arming condition is a reactive event (`[All Turns] When X, ＜Delay＞`) rather than a player-
 * declared `[Main]` window — the OnDeclaration branch above already covers the latter. Skips
 * any action that already opts into the separate GainKeyword-armed model
 * (`requiresDelayArmed`, e.g. BT17-097's dynamically-granted Delay) — that model's grant/consume
 * gate is a deliberate, distinct encoding and is left untouched. `delayArmedIntrinsic` is a
 * synthesized marker read by `runSubTrigger`/`runReplacement`, not part of the compiled IR.
 */
function withIntrinsicDelayGate(effect: CardEffect): CardEffect {
  const actions = (effect.actions ?? []).map((action): typeof action => {
    if (action.kind !== "SubTrigger" && action.kind !== "Replacement") return action;
    if ((action as { requiresDelayArmed?: boolean }).requiresDelayArmed === true) return action;
    return { ...action, delayArmedIntrinsic: true } as unknown as typeof action;
  });
  return { ...effect, actions };
}

/** Carry a continuous effect's printed frequency onto the watcher that actually fires. */
function withSubTriggerFrequency(effect: CardEffect, effectKey: string): CardEffect {
  if (effect.frequency !== "OncePerTurn") return effect;
  const actions = (effect.actions ?? []).map((action): typeof action =>
    action.kind === "SubTrigger" ? ({ ...action, oncePerTurnKey: effectKey } as typeof action) : action,
  );
  return { ...effect, actions };
}

/**
 * A continuous effect that reads a live keyword depends on keyword-provider effects from the
 * same board. This includes `selfHasKeyword` conditions and TargetFilter keyword clauses such
 * as Craniamon's "all of your Digimon with Blocker" restriction. Providers must resolve at
 * priority 0 and these consumers at priority 1, otherwise board enumeration order can make a
 * conferred/inherited keyword invisible for the whole continuous pass.
 */
function readsSelfKeyword(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(readsSelfKeyword);
  const record = value as Record<string, unknown>;
  if (record.kind === "selfHasKeyword") return true;
  const filter = record.filter;
  if (filter !== null && typeof filter === "object" && !Array.isArray(filter)) {
    const candidate = filter as Record<string, unknown>;
    if (
      (Array.isArray(candidate.keywords) && candidate.keywords.length > 0) ||
      (Array.isArray(candidate.excludeKeywords) && candidate.excludeKeywords.length > 0)
    ) {
      return true;
    }
  }
  return Object.values(record).some(readsSelfKeyword);
}

/**
 * (`(!yourTurn || IsOwnerTurn) && (!opponentTurn || IsOpponentTurn)`). A `[Your Turn]` /
 * StartOf-Your / EndOf-Your effect may fire only while its owner is the turn player; the
 * `[Opponent's Turn]` variants only on the opponent's turn. AllTurns / Static / Rule have no
 * turn gate. The IR carries the owner in the trigger string but emits no `isYourTurn`
 * condition, so the gate is derived here (and routed through the builder's `when`, ANDed
 * into `canTrigger`) rather than read from a `when` clause.
 */
function turnOwnerGuard(trigger: CardEffect["trigger"]): ((ctx: EffectContext) => boolean) | undefined {
  switch (trigger) {
    case "YourTurn":
    case "StartOfYourTurn":
    case "StartOfYourMainPhase":
    case "EndOfYourTurn":
      return (ctx) => ctx.game.state.turnSeat === ctx.source.ownerSeat;
    case "OpponentsTurn":
    case "StartOfOpponentsTurn":
    case "StartOfOpponentsMainPhase":
    case "EndOfOpponentsTurn":
      return (ctx) => ctx.game.state.turnSeat === ctx.game.opponentOf(ctx.source.ownerSeat);
    default:
      return undefined;
  }
}

/** Run all actions of a CardEffect in order against the context. */
async function runEffect(ctx: EffectContext, effect: CardEffect): Promise<void> {
  if (effect.condition && !evaluateCondition(ctx, effect.condition)) return;
  // Turn-condition gate for triggers that carry an explicit turnCondition field rather than
  // encoding the turn direction in the trigger name (e.g. whenTrashedFromBattleArea, BT19-095).
  if (effect.turnCondition !== undefined) {
    const isOwnerTurn = ctx.game.state.turnSeat === ctx.source.ownerSeat;
    if (effect.turnCondition === "yourTurn" && !isOwnerTurn) return;
    if (effect.turnCondition === "opponentsTurn" && isOwnerTurn) return;
  }
  // Fresh selection-binding store for this resolution (SelectBind -> later relativeTo refs).
  const ctxWithSelections: EffectContext = ctx.selections ? ctx : { ...ctx, selections: new Map() };
  ctxWithSelections.activeTiming = effect.trigger;
  ctxWithSelections.activeEffectText = effect.isInherited
    ? ctx.source.definition.inheritedEffectText
    : effect.isSecurity
      ? ctx.source.definition.securityEffectText
      : ctx.source.definition.effectText;
  const actions = effect.actions ?? [];
  if (actions.length === 0 && (effect.keywords?.length ?? 0) > 0) {
    const durationStr =
      effect.trigger === "Static" || effect.trigger === "Rule" || effect.trigger === "YourTurn"
        ? "permanent"
        : "forTheTurn";
    for (const kw of effect.keywords ?? []) {
      await runAction(ctxWithSelections, {
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: {
          keyword: kw.keyword,
          ...(kw.amount !== undefined ? { amount: kw.amount } : {}),
        },
        duration: durationStr,
      });
    }
    return;
  }
  if (effect.trigger === "Static") {
    for (const keyword of effect.keywords ?? []) {
      if (keyword.keyword === "Reboot" || ACTION_TYPE_KEYWORDS.has(keyword.keyword)) continue;
      await runAction(ctxWithSelections, {
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: {
          keyword: keyword.keyword,
          ...(keyword.amount !== undefined ? { amount: keyword.amount } : {}),
        },
        duration: "permanent",
      });
    }
  }
  const isRebootMarker =
    effect.trigger === "Static" && (effect.keywords ?? []).some((keyword) => keyword.keyword === "Reboot");
  if (isRebootMarker) {
    const self = ctxWithSelections.source.permanent();
    if (self !== undefined) {
      ctxWithSelections.fx.grantKeyword(self.permanentId, "Reboot", EffectDuration.Permanent);
    }
  }
  for (const action of actions) {
    // Legacy compiled Reboot records carry a self-Unsuspend action beside the keyword
    // marker. It describes what Reboot does during the opponent's unsuspend phase; it is
    // not a continuously re-fired "unsuspend now" action. Executing it in the static pass
    // makes a Reboot Digimon stand back up immediately after declaring an attack.
    if (isRebootMarker && action.kind === "Unsuspend") continue;
    const abort = await runAction(ctxWithSelections, action);
    if (abort) break;
  }
}

/**
 * CR §15-6-3: "an effect can't be activated when none of its processing conditions are
 * met." CR §15-8-4-3-1: "a player can only declare activation of an activation-type effect
 * while its processing conditions are met" — and an action's own cost ("by paying N cost")
 * is such a processing condition: declaring an activation whose cost can't be paid must be
 * refused outright, not accepted and left to fail at resolution.
 *
 * A whole-effect `condition` is a hard gate. Below that, an effect's actions are a
 * DISJUNCTION of processing conditions (condition AND cost together) — activation is
 * refused only when EVERY action is gated (by a condition, a cost, or both) and NONE of
 * them currently has both its condition met and its cost payable; an effect with at least
 * one action that carries neither gate always stays activatable. `RawUnparsed` actions are
 * skipped, mirroring `runAction`'s own handling of unparsed IR.
 *
 * A `raw` (unparsed) condition, or a cost kind `canPayCost` cannot evaluate, is excluded
 * from the gate on BOTH sides: the interpreter cannot tell whether it holds/is payable, so
 * it must not silently REFUSE an activation the game would actually allow
 * (evaluateCondition's own "unrecognized => unmet" default, and canPayCost's own "unknown =>
 * payable" default, exist as resolve-time no-op safety nets, not as license to gate
 * activation on a guess).
 */
function canActivateEffect(ctx: EffectContext, effect: CardEffect): boolean {
  if (effect.condition && effect.condition.kind !== "raw" && !evaluateCondition(ctx, effect.condition)) return false;
  const relevantActions = (effect.actions ?? []).filter((action) => action.kind !== "RawUnparsed");
  const isGated = (action: Action) =>
    action.kind === "DnaDigivolve" ||
    (action.kind !== "ConditionalBranch" && action.condition !== undefined && action.condition.kind !== "raw") ||
    (action.cost !== undefined && action.cost.kind !== "raw");
  // A leading abort-on-decline action is the activation gate for the complete clause:
  // "If ..., by paying ..., do X. Then, do Y." The dependent `Then` action is often
  // mechanically ungated because it consumes a binding produced by X; treating Y as an
  // independent processing path would allow the player to declare the effect when X's
  // condition/cost is impossible (BT10-025). Mirror runEffect's ordered abort semantics here.
  const leadingAction = relevantActions[0];
  if (leadingAction?.abortOnDecline === true && isGated(leadingAction)) {
    const intrinsicPossible = leadingAction.kind !== "DnaDigivolve" || canAttemptDnaDigivolve(ctx, leadingAction);
    const conditionMet =
      leadingAction.condition === undefined ||
      leadingAction.condition.kind === "raw" ||
      evaluateCondition(ctx, leadingAction.condition);
    const costPayable = leadingAction.cost === undefined || canPayCost(ctx, leadingAction.cost);
    return intrinsicPossible && conditionMet && costPayable;
  }
  const gatedActions = relevantActions.filter(isGated);
  const ungatedCount = relevantActions.length - gatedActions.length;
  if (gatedActions.length === 0 || ungatedCount > 0) return true;
  return gatedActions.some((action) => {
    const intrinsicPossible = action.kind !== "DnaDigivolve" || canAttemptDnaDigivolve(ctx, action);
    const conditionMet =
      action.condition === undefined || action.condition.kind === "raw" || evaluateCondition(ctx, action.condition);
    const costPayable = action.cost === undefined || canPayCost(ctx, action.cost);
    return intrinsicPossible && conditionMet && costPayable;
  });
}

/**
 * Synchronous availability gate for a triggered optional DNA action. It deliberately
 * runs before `orderTriggers`, so an inherited end-of-turn effect cannot ask the
 * player to confirm/select materials when no DNA result exists in hand (ST10-04).
 * Full material-requirement validation remains authoritative in `runDnaDigivolve`;
 * this preflight only proves that every declared material slot and a result candidate
 * exist without opening any decisions.
 */
function canAttemptDnaDigivolve(ctx: EffectContext, action: Extract<Action, { kind: "DnaDigivolve" }>): boolean {
  if (action.into === undefined) return false;
  const intoTarget = dnaResultTarget(action.into);
  const intoZone = intoTarget.filter.zone;
  const intoZones: ZoneRef[] =
    intoZone !== undefined ? [Array.isArray(intoZone) ? intoZone[0]! : (intoZone as ZoneRef)] : ["hand"];
  const intoCandidates = candidateLooseInstances(ctx, intoTarget, intoZones);
  if (intoCandidates.length === 0) return false;

  if (!Array.isArray(action.materials)) return true;
  const slotCandidates: Array<{ ids: string[]; wanted: number }> = [];
  for (const slot of action.materials) {
    if (slot.zone !== undefined && slot.zone !== "battleArea" && slot.zone !== "breeding") {
      // Mixed loose/field DNA is validated at resolution; don't suppress it here.
      return true;
    }
    const wanted = typeof slot.count === "number" ? slot.count : 1;
    const self =
      (slot as { isSelf?: boolean }).isSelf === true || slot.filter.isSelfRef === true
        ? ctx.source.permanent()
        : undefined;
    const candidates =
      self !== undefined
        ? [self.permanentId]
        : candidatePermanents(ctx, { filter: slot.filter, count: "all" }).map((permanent) => permanent.permanentId);
    if (candidates.length < wanted) return false;
    slotCandidates.push({ ids: candidates, wanted });
  }

  function hasLegalCombination(slotIndex: number, selected: string[]): boolean {
    if (slotIndex === slotCandidates.length) {
      if (selected.length < 2) return false;
      return intoCandidates.some(({ instanceId }) => ctx.fx.canDnaDigivolve?.(selected, instanceId) !== false);
    }
    const slot = slotCandidates[slotIndex]!;
    const available = slot.ids.filter((id) => !selected.includes(id));
    function choose(start: number, chosen: string[]): boolean {
      if (chosen.length === slot.wanted) {
        return hasLegalCombination(slotIndex + 1, [...selected, ...chosen]);
      }
      for (let index = start; index < available.length; index += 1) {
        if (choose(index + 1, [...chosen, available[index]!])) return true;
      }
      return false;
    }
    return choose(0, []);
  }

  return hasLegalCombination(0, []);
}

/**
 * Build a generic EffectModule from a compiled IR record. Each CardEffect is
 * turned into one engine Effect via the matching timing builder; the builder's
 * `resolve` runs the IR actions through the interpreter. Registered exactly like
 * a hand-written module.
 *
 * Effects whose every action is unsupported still register (so the gap is
 * exercised and logged at runtime); a `RawUnparsed`-only effect resolves to a
 * single `unsupported` call.
 */
/**
 * CR §16-41-1: ＜Training＞ IS an activated [Main] ability — "By suspending this Digimon
 * during the main phase, place the top card of your deck at the bottom of this Digimon's
 * digivolution cards." The compiler emits only the keyword marker (no actions), so the
 * activated effect is synthesized at registration for every card printing the keyword
 * (EX9-016 / EX9-037 / EX9-038 ...). Appended AFTER the compiled effects so existing
 * `${cardId}/ir-<timing>-<i>` keys keep their indices.
 */
function trainingActivatedEffect(): CardEffect {
  return {
    trigger: "Main",
    actions: [
      {
        kind: "PlaceUnder",
        target: { filter: {}, count: 1 },
        fromDeckTop: true,
        cost: { kind: "suspend", raw: "By suspending this Digimon" },
      } as Action,
    ],
  };
}
/**
 * ＜Overclock ([Trait])＞ (CR §16-34): at the end of your turn, by deleting 1 of your Tokens
 * or 1 of your other [Trait] Digimon, this Digimon attacks a player without suspending. Most
 * cards compile the keyword to only a marker (a `GainKeyword` action or a `keywords` entry, no
 * actions), so the activated end-of-turn attack is synthesized here — mirroring the ＜Training＞
 * synthesis above. The delete cost's `allowTokens` lets a Token satisfy the trait gate
 * (source `IsToken || ContainsTraits(trait)`). Optional with `abortOnDecline` matches the
 * source `canNoSelect` (the player may decline to overclock).
 */
function overclockActivatedEffect(trait: string): CardEffect {
  return {
    trigger: "EndOfYourTurn",
    actions: [
      {
        kind: "Attack",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        attackPlayer: true,
        withoutSuspending: true,
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "deleteOwn",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: [trait], match: "trait" }],
              allowTokens: true,
            },
            count: 1,
          },
          raw: `by deleting 1 of your Tokens or other [${trait}] trait Digimon`,
        },
      } as Action,
    ],
  };
}

/**
 * ＜Execute＞ (CR §16-38): "At the end of your turn, the Digimon with this keyword effect may
 * attack. At the end of the attack, this Digimon is deleted. This effect also allows for
 * attacking an opponent's unsuspended Digimon." Compiles to a bare keyword marker (no actions,
 * BT20-072), so the end-of-turn attack + trailing self-deletion is synthesized here, mirroring
 * ＜Training＞/＜Overclock＞'s synthesis above:
 *   1. Grant self "may attack unsuspended" for JUST this attack (`forThisAttack` ->
 *      UntilEndAttack) — the keyword's own "also allows attacking an opponent's unsuspended
 *      Digimon" clause, read by combat legality's `canAttackUnsuspended`.
 *   2. An optional self-attack (`abortOnDecline`): declining ("may attack") skips the trailing
 *      delete entirely — the only way the interpreter's generic optional/abort handling can gate
 *      "the attack having actually happened" without a bespoke result flag.
 *   3. An unconditional trailing self-Delete — reached only when the attack was NOT declined
 *      (§16-38-4: "the processing ... for deleting this Digimon at the end of the attack is
 *      pending processing", i.e. it always follows a declared attack, win or lose).
 */
function executeActivatedEffect(): CardEffect {
  return {
    trigger: "EndOfYourTurn",
    actions: [
      {
        kind: "GrantCanAttackUnsuspended",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        duration: "forThisAttack",
      } as Action,
      {
        kind: "Attack",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        optional: true,
        abortOnDecline: true,
      } as Action,
      {
        kind: "Delete",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      } as Action,
    ],
  };
}

/**
 * True when a single "Counter"-trigger `CardEffect` entry is only the ＜Blast Digivolve＞/
 * ＜Blast DNA Digivolve＞ keyword marker, NOT a real, resolvable [Counter] effect — mirrors
 * ＜Execute＞'s two compile shapes below (`declaresExecuteKeyword`): either a printed-keyword
 * `keywords` entry with empty `actions` (BT14-014/AD1-005/BT19-050), or a self-targeted
 * `GainKeyword` action granting the keyword instead of leaving `actions` empty (EX5-053's
 * hand-written module, whose Counter entry has `keywords: []` but a real `GainKeyword`
 * action). Used by `timingForTrigger`'s "Counter" case to keep these OFF the real §11-3
 * Counter Timing window.
 */
function isBlastDigivolveMarker(effect: CardEffect): boolean {
  const isBlastKeyword = (name: string | undefined) => name === "BlastDigivolve" || name === "BlastDNADigivolve";
  if ((effect.keywords ?? []).some((kw) => isBlastKeyword(kw.keyword))) return true;
  return effect.actions.some(
    (a) =>
      a.kind === "GainKeyword" &&
      isBlastKeyword((a as { keyword?: { keyword?: string } }).keyword?.keyword) &&
      ((a as { target?: { isSelf?: boolean } }).target?.isSelf ?? false),
  );
}

/**
 * True when a card's compiled IR declares the ＜Execute＞ keyword — as a printed-keyword
 * marker or a self-targeted `GainKeyword` action (mirrors ＜Training＞'s two compile shapes
 * above) — AND does not already carry an explicit `EndOfYourTurn` attack (a hand-authored
 * override; synthesizing again would declare a second attack).
 */
function declaresExecuteKeyword(compiled: CompiledCard): boolean {
  const declares = compiled.effects.some(
    (e) =>
      e.isInherited !== true &&
      ((e.keywords ?? []).some((k) => k.keyword === "Execute") ||
        e.actions.some(
          (a) =>
            a.kind === "GainKeyword" &&
            (a as { keyword?: { keyword?: string } }).keyword?.keyword === "Execute" &&
            ((a as { target?: { isSelf?: boolean } }).target?.isSelf ?? false),
        )),
  );
  if (!declares) return false;
  const hasExplicitAttack = compiled.effects.some(
    (e) => e.trigger === "EndOfYourTurn" && e.actions.some((a) => a.kind === "Attack"),
  );
  return !hasExplicitAttack;
}

/** The trait named in a card's ＜Overclock ([X] Trait)＞ marker, from the keyword or printed text. */
function overclockTraitFrom(compiled: CompiledCard, definition: CardDefinition | undefined): string | undefined {
  const parse = (text: string | undefined): string | undefined =>
    text?.match(/＜Overclock\s*\(\[([^\]]+)\]\s*[Tt]rait\)/)?.[1]?.trim();
  for (const effect of compiled.effects) {
    for (const kw of effect.keywords ?? []) {
      if (kw.keyword !== "Overclock") continue;
      const qualifier = (kw as { qualifier?: string }).qualifier;
      if (qualifier) return qualifier;
      const fromRaw = parse(kw.raw);
      if (fromRaw) return fromRaw;
    }
    for (const action of effect.actions) {
      if (action.kind !== "GainKeyword") continue;
      const kw = (action as { keyword?: { keyword?: string; qualifier?: string; raw?: string } }).keyword;
      if (kw?.keyword !== "Overclock") continue;
      if (kw.qualifier) return kw.qualifier;
      const fromRaw = parse(kw.raw);
      if (fromRaw) return fromRaw;
    }
  }
  return parse(definition?.effectText);
}

/**
 * The delete-cost trait for a card whose ＜Overclock＞ end-of-turn attack must be synthesized,
 * or undefined when nothing should be synthesized: the card must declare the keyword (as a
 * self-targeted `GainKeyword` action or a `keywords` marker) AND not already carry the explicit
 * `EndOfYourTurn` attack in its IR (EX7-030 / BT22-036 hand-author it — synthesizing again would
 * declare a second attack).
 */
function synthesizedOverclockTrait(compiled: CompiledCard, definition: CardDefinition | undefined): string | undefined {
  const declaresOverclock = compiled.effects.some(
    (e) =>
      e.isInherited !== true &&
      ((e.keywords ?? []).some((k) => k.keyword === "Overclock") ||
        e.actions.some(
          (a) =>
            a.kind === "GainKeyword" &&
            (a as { keyword?: { keyword?: string } }).keyword?.keyword === "Overclock" &&
            ((a as { target?: { isSelf?: boolean } }).target?.isSelf ?? false),
        )),
  );
  if (!declaresOverclock) return undefined;
  const hasExplicitAttack = compiled.effects.some(
    (e) => e.trigger === "EndOfYourTurn" && e.actions.some((a) => a.kind === "Attack"),
  );
  if (hasExplicitAttack) return undefined;
  return overclockTraitFrom(compiled, definition);
}

/**
 * Detect the "digivolve from hand onto a <color> Tamer as if it is a level N Digimon"
 * mechanic in a card's compiled IR and record its `asLevel` in the side registry. The
 * mechanic compiles to a Static `Digivolve` action carrying `onto` (a Tamer filter) and
 * `asLevel`; the legality path derives the correctly-gated alternate requirement from this
 * (see {@link registerTamerOntoDigivolve}). The `onto` value carries a nested `filter` at
 * runtime (`{ filter, count }`); read it defensively since the IR is `@ts-nocheck`-generated.
 */
function registerTamerOntoFromEffects(cardId: string, effects: readonly CardEffect[]): void {
  for (const effect of effects) {
    if (effect.trigger !== "Static") continue;
    for (const action of effect.actions) {
      if (action.kind !== "Digivolve" || typeof action.asLevel !== "number") continue;
      const onto = action.onto as { filter?: { kind?: unknown } } | { kind?: unknown } | undefined;
      const ontoKind = (onto as { filter?: { kind?: unknown } })?.filter
        ? (onto as { filter: { kind?: unknown } }).filter.kind
        : (onto as { kind?: unknown })?.kind;
      if (Array.isArray(ontoKind) && ontoKind.includes("Tamer")) {
        registerTamerOntoDigivolve(cardId, action.asLevel);
        return;
      }
    }
  }
}

/**
 * A self-targeted "when THIS card would be played, [gate], reduce the play cost by N" reducer.
 * Exactly one of `cost`, `costActions`, or (`condition`/`scaling`) applies:
 *   - `cost`: a structured, payable Cost (suspend/unsuspend/return/trash) — offered as a "you may"
 *     choice, paid via `payCost` (EX8-074, BT17-068, ...).
 *   - `costActions`: an "actions" cost body (place/trash/delete a card — SelectBind+TrashDigivolution+
 *     PlaceUnder, or an optional Delete) — offered as a "you may" choice, paid by running the actions
 *     (BT12-112, BT8-043).
 *   - `condition`/`scaling`: no payment at all — a mandatory, automatic reduction gated by a board
 *     condition and/or scaled by a matching-card count (BT9-097, BT8-036, BT8-010, BT9-112).
 */
export interface WouldBePlayedSelfReducer {
  amount: number;
  raw: string;
  /** Hand-written payment hook for costs whose card-selection/movement shape is not representable as Cost. */
  pay?: (ctx: EffectContext) => Promise<boolean>;
  cost?: Cost;
  costActions?: Action[];
  condition?: Condition;
  scaling?: Scaling;
}

const WOULD_BE_PLAYED_SELF_REDUCERS = new Map<string, WouldBePlayedSelfReducer[]>();

/** Register a card-local, hand-written pay-time reducer without serializing executable behavior as IR. */
export function registerWouldBePlayedSelfReducer(cardId: string, reducer: WouldBePlayedSelfReducer): void {
  const current = WOULD_BE_PLAYED_SELF_REDUCERS.get(cardId) ?? [];
  const withoutSameKey = current.filter(({ raw }) => raw !== reducer.raw);
  WOULD_BE_PLAYED_SELF_REDUCERS.set(cardId, [...withoutSameKey, reducer]);
}
const STRUCTURED_REDUCER_COSTS = new Set(["suspend", "unsuspend", "return", "trash"]);

/**
 * Cards whose "When THIS card would be played, by [structured cost], reduce the play cost by N"
 * real payable cost. The runtime record under-specifies the `wouldBePlayed reduceCost` IR — it drops
 * the "this card" identity (so EX3-040's "a green Digimon" looks identical to a self-reducer) and
 * sometimes mis-parses a conditional reduction as a cost (BT16-065) — so structural detection alone
 * is unsafe. This allowlist is the gate; new entries require reading the card's effect text.
 */
const VERIFIED_SELF_REDUCER_CARDS = new Set([
  "BT2-099", // self Option use cost -1 per yellow Tamer
  "BT2-112", // opponent has a 10000+ DP Digimon -> -6
  "EX8-074", // suspend 2 Digimon -> -4
  "BT17-068", // return 1 [Apocalymon] from trash -> -3
  "EX9-011", // trash 1 [Cyborg]/[Ver.1] from hand -> -2
  "EX9-018", // trash 1 [Cyborg]/[Ver.x] from hand -> -2
  "EX9-030", // trash 1 [Cyborg]/[Ver.x] from hand -> -2
  "EX9-064", // trash 1 [Cyborg]/[Ver.x] from hand -> -2
  "EX9-044", // suspend 1 [WG] Digimon -> -4
  "P-170", // return 3 [Three Musketeers]-text from trash -> -6
  "P-171", // face-up [Deep Savers] in security -> -4
  "P-172", // face-up [Nature Spirits] in security -> -4
  "P-174", // face-up [Nightmare Soldiers] in security -> -4
  "BT12-112", // place 1 [Shoutmon] as digivolution material -> -1 (KB Q2249-Q2256)
  "BT8-043", // delete 1 purple [Cherubimon] -> -8
  "BT9-097", // condition: you have a Digimon with [X Antibody] card name in play -> -2 (KB Q1902)
  "BT8-036", // condition: you have a blue Digimon in play -> -1
  "BT8-010", // condition: you have a yellow Digimon in play -> -1 (KB Q1700; IR condition added)
  "ST9-04", // condition: you have a green Digimon in play -> -1
  "ST9-09", // condition: you have a blue Digimon in play -> -1
  "EX2-045", // condition: you have Guilmon/Terriermon/Renamon/Impmon in play -> -2
  "BT9-112", // scaling: -3 per opponent Digimon/Tamer in play (KB Q1928)
  "BT10-098", // condition: opponent has 2+ Digimon -> Option use cost -2
  "BT10-103", // condition: you have 2+ suspended green Digimon -> Option use cost -2
  "BT8-097", // scaling: Option use cost -1 per opposing Digimon (floor applied by play path)
]);

/**
 * The runtime record compiles "When this card would be played, by [cost], reduce the play cost by N"
 * into a `wouldBePlayed reduceCost` Replacement — but the play path consumes pay-time reductions
 * only through `BeforePayCost`/`playCostDelta`, leaving these self-reducers inert (EX8-074, BT17-068).
 * Collect the unambiguous self-targeted ones (an explicit "this card" raw + a STRUCTURED cost, no
 * cross-card target/condition/place-actions) so the play path can run them at BeforePayCost. The
 * gate is deliberately tight: cross-card reducers (BT13-007: "when a [Royal Knight] would be
 * played") and conditional/raw-cost forms are NOT matched and stay as-is.
 */
/** A sourceFilter that gates which PLAYED card a wouldBePlayed reaction watches. */
type SourceFilter = {
  names?: unknown;
  nameOrTrait?: unknown;
  traits?: unknown;
  kind?: unknown;
  kinds?: unknown;
  colors?: unknown;
  levels?: unknown;
  levelComparison?: unknown;
};

/**
 * True when a wouldBePlayed `sourceFilter` discriminates by something OTHER than controller — i.e.
 * it targets a SUBSET of cards ("a [Royal Knight] Digimon"), making the reducer cross-card. A filter
 * with only `controllerDefault`/`controller` (or none) is the self/"this card" form the runtime record
 * under-specifies — we restrict it to the bearer by keying the reducer on the bearer's cardId.
 */
function sourceFilterDiscriminates(sf: SourceFilter | undefined): boolean {
  if (sf === undefined) return false;
  return (
    sf.names !== undefined ||
    sf.nameOrTrait !== undefined ||
    sf.traits !== undefined ||
    sf.kind !== undefined ||
    sf.kinds !== undefined ||
    sf.colors !== undefined ||
    sf.levels !== undefined ||
    sf.levelComparison !== undefined
  );
}

/**
 * Capture a `reduceCost` Replacement item as a self-reducer, given its own gate (`cost`/`condition`)
 * plus whatever sibling "cost" actions accompany it (`costActionsRaw` — a Delete/SelectBind body that
 * pays the reduction, empty when there is none) and the outer action's `scaling` (if any). Exactly
 * one payment shape wins, in priority order:
 *   1. A structured, payable `cost` (suspend/unsuspend/return/trash) — the ORIGINAL verified shape
 *      (EX8-074, BT17-068, ...). A `condition` alongside it is unsupported and rejects the capture
 *      (preserves the pre-existing strict behavior for these cards).
 *   2. A non-empty `costActionsRaw` body (BT12-112, BT8-043) — same condition restriction.
 *   3. Neither: a `condition` and/or `scaling` gate with NO payment at all — a mandatory, automatic
 *      reduction (BT9-097, BT8-036, BT8-010, BT9-112).
 */
function captureReducer(
  costActionsRaw: readonly unknown[],
  a: {
    kind?: string;
    event?: string;
    mode?: string;
    cost?: Cost;
    amount?: unknown;
    raw?: string;
    condition?: unknown;
    target?: unknown;
  },
  scaling: Scaling | undefined,
  fallbackRaw: string,
  out: WouldBePlayedSelfReducer[],
): void {
  if (a.kind !== "Replacement" || a.event !== "wouldBePlayed" || a.mode !== "reduceCost") return;
  if (a.target !== undefined) return;
  if (typeof a.amount !== "number") return;
  const amount = a.amount;
  const raw = a.raw && a.raw.length > 4 ? a.raw : fallbackRaw;
  const condition = a.condition as Condition | undefined;
  if (a.cost !== undefined) {
    if (condition !== undefined) return;
    if (!STRUCTURED_REDUCER_COSTS.has(a.cost.kind)) return;
    out.push({ cost: a.cost, amount, raw });
    return;
  }
  if (costActionsRaw.length > 0) {
    if (condition !== undefined) return;
    out.push({ costActions: costActionsRaw as Action[], amount, raw });
    return;
  }
  if (condition !== undefined || scaling !== undefined) {
    out.push({ condition, scaling, amount, raw });
  }
}

function collectWouldBePlayedSelfReducers(cardId: string, effects: readonly CardEffect[]): void {
  if (!VERIFIED_SELF_REDUCER_CARDS.has(cardId)) return;
  const out: WouldBePlayedSelfReducer[] = [];
  for (const effect of effects) {
    for (const action of effect.actions ?? []) {
      const a = action as {
        kind?: string;
        event?: string;
        mode?: string;
        sourceFilter?: SourceFilter;
        actions?: unknown[];
        scaling?: Scaling;
        raw?: string;
      } & Record<string, unknown>;
      if (a.kind !== "Replacement" || a.event !== "wouldBePlayed") continue;
      if (sourceFilterDiscriminates(a.sourceFilter)) continue;
      // Flat form (BT12-112): the reduceCost mode/amount AND its own cost-actions body live on
      // this same action object.
      if (a.mode === "reduceCost") {
        captureReducer(a.actions ?? [], a, a.scaling, "Reduce the play cost.", out);
        continue;
      }
      // Nested form (EX8-074, BT17-068, BT8-043, BT9-097, BT8-036, BT8-010, BT9-112): an outer
      // wouldBePlayed reaction (sourceFilter = "mine", no card discriminator) wraps an inner
      // reduceCost Replacement (amount/condition) alongside sibling "cost" actions (a Delete, a
      // SelectBind+TrashDigivolution+PlaceUnder chain) that pay for the reduction. Isolate the
      // inner reduceCost item; everything else in the same array is the cost payload.
      if (Array.isArray(a.actions)) {
        const inner = a.actions.find(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            (item as { kind?: string }).kind === "Replacement" &&
            (item as { event?: string }).event === a.event &&
            (item as { mode?: string }).mode === "reduceCost",
        ) as Record<string, unknown> | undefined;
        if (inner === undefined) continue;
        const costActions = a.actions.filter((item) => item !== inner);
        // Some generated records put the eligibility gate on the OUTER wouldBePlayed
        // wrapper and leave the nested reduceCost item unconditional (EX2-045).  The
        // pay-time self-reducer bypasses runAction on that wrapper, so carry its condition
        // into the captured reducer unless the nested item supplies a more specific gate.
        const innerWithGate = {
          ...inner,
          condition: inner.condition ?? a.condition,
        };
        captureReducer(costActions, innerWithGate as never, a.scaling, "Reduce the play cost.", out);
      }
    }
  }
  if (out.length > 0) WOULD_BE_PLAYED_SELF_REDUCERS.set(cardId, out);
}

/** The self-targeted pay-time cost reducers for a played card (empty when none). */
export function wouldBePlayedSelfReducersFor(cardId: string): WouldBePlayedSelfReducer[] {
  return WOULD_BE_PLAYED_SELF_REDUCERS.get(cardId) ?? [];
}

export interface WouldDigivolveSelfReducer {
  cost: Cost;
  amount: number;
  raw: string;
}

const WOULD_DIGIVOLVE_SELF_REDUCERS = new Map<string, WouldDigivolveSelfReducer[]>();
const VERIFIED_DIGIVOLVE_SELF_REDUCER_CARDS = new Set([
  "EX3-054", // return up to 5 [D-Brigade] cards from trash to deck top -> -1 each (KB Q3423)
]);

function collectWouldDigivolveSelfReducers(cardId: string, effects: readonly CardEffect[]): void {
  if (!VERIFIED_DIGIVOLVE_SELF_REDUCER_CARDS.has(cardId)) return;
  const reducers: WouldDigivolveSelfReducer[] = [];
  for (const effect of effects) {
    for (const outer of effect.actions) {
      if (outer.kind !== "Replacement" || outer.event !== "wouldDigivolve") continue;
      for (const action of outer.actions ?? []) {
        if (
          action.kind === "Replacement" &&
          action.event === "wouldDigivolve" &&
          action.mode === "reduceCost" &&
          action.cost !== undefined &&
          typeof action.amount === "number"
        ) {
          reducers.push({
            cost: action.cost,
            amount: action.amount,
            raw: action.cost.raw ?? action.raw ?? "Reduce the digivolution cost.",
          });
        }
      }
    }
  }
  if (reducers.length > 0) WOULD_DIGIVOLVE_SELF_REDUCERS.set(cardId, reducers);
}

export function wouldDigivolveSelfReducersFor(cardId: string): WouldDigivolveSelfReducer[] {
  return WOULD_DIGIVOLVE_SELF_REDUCERS.get(cardId) ?? [];
}

export function potentialWouldDigivolveSelfReduction(ctx: EffectContext, reducer: WouldDigivolveSelfReducer): number {
  if (reducer.cost.target?.upTo !== true || typeof reducer.cost.target.count !== "number") {
    return reducer.amount;
  }
  const zones: ZoneRef[] = reducer.cost.target.filter.zone === "trash" ? ["trash"] : [];
  if (zones.length === 0) return 0;
  const candidates = candidateLooseInstances(ctx, reducer.cost.target, zones);
  return reducer.amount * Math.min(reducer.cost.target.count, candidates.length);
}

export async function applyWouldDigivolveSelfReducer(
  ctx: EffectContext,
  reducer: WouldDigivolveSelfReducer,
): Promise<number> {
  if (potentialWouldDigivolveSelfReduction(ctx, reducer) === 0) return 0;
  if (!(await ctx.ask.optional(ctx, reducer.raw))) return 0;
  const receipt = { paidCount: 0 };
  if (!(await payCost(ctx, reducer.cost, receipt))) return 0;
  return Math.max(0, reducer.amount * receipt.paidCount);
}

/**
 * Run a `costActions` self-reducer's cost body (BT12-112's SelectBind+TrashDigivolution+PlaceUnder,
 * BT8-043's optional Delete) AFTER the controller has already agreed to pay it via the reducer-level
 * "you may" prompt in {@link applyWouldBePlayedSelfReducer}. Per-action `optional` flags are stripped
 * before running — the single reducer-level prompt already IS that choice; re-asking would double-
 * prompt for one clause. Returns whether the cost actually resolved: a SelectBind that bound nothing
 * (no valid target) or a Delete that removed nothing means the cost could not be paid, so the caller
 * must not grant the discount (mirrors the structured-`cost` path's `payCost` failing silently).
 */
async function runWouldBePlayedCostActions(ctx: EffectContext, actions: readonly Action[]): Promise<boolean> {
  const selectBindNames: string[] = [];
  let sawDelete = false;
  let sawDeferredRelocation = false;
  for (const raw of actions) {
    const bindAs = (raw as { target?: { bindAs?: string } }).target?.bindAs;
    if (raw.kind === "SelectBind" && bindAs !== undefined) selectBindNames.push(bindAs);
    if (raw.kind === "Delete") sawDelete = true;
    // "Place [this permanent] as this card's OWN bottom digivolution card" (BT12-112): the card
    // being played has no permanent yet at pay-time (`fireBeforePayCost` runs BEFORE the played
    // permanent is created), so `relocatePermanent` cannot run now — there is no destination. Since
    // this action is running inside a SELF reducer's cost body, "under this card" unambiguously
    // means "under the permanent this same play is about to create". Resolve the SOURCE now (already
    // selected via the preceding SelectBind) and stash it on `ctx.pendingSelfReducerRelocations` for
    // the engine to relocate once that permanent exists.
    if (raw.kind === "PlaceUnder" && (raw as { targetIsPermanent?: boolean }).targetIsPermanent === true) {
      const sourceIds = await resolvePermanentTargets(ctx, (raw as Extract<Action, { kind: "PlaceUnder" }>).target);
      if (sourceIds.length === 0) return false;
      ctx.pendingSelfReducerRelocations = [...(ctx.pendingSelfReducerRelocations ?? []), ...sourceIds];
      sawDeferredRelocation = true;
      continue;
    }
    const a = (raw as { optional?: boolean }).optional === true ? { ...raw, optional: false } : raw;
    const abort = await runAction(ctx, a as Action);
    if (abort) break;
  }
  if (selectBindNames.length > 0) {
    return selectBindNames.every((name) => ctx.selections?.has(name));
  }
  if (sawDeferredRelocation) return true;
  if (sawDelete) return (ctx.lastDeleteCount ?? 0) > 0;
  return true;
}

/**
 * Apply one self-targeted `wouldBePlayed` cost reducer at pay-time (called from
 * `GameEngine.fireBeforePayCost`). A `cost`/`costActions` reducer is a "you may" choice — decline,
 * or an unpayable cost, earns nothing; a `condition`/`scaling` reducer has no payment at all and
 * applies automatically (mandatory) whenever its gate holds, scaled by the matching-card count.
 */
export async function applyWouldBePlayedSelfReducer(
  ctx: EffectContext,
  reducer: WouldBePlayedSelfReducer,
): Promise<void> {
  if (reducer.pay !== undefined) {
    if (!(await ctx.ask.optional(ctx, reducer.raw))) return;
    if (await reducer.pay(ctx)) {
      ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, reducer.amount);
    }
    return;
  }
  if (reducer.cost !== undefined) {
    if (!(await ctx.ask.optional(ctx, reducer.raw))) return;
    if (await payCost(ctx, reducer.cost)) {
      ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, reducer.amount);
    }
    return;
  }
  if (reducer.costActions !== undefined) {
    if (!(await ctx.ask.optional(ctx, reducer.raw))) return;
    if (await runWouldBePlayedCostActions(ctx, reducer.costActions)) {
      ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, reducer.amount);
    }
    return;
  }
  if (reducer.condition !== undefined && !evaluateCondition(ctx, reducer.condition)) return;
  const scale = reducer.scaling !== undefined ? scaleFactor(ctx, reducer.scaling) : 1;
  ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, reducer.amount * scale);
}

/**
 * Cards whose `wouldBePlayed` Replacement carries an `AllowDigiXrosMaterialsFromTrash`
 * in `additionalEffects` — meaning when played via DigiXros after paying the cost, the
 * player's trash is also a valid material source. Populated by `registerIrCard`.
 */
const ALLOW_DIGIXROS_FROM_TRASH = new Set<string>();

/** True when a card's IR declares that DigiXros materials may come from the player's trash. */
export function allowsDigiXrosMaterialsFromTrash(cardId: string): boolean {
  return ALLOW_DIGIXROS_FROM_TRASH.has(cardId);
}

function detectAllowDigiXrosMaterialsFromTrash(cardId: string, effects: readonly CardEffect[]): void {
  for (const effect of effects) {
    for (const action of effect.actions) {
      if (action.kind !== "Replacement" || action.event !== "wouldBePlayed") continue;
      const extras = (action as { additionalEffects?: Array<{ kind: string }> }).additionalEffects;
      if (extras?.some((e) => e.kind === "AllowDigiXrosMaterialsFromTrash")) {
        ALLOW_DIGIXROS_FROM_TRASH.add(cardId);
        return;
      }
    }
  }
}

/**
 * Detect the ＜Digisorption -N＞ keyword in a card's compiled IR and record the amount in the
 * side registry (see {@link registerDigisorption}). The keyword compiles to a `wouldDigivolve`
 * `reduceCost` Replacement carrying a `suspend` cost (BT2-050 / BT3-054 / BT3-056). The amount
 * is the Replacement's `amount` (the cost reduction). This is the SOURCE OF TRUTH the digivolve
 * cost path reads, since the card being digivolved into is in hand (its Static effects are not
 * active in the live ledger).
 */
function registerDigisorptionFromEffects(cardId: string, effects: readonly CardEffect[]): void {
  for (const effect of effects) {
    for (const action of effect.actions) {
      if (
        action.kind === "Replacement" &&
        action.event === "wouldDigivolve" &&
        action.mode === "reduceCost" &&
        action.cost?.kind === "suspend" &&
        typeof action.amount === "number"
      ) {
        registerDigisorption(cardId, action.amount);
        return;
      }
    }
  }
}

/** Register a field-only Digisorption opponent-suspend redirect declared in typed IR. */
function registerDigisorptionRedirectorFromEffects(cardId: string, effects: readonly CardEffect[]): void {
  if (
    effects.some((effect) =>
      effect.actions.some((action) => action.kind === "GrantStatic" && action.grant === "digisorptionRedirect"),
    )
  ) {
    registerDigisorptionRedirector(cardId);
  }
}

/**
 * The compiled Static Replacement is metadata for an intrinsic "digivolve INTO this card from
 * hand" keyword. It must feed the side registry above, but must never stay live on the resulting
 * battle-area Digimon and discount a later evolution from that Digimon.
 */
function isIntrinsicDigisorptionMarker(effect: CardEffect): boolean {
  return (
    effect.trigger === "Static" &&
    effect.actions.length > 0 &&
    effect.actions.every(
      (action) =>
        action.kind === "Replacement" &&
        action.event === "wouldDigivolve" &&
        action.mode === "reduceCost" &&
        action.cost?.kind === "suspend" &&
        (effect.keywords ?? []).some((keyword) => keyword.keyword === "Digisorption"),
    )
  );
}

/**
 * Card ids whose compiled IR carries the ＜Blast Digivolve＞/＜Blast DNA Digivolve＞ keyword
 * marker (see {@link isBlastDigivolveMarker}). §16-26-1/§16-31-1: digivolving into one of these
 * cards from hand, meeting the printed digivolution requirement, waives the memory cost. This is
 * the SOURCE OF TRUTH the digivolve cost path reads, since the card being digivolved into is in
 * hand (its Static/Counter effects are not active in the live ledger). Populated by `registerIrCard`.
 */
const BLAST_DIGIVOLVE_CARDS = new Set<string>();

/** True when `cardId`'s compiled IR carries the ＜Blast Digivolve＞/＜Blast DNA Digivolve＞ keyword. */
export function hasBlastDigivolveKeyword(cardId: string): boolean {
  return BLAST_DIGIVOLVE_CARDS.has(cardId);
}

function registerBlastDigivolveFromEffects(cardId: string, effects: readonly CardEffect[]): void {
  for (const effect of effects) {
    if (effect.trigger === "Counter" && isBlastDigivolveMarker(effect)) {
      BLAST_DIGIVOLVE_CARDS.add(cardId);
      return;
    }
  }
}

export function irCardModule(cardId: string, compiled: CompiledCard): EffectModule {
  const effects: CardEffect[] = [...compiled.effects];
  // ＜Training＞ compiles two ways depending on the runtime record path: either as `effect.keywords`
  // metadata on the printed-keyword line, or (the common case for EX9's Digimon, e.g. EX9-008/
  // EX9-016) as a self-targeted `GainKeyword` ACTION inside a Static effect. Checking only
  // `effect.keywords` missed every GainKeyword-shaped card, silently dropping the synthesized
  // activated ability (CR 16-41-1) for all of them.
  const printsTraining = compiled.effects.some(
    (e) =>
      e.isInherited !== true &&
      ((e.keywords ?? []).some((k) => k.keyword === "Training") ||
        e.actions.some(
          (a) =>
            a.kind === "GainKeyword" &&
            (a as { keyword?: { keyword?: string } }).keyword?.keyword === "Training" &&
            ((a as { target?: { isSelf?: boolean } }).target?.isSelf ?? false),
        )),
  );
  if (printsTraining) effects.push(trainingActivatedEffect());
  if (declaresExecuteKeyword(compiled)) effects.push(executeActivatedEffect());
  registerTamerOntoFromEffects(cardId, compiled.effects);
  collectWouldBePlayedSelfReducers(cardId, compiled.effects);
  collectWouldDigivolveSelfReducers(cardId, compiled.effects);
  registerDigisorptionFromEffects(cardId, compiled.effects);
  registerDigisorptionRedirectorFromEffects(cardId, compiled.effects);
  registerBlastDigivolveFromEffects(cardId, compiled.effects);
  detectAllowDigiXrosMaterialsFromTrash(cardId, compiled.effects);
  const definition = getCardDefinition(cardId);
  const overclockTrait = synthesizedOverclockTrait(compiled, definition);
  if (overclockTrait !== undefined) effects.push(overclockActivatedEffect(overclockTrait));
  const cardIsOption = definition !== undefined && isOption(definition);
  // The on-play body is the FIRST plain (non-security, non-＜Delay＞) [Main] of an Option — the one
  // play-card fires via OnUseOption. Only that clause is stripped of the OnDeclaration co-home (so
  // it cannot re-fire on the placed option permanent); later [Main] clauses stay activatable.
  let seenOptionPlayMain = false;
  const isPlainMain = (e: CardEffect): boolean =>
    e.trigger === "Main" && !e.isSecurity && !(e.keywords ?? []).some((kw) => kw.keyword === "Delay");
  // Pre-bucket effects by their target EffectTiming so effectsForTiming is O(1).
  const byTiming = new Map<EffectTiming, { effect: CardEffect; build: (o: BuilderOptions) => Effect }[]>();
  let index = 0;
  for (const effect of effects) {
    // The intrinsic keyword is consumed by GameEngine.payDigisorption through the side registry;
    // installing this marker as a Static replacement would make the evolved Digimon reduce the
    // NEXT digivolution too (BT3-054 -> BT3-056 regression).
    if (isIntrinsicDigisorptionMarker(effect)) continue;
    const isOptionPlayBody = cardIsOption && isPlainMain(effect) && !seenOptionPlayMain;
    if (cardIsOption && isPlainMain(effect)) seenOptionPlayMain = true;
    const timings = timingsForTrigger(effect, isOptionPlayBody);
    if (timings.length === 0) continue;
    const build = builderForTrigger(effect);
    for (const timing of timings) {
      const list = byTiming.get(timing) ?? [];
      list.push({ effect, build });
      byTiming.set(timing, list);
    }
    index++;
  }
  void index;

  return {
    cardId,
    effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
      const entries = byTiming.get(timing);
      if (entries === undefined) return [];
      return entries.map(({ effect, build }, i) => {
        // ＜Delay＞ universal semantics: a Delay-keyworded [Main] clause is
        // routed here to OnDeclaration (timingForTrigger), where it becomes a "you may, by
        // trashing this card in your battle area, [payload]" activatable that "can't activate
        // the turn this card enters play". Inject those semantics for EVERY delay clause so the
        // whole Memory Boost family is correct without per-card cost/condition IR — the source
        // option (placed as a battle-area permanent by its on-play effect) is deleted as the
        // cost, then the payload runs.
        // A `sharedUseKey` makes several clauses (across different timings) share ONE per-turn use
        // ledger entry — the UseTracker keys on (instanceId, effectKey), so a stable key shared by
        // each clause collapses them to a single [Once Per Turn] limit (BT25-084's OP/WD/WA share).
        const effectKey =
          effect.sharedUseKey !== undefined ? `${cardId}/${effect.sharedUseKey}` : `${cardId}/ir-${timing}-${i}`;
        const isDelay = (effect.keywords ?? []).some((kw) => kw.keyword === "Delay");
        // The trash-to-activate Delay semantics apply to [Main] effects (routed to
        // OnDeclaration, below) AND to continuous-window triggers like AllTurns
        // (EffectTiming.None) — comprehensive rules §16-17-1 makes trashing the source card
        // the activation cost regardless of what event arms it. A Delay keyword on a
        // continuous trigger still installs its Replacement/SubTrigger as a staticModifier
        // (the reactive listener has to live as long as the card is in the battle area), but
        // the listener's OWN firing is gated by the same trash-cost + turn-guard as the
        // OnDeclaration case — see `withIntrinsicDelayGate` (CAP-E14 fix; BT19-099, BT20-100,
        // BT23-093). Previously this branch only guarded on `timing === OnDeclaration`, so the
        // continuous case ran unconditionally with no trash cost or turn-guard at all.
        if (isDelay && timing === EffectTiming.OnDeclaration) {
          return build({
            source,
            effectKey,
            description: describeEffect(effect),
            optional: true,
            isInherited: effect.isInherited ?? false,
            isFromTrash: effect.isFromTrash,
            isFromHand: effect.isFromHand,
            maxPerTurn: effect.frequency === "OncePerTurn" ? 1 : -1,
            when: turnOwnerGuard(effect.trigger),
            // "Can't activate the turn this card enters play" (CanDeclareOptionDelayEffect):
            // the source must still be a battle-area permanent that entered on an earlier turn.
            canActivate: (ctx) => {
              const self = ctx.source.permanent();
              return (
                self !== undefined &&
                self.enterFieldTurnCount !== ctx.game.state.turnCount &&
                canActivateEffect(ctx, effect)
              );
            },
            resolve: async (ctx) => {
              // "By trashing this card" — delete the source option permanent (the cost); only run
              // the payload if it was actually trashed.
              const self = ctx.source.permanent();
              if (self === undefined) return;
              const hasArmedDelayAction = (effect.actions ?? []).some((action) => {
                return action.kind === "PlayWithoutCost" && action.requiresDelayArmed === true;
              });
              let delayArmedConsumed = false;
              if (hasArmedDelayAction) {
                const hasDelay = (ctx.fx.grantedKeywords?.(self.permanentId) ?? []).some((g) => g.keyword === "Delay");
                if (!hasDelay) return;
                ctx.fx.revokeKeyword?.(self.permanentId, "Delay");
                delayArmedConsumed = true;
              }
              const deleted = await ctx.fx.deletePermanent([self.permanentId]);
              if (deleted > 0) await runEffect({ ...ctx, delayArmedConsumed }, effect);
            },
          });
        }
        // CAP-E14 follow-up: a ＜Delay＞ keyword on a DISCRETE windowed trigger
        // (StartOfYourTurn/EndOfOpponentsTurn/EndOfAllTurns/...) whose payload is a plain action
        // list — not a reactive SubTrigger/Replacement listener, which is `withIntrinsicDelayGate`'s
        // continuous-timing case below — still carries the same §16-17 semantics: the window only
        // offers the CHANCE to activate, gated by trashing the source card (§16-17-1, optional per
        // §16-17-2) and barred the turn the card entered play (§16-17-3). Without this branch the
        // window fired its payload unconditionally, with no cost and no turn-guard (LM-027..030's
        // Scramble family, EX10-072, P-193).
        const hasReactiveDelayAction = (effect.actions ?? []).some(
          (action) => action.kind === "SubTrigger" || action.kind === "Replacement",
        );
        if (isDelay && timing !== EffectTiming.None && !hasReactiveDelayAction) {
          return build({
            source,
            effectKey,
            description: describeEffect(effect),
            optional: effect.optional ?? false,
            isInherited: effect.isInherited ?? false,
            isFromTrash: effect.isFromTrash,
            isFromHand: effect.isFromHand,
            maxPerTurn: effect.frequency === "OncePerTurn" ? 1 : effect.frequency === "TwicePerTurn" ? 2 : -1,
            when: turnOwnerGuard(effect.trigger),
            // "Can't activate the turn this card enters play" (§16-17-3).
            canActivate: (ctx) => {
              const self = ctx.source.permanent();
              if (self === undefined || self.enterFieldTurnCount === ctx.game.state.turnCount) return false;
              return canActivateEffect(ctx, effect);
            },
            resolve: async (ctx) => {
              // "By trashing this card" — delete the source permanent (the cost); only run the
              // payload if it was actually trashed. §16-17-2: the whole thing is optional.
              const self = ctx.source.permanent();
              if (self === undefined) return;
              const activate = await ctx.ask.optional(ctx, "Trash this card to activate its ＜Delay＞ effect?");
              if (!activate) return;
              const trashed = await ctx.fx.deletePermanent([self.permanentId]);
              if (trashed <= 0) return;
              await runEffect(ctx, effect);
            },
          });
        }
        // CAP-E14: a ＜Delay＞ keyword on a continuous-window trigger (AllTurns and siblings
        // mapping to EffectTiming.None) still installs its listener as a staticModifier, but
        // the listener body must apply Delay's own trash-cost + turn-guard when it fires —
        // see `withIntrinsicDelayGate`'s doc comment above.
        const frequencyBoundEffect = withSubTriggerFrequency(effect, effectKey);
        const resolvedEffect = isDelay ? withIntrinsicDelayGate(frequencyBoundEffect) : frequencyBoundEffect;
        return build({
          source,
          effectKey,
          description: describeEffect(effect),
          optional: effect.optional ?? false,
          isInherited: effect.isInherited ?? false,
          isFromTrash: effect.isFromTrash,
          isFromHand: effect.isFromHand,
          continuousPriority: readsSelfKeyword(effect) ? 1 : 0,
          // isSecurity is set by the `security` builder itself, not via options.
          maxPerTurn: effect.frequency === "OncePerTurn" ? 1 : effect.frequency === "TwicePerTurn" ? 2 : -1,
          when: turnOwnerGuard(effect.trigger),
          canActivate: (ctx) => canActivateEffect(ctx, effect),
          resolve: async (ctx) => {
            await runEffect(ctx, resolvedEffect);
          },
        });
      });
    },
  };
}

function describeEffect(effect: CardEffect): string {
  if (effect.description?.trim()) return effect.description.trim();
  const kw = effect.keywords?.map((k) => k.keyword).join(", ");
  const acts = effect.actions.map((action) => describeAction(action)).join(", ");
  return `[${effect.trigger}]${kw ? ` ＜${kw}＞` : ""}${acts ? ` ${acts}` : ""}`;
}

/**
 * Register a card from its compiled IR record via the existing registry. Returns
 * the module so callers can also reference it.
 *
 * Idempotent: a cardId already in the registry (reached via another import path —
 * the set barrel and the IR smoke-test entry both register the same generated cards,
 * and under Vitest's `isolate: false` test files share one module graph) returns the
 * existing module instead of re-registering. Card ids are unique by construction
 * mask a genuine conflict between two distinct IR cards. `registerCard` still throws
 * for a hand-written double-port that does not go through this bulk path.
 */
export function registerIrCard(cardId: string, compiled: CompiledCard): EffectModule {
  registeredCompiledCards.set(cardId, compiled);
  const existing = getEffectModule(cardId);
  const previousIrModule = registeredIrModules.get(cardId);
  // Registry precedence belongs to the concrete module, not merely to the fact that IR for
  // this card id was seen before. A handwritten override can be present before the first IR
  // import, or replace an IR module later in a shared Vitest graph; repeated IR imports must
  // preserve it in both cases.
  if (existing !== undefined && existing !== previousIrModule) return existing;
  if (existing !== undefined) unregisterCard(cardId);
  const module = irCardModule(cardId, compiled);
  registerCard(module);
  registeredIrModules.set(cardId, module);
  return module;
}

// ---------------------------------------------------------------------------
// Granted named-effect library (GrantStatic grant:"effects" with tokens)
// ---------------------------------------------------------------------------

/**
 * The built-in effects a `grantCustomEffect` token confers. Each token resolves to an IR
 * `CardEffect`, compiled on demand to a real Effect anchored on the GRANTED permanent (the
 * recipient of the grant), so the granted ability fires through the same EffectTiming window
 * and trigger gate as a printed effect — never a parallel/inert path.
 *
 * Every token actually installed by a `ctx.fx.grantCustomEffect` call site (audited across
 * `apps/api/src/cards/**`) MUST have an entry here — see `grantedTokenEffectsForTiming`'s
 * loud failure for an unknown token, added alongside this library so a new call site with a
 * typo'd or unregistered token is a crash, not a silent no-op (this class of bug: BT5-091's
 * "[When Attacking] Lose 1 memory." token sat here unconsumed for the granted effect's whole
 * lifetime before this fix).
 *
 * `OnDeletionDeleteLowest` — RB1-030's "[On Deletion] Delete 1 of your opponent's Digimon with
 * the lowest level" (documented behavior: an OnDestroyedAnyone rule implementation whose target is
 * `IsPermanentExistsOnOpponentBattleAreaDigimon` ∧ `IsMinLevel(enemy)`). The Delete target's
 * `superlative:"lowestLevel"` narrows the opponent's battle-area Digimon pool to minimum printed
 * level (ties: all extrema), matching IsMinLevel.
 *
 * `OnDeletionLose1Memory` — a generic "[On Deletion] Lose 1 memory" grant (not currently
 * installed by any card; kept as a library primitive other future ports can reuse).
 *
 * `[When Attacking] Lose 1 memory.` — BT5-091 Takumi Aiba's "[All Turns] all level 3 Digimon
 * gain '[When Attacking] Lose 1 memory'" (KB Q1369/Q1370: fires on the granted Digimon's own
 * attack; two copies of the granting Tamer are separate activations). The literal printed-text
 * string is the token (BT5-091 has no shorter semantic name for it).
 *
 * `OnDeletionPlaySelfNoOnPlay` — BT3-109's "[On Deletion] Play back without cost, [On Play]
 * effects don't activate" grant (a Black Option's [Main]: 1 of your Digimon gains this for the
 * turn). `suppressOnPlayEffects` skips the played permanent's own [On Play] window — this is
 * the ONE library entry that needs it (the others playing themselves back, below, do NOT
 * suppress [On Play]).
 *
 * `OnPlayBlitzIfHasDigivolutionCard` — BT9-102's granted "[On Play] If this Digimon has a
 * digivolution card, ＜Blitz＞" (printed text granted to Digimon already on the field; per
 * Comprehensive Rules §16-16 <Blitz> lets the granted Digimon attack while the opponent has
 * memory — a keyword grant `[On Play]`-timed and re-evaluated should the granted Digimon later
 * re-enter as a new card this turn, e.g. via a bounce-and-replay).
 *
 * `OnDeletionPlaySelf` — EX4-059 Jijimon's "[On Deletion] You may play this card without paying
 * the cost" grant ([When Digivolving]: this Digimon and 1 of your level <=5 Digimon gain it
 * until opponent's turn end). `optional: true` — "you MAY play".
 *
 * The following four entries are keyed by the LITERAL printed granted-effect text (the RB1-030
 * "quotedEffect" convention, not a semantic slug) because the `GrantAuraToOpponents` malformed-
 * shape route above (Q1f) supplies `action.effectText` verbatim as the token, and that text is
 * the only thing the compiler recovers deterministically for these clauses:
 *
 * `"[On Deletion] Lose 1 memory."` — BT15-068, BT20-065, BT9-014's granted "1 of your
 * opponent's Digimon gains '[On Deletion] Lose 1 memory.'". Same body as the semantic
 * `OnDeletionLose1Memory` entry above; kept as a separate key rather than reused because the
 * two entries are addressed by different call sites (a hand-authored module choosing the
 * semantic name vs. the generic malformed-shape route echoing the printed text back).
 *
 * `"[On Deletion] Lose 2 memory"` — BT6-102's "1 of your opponent's Digimon gains '[On
 * Deletion] Lose 2 memory' until the end of their next turn."
 *
 * `"[On Deletion] Gain 3 memory."` — BT11-106's "1 of your Digimon ... gains '[On Deletion]
 * Gain 3 memory.'" (granted to the CONTROLLER's own Digimon, not the opponent's — the amount
 * is positive because the grantee's own owner gains memory on its own deletion).
 *
 * Q1f second pass — more literal-printed-text entries, same convention (every "your"/"this
 * Digimon" in the granted text resolves relative to the GRANTED permanent's own owner/self,
 * never the granter):
 *
 * `"[On Deletion] Trash the top card of your security stack."` — BT12-105/BT15-095's granted
 * "1 of your opponent's Digimon gains ...". `SecurityManipulation`'s `controller` defaults to
 * `ctx.source.ownerSeat` when omitted (`runSecurityManipulation`: `seat = action.controller ===
 * "opponent" ? opp : mine`), so leaving it unset makes the GRANTEE trash their own top security
 * — matching KB Q2241 (deleting the grantee mid-attack, before its own security check, can drop
 * its security count to 0 and win the game).
 *
 * `"[When Attacking] Lose 2 memory"` — EX1-068/EX4-018's granted "1 of your opponent's Digimon
 * gains ...". Same body as `"[When Attacking] Lose 1 memory."` above at a different magnitude;
 * KB Q3255 confirms the OPPONENT (the grantee's own controller) loses the memory, matching
 * `GainMemory`'s seatless form resolving via `ctx.source.ownerSeat`.
 *
 * `"[On Deletion] Trash 1 card in your hand."` — EX8-059's granted "1 of your opponent's Digimon
 * gains ...". "your hand" = the grantee's own hand (self-referential), mirroring the card's own
 * unrelated `[When Attacking]` `Trash` clause shape (`{controller:"mine", zone:"hand"}`).
 *
 * `"[When Attacking] Trash the bottom digivolution card of this Digimon."` — BT8-031's granted
 * "All of your opponent's Digimon gain ..." (the outer `[Opponent's Turn]` wrapper only gates
 * WHEN the grant is (re-)installed each continuous recompute — idempotent — not the granted
 * body's own timing, which is the ordinary discrete `WhenAttacking` window).
 *
 * `"[End of Attack] Delete this Digimon."` — EX7-058/EX6-048's granted "1 of your opponent's
 * Digimon gains ...". `EndOfAttack` maps to the discrete `EffectTiming.OnEndAttack` window
 * (`timingForTrigger`), so this reaches the grantee exactly once, at that Digimon's own
 * attack's end.
 *
 * `"[Start of Your Main Phase] Attack with this Digimon."` and `"[Start of Your Main Phase]
 * This Digimon attacks."` — two literal printed phrasings of the same forced-self-attack grant
 * (BT12-107; BT16-058/BT18-099/EX6-042/ST15-16/BT23-032/P-183), kept as separate keys per the
 * literal-text convention. `StartOfYourMainPhase` maps to the discrete `EffectTiming
 * .OnStartMainPhase` window (fired by `fireTiming` for every candidate instance, `turnOwnerGuard`
 * gating it to the GRANTEE's own main phase) — distinct from, but sitting alongside, the System B
 * `startOfYourMainPhase` SubTrigger bus `fireTiming` ALSO fires at the same physical point
 * (GameEngine.ts:1263) for the unrelated hand-installed-SubTrigger encoding BT12-065 uses; either
 * mechanism reaches the same instant, and the discrete library route needs no SubTrigger install
 * at all.
 */
const GRANTED_EFFECT_LIBRARY: Record<string, CardEffect> = {
  "[All Turns] When this Digimon becomes suspended, lose 2 memory.": {
    trigger: "AllTurns",
    actions: [
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        actions: [
          {
            kind: "GainMemory",
            amount: -2,
          } as Action,
        ],
      } as Action,
    ],
  },
  "[Your Turn] When attacking an opponent's Digimon with no digivolution cards, delete that Digimon": {
    trigger: "WhenAttacking",
    actions: [
      {
        kind: "Delete",
        target: { sourceRef: "triggerDefender", filter: {}, count: 1 },
        condition: {
          kind: "attackTargetMatchesFilter",
          filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
        },
      } as Action,
    ],
  },
  OnDeletionDeleteLowest: {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "Delete",
        target: {
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
            superlative: "lowestLevel",
          },
          count: 1,
        },
      } as Action,
    ],
  },
  OnDeletionLose1Memory: {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "GainMemory",
        amount: -1,
      } as Action,
    ],
  },
  OnDeletionGain2Memory: {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "GainMemory",
        amount: 2,
      } as Action,
    ],
  },
  OnDeletionGain2MemoryAndReturn3000DP: {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "GainMemory",
        amount: 2,
      } as Action,
      {
        kind: "Return",
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            dp: { op: "lte", value: 3000 },
          },
          count: 1,
        },
        from: ["trash"],
        to: "hand",
      } as Action,
    ],
  },
  "[On Deletion] Lose 1 memory.": {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "GainMemory",
        amount: -1,
      } as Action,
    ],
  },
  "[On Deletion] Lose 2 memory": {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "GainMemory",
        amount: -2,
      } as Action,
    ],
  },
  "[On Deletion] Gain 3 memory.": {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "GainMemory",
        amount: 3,
      } as Action,
    ],
  },
  "[When Attacking] Lose 1 memory.": {
    trigger: "WhenAttacking",
    actions: [
      {
        kind: "GainMemory",
        amount: -1,
      } as Action,
    ],
  },
  OnDeletionPlaySelfNoOnPlay: {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "PlayWithoutCost",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        payCost: false,
        suppressOnPlayEffects: true,
      } as Action,
    ],
  },
  OnPlayBlitzIfHasDigivolutionCard: {
    trigger: "OnPlay",
    actions: [
      {
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: { keyword: "Blitz" },
        duration: "forTheTurn",
        condition: { kind: "selfDigivolutionCountAtLeast", value: 1 },
      } as Action,
    ],
  },
  OnDeletionPlaySelf: {
    trigger: "OnDeletion",
    optional: true,
    actions: [
      {
        kind: "PlayWithoutCost",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        payCost: false,
      } as Action,
    ],
  },
  OnDeletionPlaySelfMandatory: {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "PlayWithoutCost",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        payCost: false,
      } as Action,
    ],
  },
  "[On Deletion] Trash the top card of your security stack.": {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "SecurityManipulation",
        op: "trashTop",
        amount: 1,
      } as Action,
    ],
  },
  "[When Attacking] Lose 2 memory": {
    trigger: "WhenAttacking",
    actions: [
      {
        kind: "GainMemory",
        amount: -2,
      } as Action,
    ],
  },
  "[On Deletion] Trash 1 card in your hand.": {
    trigger: "OnDeletion",
    actions: [
      {
        kind: "Trash",
        target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
      } as Action,
    ],
  },
  "[When Attacking] Trash the bottom digivolution card of this Digimon.": {
    trigger: "WhenAttacking",
    actions: [
      {
        kind: "TrashDigivolution",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        amount: 1,
        fromTop: false,
      } as Action,
    ],
  },
  "[End of Attack] Delete this Digimon.": {
    trigger: "EndOfAttack",
    actions: [
      {
        kind: "Delete",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      } as Action,
    ],
  },
  "[Start of Your Main Phase] Attack with this Digimon.": {
    trigger: "StartOfYourMainPhase",
    actions: [
      {
        kind: "Attack",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      } as Action,
    ],
  },
  "[Start of Your Main Phase] This Digimon attacks.": {
    trigger: "StartOfYourMainPhase",
    actions: [
      {
        kind: "Attack",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      } as Action,
    ],
  },
};

/**
 * Compile a granted token to the engine Effects it contributes at `timing`, anchored on the
 * granted permanent's `source`. Mirrors `irCardModule.effectsForTiming` for a single synthetic
 * CardEffect: pick the timing builder, gate per turn-owner, and run the IR actions on resolve.
 * The builder's own base guard applies — for [On Deletion] (`onDeletion`) that gate is "the
 * SOURCE (granted) permanent is in this window's deleted set", so the granted effect fires only
 * when the granted Digimon itself is deleted, exactly like a printed [On Deletion].
 *
 * Throws for a token with NO library entry — this is a `grantCustomEffect`/`GrantStatic
 * grant:"effects"` call site naming an effect the library cannot express, which used to
 * silently return `[]` (the grant installs, the ledger records it, but nothing ever fires).
 * Failing loudly at the point the grant is actually consulted turns that class of bug into an
 * immediate, attributable crash instead of a card that quietly does nothing forever. Known
 * genuine gaps that are NOT yet expressible as a triggered CardEffect (e.g. BT17-008/BT17-010/
 * BT19-007/BT19-009/BT19-011/EX7-066's "DeleteCap+2000"/"DeleteCap+3000" — a cross-effect DP-cap
 * BOOST for an already-resolving Delete action, not a self-contained triggered ability) are left
 * unresolved by design; this throw is what will surface them the moment their grant condition
 * actually becomes live, rather than leaving them silently inert forever.
 */
export function grantedTokenEffectsForTiming(token: string, timing: EffectTiming, source: CardSource): Effect[] {
  const effect = GRANTED_EFFECT_LIBRARY[token];
  if (effect === undefined) {
    throw new Error(
      `grantedTokenEffectsForTiming: unknown granted-effect token "${token}" (source ` +
        `${source.cardId}) — add it to GRANTED_EFFECT_LIBRARY in interpreter.ts, or fix the ` +
        `grantCustomEffect/GrantStatic call site naming it. This grant would otherwise install ` +
        `into the ledger and silently never fire.`,
    );
  }
  if (!timingsForTrigger(effect, false).includes(timing)) return [];
  const build = builderForTrigger(effect);
  return [
    build({
      source,
      effectKey: `granted/${token}/${timing}`,
      description: `[Granted] ${describeEffect(effect)}`,
      optional: effect.optional ?? false,
      when: turnOwnerGuard(effect.trigger),
      resolve: async (ctx) => {
        await runEffect(ctx, effect);
      },
    }),
  ];
}
