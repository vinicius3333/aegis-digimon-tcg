// Digivolution, DNA digivolution, App Fusion, DigiXros, and Link.

import type { ActionBase } from "./base.js";
import type { EffectDurationRef } from "../durations.js";
import type { Filter, Target, ZoneRef } from "../filters.js";
import type { Scaling } from "../predicates.js";

/**
 * Expand DigiXros material source zones at BeforePayCost time (BT19-079 Taiki Kudo,
 * BT19-087 Nene Amano). When active, the DigiXros material-gathering code may source
 * cards from the additional `zones` (e.g. "from under your Tamers" for BT19-079,
 * "from under Tamers + trash" for BT19-087). The expansion is recorded per-seat for
 * `duration`; the play-card / DigiXros material-picking path reads it. For v1 the
 * record is the deliverable; the consumption path lives in the DigiXros subsystem.
 */
export interface DigiXrosMaterialZoneExpansionAction extends ActionBase {
  kind: "DigiXrosMaterialZoneExpansion";
  /** Additional zones to source DigiXros materials from. */
  zones: ZoneRef[];
  /** Duration the expansion lasts (typically UntilOpponentTurnEnd for [All Turns]). */
  duration: EffectDurationRef;
}

/**
 * Marks a `wouldBePlayed` Replacement's `additionalEffects`: when this card would be played,
 * cards in the controller's trash may also be placed as DigiXros materials (in addition to the
 * default hand / battle-area zones). BT21-030: "cards in your trash can also be placed for
 * DigiXros". Carried as an additional effect inside a `ReplacementAction.additionalEffects`
 * list so the DigiXros validator can detect it statically from the compiled IR without threading
 * runtime state.
 */
export interface AllowDigiXrosMaterialsFromTrashAction extends ActionBase {
  kind: "AllowDigiXrosMaterialsFromTrash";
}

export interface DeDigivolveAction extends ActionBase {
  kind: "DeDigivolve";
  target: Target;
  /**
   * Fixed peel count, or the dynamic form "＜De-Digivolve 1＞ for each of this Digimon's
   * face-down digivolution cards" (EX9-043) — resolved at run time as the SOURCE permanent's
   * face-down digivolution-stack card count.
   */
  amount: number | { kind: "countFaceDownDigivolutionCards"; host: "self" };
  /**
   * "You can't trash past level N cards" — the De-Digivolve stops peeling once the
   * card it would promote to the new top is at-or-below this level (that card is left
   * in place rather than trashed). Absent => peel up to `amount` times unconditionally.
   */
  stopAtLevel?: number;
}

export interface DigivolveAction extends ActionBase {
  kind: "Digivolve";
  /** What digivolves ("this Digimon", "1 of your Digimon"). */
  target: Target;
  /** Into what (filter on the card digivolved into). */
  into?: Filter;
  /**
   * Where the card digivolved INTO comes from ("from your hand", "from your trash"),
   * (hand). Provenance for the digivolve source zone; the interpreter resolves the pool.
   */
  from?: ZoneRef[];
  /**
   * Whether the digivolve pays a cost. Normally a boolean. A legacy prose-compiler encoding stores
   * the fixed digivolution cost as a NUMBER ("for a digivolution cost of N" -> payCost:N), which the
   * interpreter normalizes to {@link DigivolveAction.costOverride}. Prefer `payCost:true` +
   * `costOverride` in new IR.
   */
  payCost: boolean | number;
  /**
   * Cost reduction folded INTO the digivolve verb ("... for the digivolution cost ...
   * `reduceCostTuple`. This is part of the digivolve (NOT a separate ChangeCost effect),
   * so it does not constitute a standalone cost-modifier construct.
   */
  costDelta?: number;
  /**
   * When `from` includes `"security"`, the default path only allows face-up security
   * cards (BT19-084 semantics). Setting this to `true` permits digivolving into a
   * `canLookReverseCard: true`, allowing the controller to see and pick face-down cards.
   */
  faceDownSecurityOk?: boolean;
  /** Restrict the source card to cards revealed by the immediately preceding Search. */
  amongPreviousSearch?: boolean;
  /** Alternative digivolve cost reduction ("reduce the digivolution cost by N"). */
  reduceCost?: number;
  /**
   * Cost reduction folded into the digivolve verb whose AMOUNT is counted at resolution time
   * ("for each of your red Tamers with different names, reduce this effect's digivolution cost
   * by 1" — BT21-082). Mirrors the documented behavior `reduceCostTuple` being computed and passed into the
   * digivolve call, so it must NOT be modelled as a separate `wouldDigivolve` replacement: a
   * replacement installed alongside the action cannot reach the action's own digivolve.
   * Stacks with the fixed `reduceCost`/`costDelta`.
   */
  reduceCostScaling?: Scaling;
  /** Target card to digivolve onto (alternative name for into). */
  onto?: Filter;
  /** True when ignoring digivolution requirements. */
  ignoreReqs?: boolean;
  /** Cost override for the digivolution. */
  costOverride?: number;
  /** Level to treat the digivolving Digimon as for requirements. */
  asLevel?: number;
  /** True when ignoring digivolution requirements. */
  ignoreRequirements?: boolean;
  /** True when ignoring digivolution requirements (alternative name). */
  ignoreDigivolutionRequirements?: boolean;
  /** Ignore only the ordinary level requirement while preserving the action's explicit filters. */
  ignoreLevelRequirement?: boolean;
  /** Require the card digivolved into to share at least one color with the chosen base. */
  colorsMatchDigivolvingSource?: boolean;
  /** Store the resulting permanent id under this name for downstream `filter.boundRef`/conditions. */
  bindResultAs?: string;
}

