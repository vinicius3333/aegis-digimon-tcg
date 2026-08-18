// Digivolution, DNA digivolution, App Fusion, DigiXros, and Link.

import type { ActionBase } from "./base.js";
import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target, ZoneRef } from "../filters.js";
import type { Scaling } from "../predicates.js";

/**
 * Widen the DigiXros material source zones at BeforePayCost time (BT19-079 "from under your
 * Tamers", BT19-087 "from under Tamers + trash"). Recorded per-seat for `duration` and read by
 * the material-picking path.
 */
export interface DigiXrosMaterialZoneExpansionAction extends ActionBase {
  kind: "DigiXrosMaterialZoneExpansion";
  zones: ZoneRef[];
  /** Typically untilOpponentTurnEnd for [All Turns]. */
  duration: EffectDurationRef;
}

/**
 * In a `wouldBePlayed` Replacement's `additionalEffects`: trash cards may also be placed as
 * DigiXros materials, on top of the default hand and battle-area zones (BT21-030). Carried as an
 * additional effect so the DigiXros validator can detect it statically from the compiled IR.
 */
export interface AllowDigiXrosMaterialsFromTrashAction extends ActionBase {
  kind: "AllowDigiXrosMaterialsFromTrash";
}

export interface DeDigivolveAction extends ActionBase {
  kind: "DeDigivolve";
  target: Target;
  /**
   * Fixed peel count, or the dynamic "＜De-Digivolve 1＞ for each of this Digimon's face-down
   * digivolution cards" form (EX9-043), resolved against the source at run time.
   */
  amount: number | { kind: "countFaceDownDigivolutionCards"; host: "self" };
  /**
   * "You can't trash past level N cards": stop once the card that would become the new top is
   * at or below this level, leaving it in place. Absent peels up to `amount` unconditionally.
   */
  stopAtLevel?: number;
}

export interface DigivolveAction extends ActionBase {
  kind: "Digivolve";
  /** What digivolves ("this Digimon", "1 of your Digimon"). */
  target: Target;
  /** Filter on the card digivolved into. */
  into?: Filter;
  /** Source zone for the card digivolved INTO; the interpreter resolves the pool. */
  from?: ZoneRef[];
  /**
   * A legacy prose-compiler encoding stores the fixed cost as a NUMBER, which the interpreter
   * normalizes to {@link DigivolveAction.costOverride}. New IR should use `true` + `costOverride`.
   */
  payCost: boolean | number;
  /**
   * Reduction folded INTO the digivolve verb, not a standalone cost-modifier construct.
   */
  costDelta?: number;
  /**
   * With `from` including `"security"`, the default path allows only FACE-UP security cards
   * (BT19-084). This lets the controller see and pick face-down ones.
   */
  faceDownSecurityOk?: boolean;
  /** Restrict the source card to cards revealed by the immediately preceding Search. */
  amongPreviousSearch?: boolean;
  /** Alternative spelling of `costDelta`. */
  reduceCost?: number;
  /**
   * Reduction folded into the digivolve verb whose amount is counted at resolution time
   * (BT21-082). It must NOT be modelled as a separate `wouldDigivolve` replacement — a
   * replacement installed alongside the action cannot reach the action's own digivolve. Stacks
   * with the fixed `reduceCost`/`costDelta`.
   */
  reduceCostScaling?: Scaling;
  /** Alternative name for `into`. */
  onto?: Filter;
  ignoreReqs?: boolean;
  costOverride?: number;
  /** Level to treat the digivolving Digimon as, for requirements. */
  asLevel?: number;
  /** Alternative name for `ignoreReqs`. */
  ignoreRequirements?: boolean;
  /** Alternative name for `ignoreReqs`. */
  ignoreDigivolutionRequirements?: boolean;
  /** Ignore only the level requirement, preserving the action's explicit filters. */
  ignoreLevelRequirement?: boolean;
  /** The card digivolved into must share a color with the chosen base. */
  colorsMatchDigivolvingSource?: boolean;
  /** Store the resulting permanent id for a downstream `filter.boundRef` or condition. */
  bindResultAs?: string;
}

