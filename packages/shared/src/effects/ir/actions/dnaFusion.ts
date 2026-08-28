// DNA digivolution and App Fusion: playing a card on top of existing material Digimon.

import type { Filter, Target } from "../filters/filter.js";
import type { ZoneRef } from "../filters/zones.js";
import type { ActionBase } from "./base.js";

/**
 * Widen the DigiXros material source zones at BeforePayCost time (BT19-079 "from under your
 * Tamers", BT19-087 "from under Tamers + trash"). Recorded per-seat for `duration` and read by
 * the material-picking path.
 */

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