export interface PlaceUnderAction extends ActionBase {
  kind: "PlaceUnder";
  /** Cards placed as digivolution cards / under a Tamer. */
  target: Target;
  underFilter?: Filter;
  /**
   * True when the placed card is the TOP card of the controller's Digi-Egg deck rather than
   * a loose card resolved by `target` (BT13-007 / EX6-006 "place the top card of your
   * Digi-Egg deck as this Digimon's bottom digivolution card"). The interpreter routes this
   * through the `placeUnderFromEggDeck` primitive and ignores `target` as a card source (the
   * source permanent / `underFilter` still selects the host). Distinct from `targetIsPermanent`.
   */
  fromEggDeck?: boolean;
  /**
   * True when the placed card is the TOP card of the controller's MAIN deck (ST23-13, ST23-14:
   * "place the top card of your deck face down under this Tamer"). The interpreter takes
   * `player.deck[0]` — no selection prompt. Distinct from `fromEggDeck`.
   */
  fromDeckTop?: boolean;
  /**
   * With `fromEggDeck`: place the Digi-Egg-deck top as the host's TOP digivolution card (REVEALED),
   * rather than the default BOTTOM placement (BT22-007 "place [Mother Eater]s as this Digimon's TOP
   * digivolution cards" — KB Q4856). When `target.filter` carries a name/trait predicate the egg-deck
   * non-matching top is returned to the deck untouched. Routed through `placeAsTopFromEggDeck`.
   */
  asTop?: boolean;
  /**
   * True when `target` is itself a battle-area PERMANENT being relocated under the host
   * Digimon under another of their Digimon" form), rather than loose cards from hand/trash.
   * The interpreter resolves `target` as a permanent and moves its whole stack under the host.
   */
  targetIsPermanent?: boolean;
  /**
   * The host permanent B is itself a prior selection (`Target.bindAs`), e.g. the second
   * `Mode.Custom` select whose predicate is `permanent != selectedPermanent`. When set the
   * interpreter uses the bound permanent as the host instead of resolving `underFilter`.
   */
  underSelectionRef?: string;
  /** Position in the stack: "top" or "bottom". */
  position?: string;
  /** Let the controller arrange multiple selected cards before they are placed in the stack. */
  order?: "any";
  /**
   * The card is placed FACE DOWN ("place 1 Digimon card from your trash face down as this
   * Digimon's bottom digivolution card", EX9-043). Descriptive: the placeUnder primitive
   * already marks effect-placed loose cards face-down; the flag preserves the printed intent
   * and feeds face-down-count readers (DeDigivolveAction's dynamic amount).
   */
  faceDown?: boolean;
  /** Source zone for the cards to place under. */
  source?: string;
  /** Store the selected destination/host permanent id for downstream actions (e.g. "the Digimon this was placed under attacks"). */
  bindHostAs?: string;
  /**
   * Source zones for the cards selected by `target` (BT19-038: `["hand", "trash"]`).
   * When set, narrows the loose-card pool; absent falls back to the legacy hand/trash/deck sweep.
   * Distinct from `target.from`, which some older IR records use for the same purpose.
   */
  from?: ZoneRef[];
  /**
   * Explicit destination permanent — the permanent UNDER WHICH the target card is placed.
   * When set, the player selects a permanent matching this filter as the host; when absent the
   * source permanent (or `underFilter`) is the host. BT19-038: "place 1 Tamer you control
   * under 1 of your [Xros Heart]/[Blue Flare] Digimon" uses this to select the destination
   * Digimon independently of the placed card's filter.
   */
  destination?: { filter: Filter; count: number };
  /**
   * When true, the placed cards are DigiXros materials for the Digimon being played
   * (the trigger source of the `wouldBePlayed` Replacement). They are placed under that
   * Digimon via the DigiXros materials slot, not as a normal digivolution-stack placement.
   * Used by BT19-081 inside a `wouldBePlayed` Replacement to extend the legal material pool
   * to include cards from under the controller's Tamers.
   */
  asDigiXrosMaterial?: boolean;
  /**
   * Store the number of cards actually placed under a name so a later `scaling`
   * (`unit:"namedCount"`) or `levelComparison.scaling` can read it (EX6-015: "for each card
   * placed in this Digimon's digivolution cards, add 1 to the level this effect may return").
   */
  trackCount?: string;
}