export interface PlaceUnderAction extends ActionBase {
  kind: "PlaceUnder";
  /** Cards placed as digivolution cards or under a Tamer. */
  target: Target;
  underFilter?: Filter;
  /**
   * Place the top card of the Digi-Egg deck instead of a card resolved by `target` (BT13-007,
   * EX6-006). Routed through `placeUnderFromEggDeck`; `target` stops being a card source, while
   * the source permanent / `underFilter` still selects the host. Distinct from `targetIsPermanent`.
   */
  fromEggDeck?: boolean;
  /** Place `player.deck[0]` with no prompt (ST23-13, ST23-14). Distinct from `fromEggDeck`. */
  fromDeckTop?: boolean;
  /**
   * With `fromEggDeck`: place the egg as the host's TOP digivolution card, revealed, rather than
   * the default bottom (BT22-007; KB Q4856). A non-matching egg-deck top is returned untouched
   * when `target.filter` carries a predicate. Routed through `placeAsTopFromEggDeck`.
   */
  asTop?: boolean;
  /**
   * `target` is a battle-area PERMANENT being relocated under the host, whole stack included,
   * rather than loose cards from hand or trash.
   */
  targetIsPermanent?: boolean;
  /**
   * The host is itself a prior `Target.bindAs` selection (the second `Mode.Custom` select, whose
   * predicate is `permanent != selectedPermanent`). Used instead of resolving `underFilter`.
   */
  underSelectionRef?: string;
  position?: string;
  /** Let the controller arrange multiple selected cards before they enter the stack. */
  order?: "any";
  /**
   * Descriptive: the placeUnder primitive already marks effect-placed loose cards face-down.
   * The flag preserves the printed intent (EX9-043) and feeds face-down-count readers such as
   * `DeDigivolveAction`'s dynamic amount.
   */
  faceDown?: boolean;
  source?: string;
  /** Store the chosen host permanent id for downstream actions. */
  bindHostAs?: string;
  /**
   * Narrow the loose-card pool for `target` (BT19-038: `["hand", "trash"]`); absent falls back
   * to the legacy hand/trash/deck sweep. Older IR records spell this `target.from`.
   */
  from?: ZoneRef[];
  /**
   * Select the host permanent independently of the placed card's filter (BT19-038 "place 1 Tamer
   * you control under 1 of your [Xros Heart]/[Blue Flare] Digimon"). Absent makes the source
   * permanent, or `underFilter`, the host.
   */
  destination?: { filter: Filter; count: number };
  /**
   * Place as DigiXros materials for the Digimon being played — the trigger source of the
   * enclosing `wouldBePlayed` Replacement — via the materials slot rather than the digivolution
   * stack. BT19-081 uses it to extend the legal material pool to cards under the controller's Tamers.
   */
  asDigiXrosMaterial?: boolean;
  /**
   * Store how many cards were actually placed, for a later `unit:"namedCount"` scaling or
   * `levelComparison.scaling` (EX6-015).
   */
  trackCount?: string;
}

/**
 * "Trash the top/bottom digivolution card of <target>". Distinct from De-Digivolve, which sends
 * the TOP card to the deck and reverts a stage — this removes a source card and leaves the
 * Digimon's stage unchanged.
 */
export interface TrashDigivolutionAction extends ActionBase {
  kind: "TrashDigivolution";
  target: Target;
  /** Default 1. */
  amount?: number | "all";
  /** The default source form. */
  fromTop?: boolean;
  position?: string;
  /**
   * `"acrossDigimon"` pools digivolution cards from ALL matching permanents and lets the
   * controller pick `amount` from the combined pool (EX12-035). Default is the first-resolved
   * permanent only.
   */
  scope?: "acrossDigimon";
  /**
   * The controller freely picks `amount` cards from the whole stack (RB1-016; KB Q4094) instead
   * of a deterministic `fromTop`/bottom slice.
   */
  choose?: boolean;
}

export interface LinkAction extends ActionBase {
  kind: "Link";
  target: Target;
  /** Negative means cheaper. */
  costDelta?: number;
  /** False skips the link cost entirely ("without paying the cost"). */
  payCost?: boolean;
  /**
   * The friendly Digimon that RECEIVES the linked card. Absent links onto the source permanent
   * ("to this Digimon").
   */
  recipient?: Target;
  /** Default ["hand","digivolutionCards"]. */
  from?: ZoneRef[];
}

/**
 * A recipient-scoped continuous LINK-cost reduction installed on the source's own permanent:
 * when a card matching `whenLinkingTrait` would link to that recipient, its cost drops by `amount`.
 *
 * Unlike `LinkAction.costDelta`, which only touches a link the source card itself declares, this
 * reduces a link declared by ANY actor onto the recipient. Read by `runLink`/`linkCostOf` from
 * the recipient's grant store. Per KB BT25-089 Q6423 multiple reductions do NOT stack — the read
 * site caps to the largest single grant — and the cost floors at 0.
 */
