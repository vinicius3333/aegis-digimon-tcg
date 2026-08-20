// DigiXros, ＜Link＞, and ＜Mind Link＞.

import type { EffectDurationRef } from "../durations.js";
import type { Target } from "../filters/filter.js";
import type { ZoneRef } from "../filters/zones.js";
import type { ActionBase } from "./base.js";

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
  /**
   * Some card effects explicitly link to a Digimon "on the field", which includes the
   * breeding area (BT24-097 Q5707). Normal Link declarations must leave this false.
   */
  allowBreedingRecipient?: boolean;
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

/** ＜Mind Link＞ — place this Tamer as the bottom digivolution card of a chosen Digimon. */
export interface MindLinkAction extends ActionBase {
  kind: "MindLink";
  target: Target;
}
