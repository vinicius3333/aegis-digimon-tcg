// Actions that operate on other effects, plus the unparsed escape hatch.

import type { Filter, Target } from "../filters/filter.js";
import type { ZoneRef } from "../filters/zones.js";
import type { Condition } from "../predicates/conditions.js";
import type { Cost } from "../predicates/costs.js";
import type { Scaling } from "../predicates/scaling.js";
import type { EffectTrigger } from "../triggers.js";
import type { ActionBase } from "./base.js";

/** "Activate this card's [Main] effect" — a security clause that runs the main ability. */
export interface ActivateMainAction extends ActionBase {
  kind: "ActivateMain";
  target?: Target;
  count?: number;
}

/** An effect win condition. */
export interface WinGameAction extends ActionBase {
  kind: "WinGame";
  /** Relative to the source card's owner. */
  winner: "controller" | "opponent";
}

/** Re-run one of this card's own timing effects. */
export interface ReactivateEffectAction extends ActionBase {
  kind: "ReactivateEffect";
  /** The trigger window to copy from this same card. */
  fromTrigger: EffectTrigger;
  count: number;
}

/**
 * "Activate 1 [On Play] / [When Digivolving] effect of ANOTHER card as an effect of this Digimon"
 * — BT23-060 borrows a face-up [Zaxon] security card's [On Play], BT24-102 an [Olympos XII]
 * Digimon's, EX8-054 a [Justimon] digivolution card's [When Digivolving].
 *
 * Unlike `ReactivateEffect`, which re-runs the source's OWN effect, the borrowed effect comes from
 * another card the controller chooses but runs under the ACTIVATING card's control and timing.
 * The engine fetches the foreign card's compiled effects server-side; the client only picks which
 * eligible card, and cannot inject an arbitrary effect (threat T-04-14).
 */
export interface ActivateForeignEffectAction extends ActionBase {
  kind: "ActivateForeignEffect";
  /**
   * Where the foreign card sits: `"security"` a face-up card in the controller's stack
   * (BT23-060), `"digivolutionCards"` a card in the activating Digimon's own stack (EX8-054), or
   * `"battleArea"` a permanent's top card the controller owns (BT24-102).
   */
  zone: "security" | "digivolutionCards" | "battleArea";
  /** Which trigger windows are borrowable. */
  fromTriggers: EffectTrigger[];
  /** Which foreign cards are eligible. */
  filter: Filter;
  /** Default 1. */
  count: number;
  /** Restrict the lender to the card most recently placed under this Digimon. */
  lastPlacedOnly?: boolean;
  /** Run the borrowed effect with the chosen battle-area card as its own source. */
  useLenderAsSource?: boolean;
}

/**
 * Legacy prose-compiler shape for "activate 1 [On Play]/[When Digivolving] effect". New authored
 * IR should use `ActivateForeignEffect` or `ReactivateEffect`, but the catalog still carries this
 * payload; the interpreter normalizes it through the same server-authoritative borrowed-effect
 * path when it is specific enough.
 */
export interface ActivateEffectAction extends ActionBase {
  kind: "ActivateEffect";
  target?: Target;
  effectType?: EffectTrigger | string;
  count?: number;
  asEffectOf?: string;
  /** Restrict the lender to the card most recently placed under this Digimon. */
  lastPlacedOnly?: boolean;
  /** Run the borrowed effect with the chosen battle-area card as its own source. */
  useLenderAsSource?: boolean;
}

/**
 * "Use 1 [Option] card from your hand without paying the cost" (EX8-037, BT15-092, BT16-094,
 * BT19-040). Unlike `PlayWithoutCost`, which leaves a permanent in play, an Option resolves its
 * [Main] effect and then goes to trash.
 *
 * Server-authoritative: the engine enumerates the eligible Options, prompts for the choice,
 * fetches that Option's compiled [Main] effect, and runs it under the USING card's control and
 * timing with `ctx.source` unchanged. The client supplies only the choice (threats T-08-10/11).
 * The result binds on `ctx.lastOptionUsed` at use time — even if the Option's effect digivolves
 * the using card away (KB EX8-037 Q4738) — so an `ifThisEffectUsed` tail can gate on it.
 *
 * With `payCost: true` and `reduceCostBy: N` the player pays `max(0, printed_cost − N)` (BT17-035
 * and the EX12 family). The eligibility cap is `filter.playCostLte`, or the historical default
 * of 5 (EX8-037).
 */
export interface UseOptionWithoutCostAction extends ActionBase {
  kind: "UseOptionWithoutCost";
  /** Kind ["Option"] plus any extra brackets; `playCostLte` sets the eligibility cap. */
  filter: Filter;
  payCost: boolean;
  reduceCostBy?: number;
  /** Defaults to ["hand"], the only printed form. */
  from?: ZoneRef[];
  /** Alternative to `filter`. */
  target?: Target;
}

/**
 * Legacy compiler shape for "activate this Option card's [Main] effect". Deliberately narrow: it
 * resolves to `ActivateMain` for the current source rather than letting the client provide an
 * arbitrary effect body.
 */
export interface ActivateOptionMainAction extends ActionBase {
  kind: "ActivateOptionMain";
  target?: Target;
  count?: number;
}

/**
 * The escape hatch: the original residual prose for any clause the parser could not fully model.
 * The interpreter routes it to `unsupported(...)` so gaps are visible at runtime, never a silent
 * no-op.
 */
export interface RawUnparsedAction {
  kind: "RawUnparsed";
  text: string;
  condition?: Condition;
  cost?: Cost;
  scaling?: Scaling;
  optional?: boolean;
}