export interface GrantLinkCostReductionAction extends ActionBase {
  kind: "GrantLinkCostReduction";
  /** Defaults to the source permanent. */
  target: Target;
  /** Positive means cheaper by this much (BT25-004 => 1). */
  amount: number;
  /** Traits a would-link card must carry, e.g. Social/Tool/Game. */
  whenLinkingTrait: string[];
  duration: EffectDurationRef;
}

/**
 * "[All Turns] players can't ignore digivolution requirements" (KB Q1738-Q1743): a seat-level
 * continuous rule-modifier suppressing other cards' ignore-requirements effects for BOTH players
 * (Q1738). DNA/Burst and no-cost digivolves are unaffected (Q1739/Q1740), as is adding
 * digivolution info (Q1743); ignoring PART of the requirements is blocked (Q1741/Q1742).
 */
export interface CannotIgnoreDigivolutionRequirementsAction extends ActionBase {
  kind: "CannotIgnoreDigivolutionRequirements";
  /** BT8-059 affects both players (Q1738). */
  affects: "both";
  duration: EffectDurationRef;
}

/** ＜Mind Link＞ — place this Tamer as the bottom digivolution card of a chosen Digimon. */
export interface MindLinkAction extends ActionBase {
  kind: "MindLink";
  target: Target;
}

/**
 * "You may use/play this card without meeting its color requirements" and the "ignore this
 * card's color requirements" family. A continuous permission, never a no-op once recorded.
 */
export interface WaiveColorRequirementAction extends ActionBase {
  kind: "WaiveColorRequirement";
  /** Defaults to the source card. */
  target?: Target;
  /** Alternative specification of which color is waived. */
  color?: string;
  duration?: EffectDurationRef;
}

/**
 * One slot in the per-slot array form of `DnaDigivolveAction.materials` (EX6-072: "1 of your
 * level 6 Digimon and 1 card in the hand"). Each slot resolves in its own zone, unlike the
 * single-`Target` form, which always searches the battle and breeding areas.
 */
export interface DnaDigivolveMaterialSlot {
  filter: Filter;
  zone: ZoneRef;
  count: number;
}

/** "DNA digivolve this Digimon and one of your other Digimon into [X]". */
export interface DnaDigivolveAction extends ActionBase {
  kind: "DnaDigivolve";
  /**
   * `includeRef` pins one slot to a referenced permanent — `"triggerSubject"` (the permanent
   * that drove the enclosing event, mirroring `Target.sourceRef`) or `"self"` — and the player
   * chooses the remaining `count - 1`, excluding the pinned id. An unresolvable pin makes the
   * DNA digivolve illegal.
   *
   * The array form instead resolves one `DnaDigivolveMaterialSlot` per material in its own zone,
   * for mixed-zone recipes. It supports neither `includeRef` nor `isSelf`.
   */
  materials: (Target & { includeRef?: "triggerSubject" | "self" }) | DnaDigivolveMaterialSlot[];
  /** Additional non-permanent material cards, e.g. a specific card in trash or hand. */
  looseMaterials?: Target & { from?: ZoneRef[] };
  /** Filter on the result. */
  into?: Filter;
  payCost: boolean;
  /** Store the resulting permanent id for a downstream `filter.boundRef`. */
  bindResultAs?: string;
}

/**
 * "1 of your Digimon may app fuse into a Digimon card in the trash/hand."
 *
 * App Fusion plays the fusion-TARGET card on top of an existing battle-area Digimon, carrying
 * that Digimon's stack underneath — the same placement as `digivolveFromInstance`, not
 * DnaDigivolve, since no material is consumed.
 *
 * Legality belongs to the TARGET card's `appFusionRequirement`: the fusing permanent's top card
 * plus its linked cards must cover at least two DISTINCT names from `appFusionRequirement.names`.
 * The paid cost is `appFusionRequirement.cost`.
 */
export interface AppFuseAction extends ActionBase {
  kind: "AppFuse";
  /** The fusing battle-area Digimon. */
  source: Target;
  /** Filter on the fusion-result card. */
  into: Filter;
  /** "trash" for BT24-087, "hand" for BT25-089. */
  from: ZoneRef[];
}