/**
 * "Trash the top/bottom digivolution card of <target>" — remove one of a permanent's
 * `the effect runtime.TrashDigivolutionCardsFromTopOrBottom(isFromTop)` form; distinct
 * from De-Digivolve (which sends the TOP card to the deck and reverts a stage) — this
 * removes a SOURCE card and the Digimon's stage is unchanged.
 */
export interface TrashDigivolutionAction extends ActionBase {
  kind: "TrashDigivolution";
  /** Whose digivolution cards are trashed (the selected permanent). */
  target: Target;
  /** How many source cards to trash (default 1). */
  amount?: number | "all";
  /** True => trash from the TOP of the digivolution stack (the default source form). */
  fromTop?: boolean;
  /** Position in the stack: "top" or "bottom". */
  position?: string;
  /**
   * "acrossDigimon": pool digivolution cards from ALL matching permanents and let the
   * controller pick `amount` cards from the combined pool (EX12-035 "any 4 digivolution
   * cards from your opponent's Digimon"). Default: single-target (first-resolved permanent).
   */
  scope?: "acrossDigimon";
  /**
   * True => the controller freely picks `amount` cards from the target permanent's whole
   * stack (RB1-016 "trash any 1 card under [permanent]", KB Q4094) instead of a deterministic
   * `fromTop`/`fromBottom` slice.
   */
  choose?: boolean;
}

export interface LinkAction extends ActionBase {
  kind: "Link";
  target: Target;
  /** Link-cost modifier from "with the cost reduced by N" (negative => cheaper). */
  costDelta?: number;
  /** When true, skip the link cost payment entirely ("without paying the cost"). */
  payCost?: boolean;
  /**
   * The friendly Digimon that RECEIVES the linked card ("link ... to 1 of your Digimon").
   * Absent => link onto the source permanent (the "to this Digimon" default). The
   * interpreter resolves it with a permanent prompt scoped to the controller's Digimon.
   */
  recipient?: Target;
  /** Link-material source zones ("from your hand or trash"). Default ["hand","digivolutionCards"]. */
  from?: ZoneRef[];
}

/**
 * A recipient-scoped, continuous LINK-cost reduction (documented behavior `rule implementation` +
 * `UntilCalculateFixedCostEffect`, documented behavior). Installed on the source's own permanent
 * (the link RECIPIENT) while the [Your Turn] gate holds: when a card whose definition matches
 * `whenLinkingTrait` WOULD link to that recipient, its link cost is reduced by `amount`.
 *
 * Unlike `LinkAction.costDelta` (which only reduces a link the SOURCE card itself declares),
 * this grant reduces a link DECLARED BY ANY ACTOR onto the recipient — the cross-actor
 * WhenWouldLink broadening (subsumes BT25-045's deferred broadening). The reduction is read by
 * `runLink`/`linkCostOf` from the recipient's grant store; per KB BT25-089 Q6423 multiple
 * reductions do NOT stack on one link declaration (the read site caps to the largest single
 * grant), and the floored cost never goes below 0.
 */
export interface GrantLinkCostReductionAction extends ActionBase {
  kind: "GrantLinkCostReduction";
  /** The link recipient(s) the reduction is installed on (defaults to the source permanent). */
  target: Target;
  /** Magnitude of the reduction (positive => cheaper by this much; BT25-004 => 1). */
  amount: number;
  /** Trait tokens a WOULD-link card must carry for the reduction to apply (e.g. Social/Tool/Game). */
  whenLinkingTrait: string[];
  /** How long the grant is live ("[Your Turn]" continuous => untilYourTurnEnd / the static window). */
  duration: EffectDurationRef;
}

