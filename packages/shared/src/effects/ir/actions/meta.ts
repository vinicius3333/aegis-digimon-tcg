// Actions that operate on other effects, plus the unparsed escape hatch.

import type { ActionBase } from "./base.js";
import type { Filter, Target, ZoneRef } from "../filters.js";
import type { Condition, Cost, Scaling } from "../predicates.js";
import type { EffectTrigger } from "../triggers.js";

/** "Activate this card's [Main] effect" — a security clause that runs the main ability. */
export interface ActivateMainAction extends ActionBase {
  kind: "ActivateMain";
  /** Target to activate the [Main] effect of. */
  target?: Target;
  /** Number of effects to activate. */
  count?: number;
}

/** Declare the controller (or opponent) wins the game (effect win condition). */
export interface WinGameAction extends ActionBase {
  kind: "WinGame";
  /** Who wins relative to the source card's owner. */
  winner: "controller" | "opponent";
}

/** Re-run one of this card's other timing effects (meta-effect reactivation). */
export interface ReactivateEffectAction extends ActionBase {
  kind: "ReactivateEffect";
  /** Trigger window to copy from this same card (e.g. WhenDigivolving). */
  fromTrigger: EffectTrigger;
  count: number;
}

/**
 * "Activate 1 [On Play] / [When Digivolving] effect of ANOTHER card as an effect of
 * this Digimon" — the activate-FOREIGN-effect family (BT23-060 borrows a face-up
 * [Zaxon] security card's [On Play]; BT24-102 borrows an [Olympos XII] Digimon's
 * [On Play]/[When Digivolving]; EX8-054 borrows a [Justimon] digivolution card's
 * [When Digivolving]). Distinct from `ReactivateEffect`, which re-runs the SOURCE's
 * OWN effect: here the borrowed effect comes from a NAMED OTHER card the controller
 * chooses, but runs under the ACTIVATING card's control/timing (source
 * `selectedEffect.SetIsDigimonEffect(true)` + the activating card's hashtable). The
 * engine fetches the foreign card's compiled effects server-side; the client only
 * picks which eligible card — it cannot inject an arbitrary effect (threat T-04-14).
 */
export interface ActivateForeignEffectAction extends ActionBase {
  kind: "ActivateForeignEffect";
  /**
   * Where the foreign card sits relative to the activating card:
   *   - "security": a face-up card in the controller's security stack (BT23-060).
   *   - "digivolutionCards": a card in the activating Digimon's own digivolution
   *     stack (EX8-054).
   *   - "battleArea": a battle-area permanent's top card the controller owns (BT24-102).
   */
  zone: "security" | "digivolutionCards" | "battleArea";
  /** Which trigger windows are borrowable (e.g. ["OnPlay"] or ["OnPlay","WhenDigivolving"]). */
  fromTriggers: EffectTrigger[];
  /** Filter the eligible foreign cards (trait/name brackets, kind, controller). */
  filter: Filter;
  /** How many foreign effects to activate; default 1. */
  count: number;
  /** Restrict the lender to the card most recently placed under this Digimon. */
  lastPlacedOnly?: boolean;
  /** Run the borrowed effect with the chosen battle-area card as its own source. */
  useLenderAsSource?: boolean;
}

/**
 * Legacy prose-compiler shape for "activate 1 [On Play]/[When Digivolving] effect" clauses.
 * New authored IR should prefer `ActivateForeignEffect` or `ReactivateEffect`, but the catalog
 * still contains this older payload. The interpreter normalizes it through the same
 * server-authoritative borrowed-effect path when the payload is specific enough.
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
 * "Use 1 [Option] card from your hand without paying the cost" — the use-option-without-cost
 * family (EX8-037 / BT15-092 / BT16-094 / BT19-040). Distinct from `PlayWithoutCost` (which
 * plays a PERMANENT card and leaves it in play): an Option resolves its [Main] effect then goes
 * to trash (the `playInstances` `isPermanentKind` gap). Server-authoritative — the engine
 * enumerates the eligible Options (single-color, not under a CanNotPlayThisOption restriction),
 * prompts the controller to pick WHICH one, fetches that Option's compiled [Main] effect via
 * `getCompiledCard`, and runs it under the USING card's control/timing (`ctx.source` unchanged).
 * The client never supplies the effect body, only the choice (threat T-08-10/11).
 * The use RESULT binds on `ctx.lastOptionUsed` (KB EX8-037 Q4738 — bound at use-time even if the
 * Option's effect digivolves the using card away), so an `ifThisEffectUsed` tail can gate on it.
 *
 * `payCost: false` — free use (EX8-037 / most uses).
 * `payCost: true` + `reduceCostBy: N` — "with the cost reduced by N" (BT17-035 / EX12 family):
 *   the player pays `max(0, printed_cost − N)` memory; the cost cap for eligible options is
 *   `filter.playCostLte` when declared, otherwise the historical default of 5 (EX8-037).
 */
export interface UseOptionWithoutCostAction extends ActionBase {
  kind: "UseOptionWithoutCost";
  /** Eligible-Option filter (kind ["Option"] + any extra brackets); playCostLte sets the eligibility cap. */
  filter: Filter;
  /** false = free use; true = player pays the (reduced) cost. */
  payCost: boolean;
  /** Memory reduction applied to the printed cost when payCost is true (e.g. 2 = "cost reduced by 2"). */
  reduceCostBy?: number;
  /** Source zone(s); defaults to ["hand"] (the only printed form). */
  from?: ZoneRef[];
  /** Target specification (alternative to filter). */
  target?: Target;
}

/**
 * Legacy compiler shape for "activate this Option card's [Main] effect". This is intentionally
 * narrow: it resolves to `ActivateMain` for the current source rather than letting the client
 * provide an arbitrary effect body.
 */
export interface ActivateOptionMainAction extends ActionBase {
  kind: "ActivateOptionMain";
  target?: Target;
  count?: number;
}

/**
 * The escape hatch. Carries the original residual prose for any clause (or
 * clause tail) the parser could not fully model. The interpreter routes this to
 * `unsupported(...)` so gaps are visible at runtime (never a silent no-op).
 */
export interface RawUnparsedAction {
  kind: "RawUnparsed";
  text: string;
  condition?: Condition;
  cost?: Cost;
  scaling?: Scaling;
  optional?: boolean;
}
