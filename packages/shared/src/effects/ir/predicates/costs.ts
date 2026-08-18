// Costs paid to perform an action.

import type { Filter, Target } from "../filters/filter.js";

/**
 * A cost paid as part of an action ("by trashing 1 card", "by suspending this Tamer"). Modeled
 * as a nested action performed first; if it cannot be paid, the parent action does not happen.
 */
export interface Cost {
  kind:
    | "trash"
    | "suspend"
    | "unsuspend" // BT14-054
    | "return"
    | "place"
    | "deleteOwn"
    | "payMemory"
    | "flipSecurity" // flip your top face-up security card face down (BT23-043, EX11-031)
    | "trashSecurityTop" // ST23-05
    | "securityToHand"
    | "placeAsSecurity" // move a permanent to the security stack (BT19-048)
    | "playFromDigivolutionCards" // play a card from a selected Digimon's stack (BT19-102)
    | "raw";
  target?: Target;
  /** Host permanent selected before resolving a stack-card play cost (BT19-102). */
  hostTarget?: Target;
  /** For `payMemory`. */
  memory?: number;
  /**
   * The controller may decline to pay and the effect still resolves unpaid. Distinct from a
   * "You may" on the whole action.
   */
  optional?: boolean;
  raw?: string;
  /** For `return` costs; `"deckBottom"` sends the card under its owner's deck (BT19-002). */
  to?: "hand" | "deckBottom";
  /**
   * Store the returned Digimon's level in `EffectContext.namedCounts` under this name, so a
   * later `levelLte` can compare against it (BT19-002 "returnedDigimonLevel").
   */
  storeAs?: string;
  /**
   * Store how many cards the cost actually moved, for a later scaling or `countSource`
   * ("by placing up to N cards ... reduce by X for each card placed").
   */
  trackCount?: string;
  /** Destination for place costs: "under one of your Tamers" → {controller:"mine",kind:["Tamer"]}. */
  underFilter?: Filter;
  /**
   * Host filters unioned with `underFilter` ("level 3 OR the [Legend-Arms] trait" — EX6-007,
   * EX6-009). Mirrors `Target.orFilters` and threads through `host:"target"` the same way.
   */
  underOrFilters?: Filter[];
  /**
   * Routing for a place cost whose destination is not the default digivolution stack:
   * `"security"` (BT23-045, BT24-040, BT25-044) or `"digivolutionStack"` at `position`
   * (EX9-055 top; EX9-064 bottom, face down). Absent keeps the legacy placeUnder behavior.
   */
  destination?: "security" | "digivolutionStack";
  /**
   * Which end to place at. `"choice"` prompts per placed card (EX12-077). `"faceUpBottom"` is
   * `placeAsSecurity` only: face-up under the security stack (BT19-048).
   */
  position?: "top" | "bottom" | "choice" | "faceUpBottom";
  /**
   * `"self"` places under the source; `"target"` under the `underFilter` host (legacy string
   * form); the object form lets the player pick a matching host (BT21-071).
   */
  host?: "self" | "target" | { filter: Filter; count: number };
  /** Only meaningful for `destination:"security"`; digivolution cards are always face-down. */
  faceDown?: boolean;
  /** The place cost relocates a battle-area permanent rather than a loose card. */
  targetIsPermanent?: boolean;
  /** Store the chosen host permanent id for a downstream `target.fromSelectionRef`. */
  bindHostAs?: string;
  /**
   * For a `destination:"security"` place cost: store the placed instance ids in
   * `EffectContext.boundPlayed`, mirroring `Action.bindResultAs` for a cost-side move.
   */
  bindResultAs?: string;
}