/**
 * "[All Turns] players can't ignore digivolution requirements" (documented behavior
 * `rule implementation`, documented behavior; KB Q1738-Q1743). A seat-level
 * continuous rule-modifier that SUPPRESSES other cards' "ignore digivolution requirements"
 * effects for BOTH players (Q1738). DNA/Burst and no-cost digivolves are unaffected (Q1739/Q1740);
 * adding digivolution info is unaffected (Q1743); ignoring PART of the requirements is blocked
 * (Q1741/Q1742). The flag is consulted by the digivolve-legality path's ignore-requirements hook
 * — when that hook does not yet exist in-engine, the flag is faithfully RECORDED (proven by a
 */
export interface CannotIgnoreDigivolutionRequirementsAction extends ActionBase {
  kind: "CannotIgnoreDigivolutionRequirements";
  /** Whose ignore-requirements effects are suppressed; BT8-059 affects "both" players (Q1738). */
  affects: "both";
  /** How long the rule is live ("[All Turns]" => the permanent/static continuous window). */
  duration: EffectDurationRef;
}

/**
 * ＜Mind Link＞ — place this Tamer as the bottom digivolution card of a chosen Digimon
 * `rule implementation(...).MindLink()`.
 */
export interface MindLinkAction extends ActionBase {
  kind: "MindLink";
  /** Digimon selection filter (controller mine, kind Digimon, name/trait predicates). */
  target: Target;
}

/**
 * "You may use/play this card without meeting its color requirements" and the
 * "ignore this card's color requirements" family. A continuous permission on the
 * source (or a referenced card) — never a no-op once recorded.
 */
export interface WaiveColorRequirementAction extends ActionBase {
  kind: "WaiveColorRequirement";
  /** Whose color requirement is waived; defaults to the source card. */
  target?: Target;
  /** Color that's being waived (alternative specification). */
  color?: string;
  duration?: EffectDurationRef;
}

/**
 * One material slot in the W7-E-2 per-slot array form of `DnaDigivolveAction.materials`
 * (e.g. EX6-072: "1 of your level 6 Digimon [on the field] and 1 card in the hand").
 * Each slot resolves independently in its own named zone, unlike the single-`Target`
 * form which always searches the battle area / breeding area.
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
   * The two (or more) material Digimon. When `materials.includeRef` is set, one material slot is
   * pinned to a referenced permanent and the player chooses the remaining `count - 1` from the
   * filter (excluding the pinned id). If the pinned permanent cannot be resolved the DNA digivolve
   * is not legal.
   *
   * `"triggerSubject"` — the permanent that drove the enclosing trigger event
   * (TriggerInfo.subjectPermanentId / deletedPermanentId / attackerPermanentId).
   * Mirrors the existing `Target.sourceRef: "triggerSubject"` vocabulary.
   *
   * `"self"` — the source permanent ("this Digimon").
   *
   * Alternatively (W7-E-2), an array of `DnaDigivolveMaterialSlot`: one entry per material,
   * each resolved independently in its own `zone` (mixed-zone materials, e.g. one from the
   * field plus one from the hand). Every entry contributes exactly `count` materials; there
   * is no `includeRef`/`isSelf` support in this form.
   */
  materials: (Target & { includeRef?: "triggerSubject" | "self" }) | DnaDigivolveMaterialSlot[];
  /** Additional non-permanent material cards, e.g. a specific card in trash/hand. */
  looseMaterials?: Target & { from?: ZoneRef[] };
  /** The card DNA-digivolved into (filter on the result). */
  into?: Filter;
  payCost: boolean;
  /** Store the resulting permanent id under this name for downstream `filter.boundRef` use. */
  bindResultAs?: string;
}

/**
 * "1 of your Digimon may app fuse into a Digimon card in the trash/hand."
 *
 * App Fusion (the Appmon mechanic) plays a fusion-TARGET Digimon card from the trash or
 * hand ON TOP of an existing battle-area Digimon, carrying that Digimon's stack underneath
 * — the same placement as `digivolveFromInstance`, NOT DnaDigivolve (no material is consumed
 * fusion target's `CanAppFusionFromTargetPermanent`.
 *
 * Legality is owned by the TARGET card's `appFusionRequirement` (`AddAppfuseMethodByName` /
 * `IAddAppFusionConditionEffect`): the fusing permanent's top card plus its linked cards must
 * collectively cover at least two DISTINCT names from `appFusionRequirement.names`
 *. The paid cost is `appFusionRequirement.cost`.
 */
export interface AppFuseAction extends ActionBase {
  kind: "AppFuse";
  /** The fusing battle-area Digimon ("1 of your Digimon"). */
  source: Target;
  /** Filter on the fusion-result card (e.g. the [System]/[Life]/[Transmutation] trait gate). */
  into: Filter;
  /** Where the fusion-result card comes from ("trash" for BT24-087, "hand" for BT25-089). */
  from: ZoneRef[];
}
