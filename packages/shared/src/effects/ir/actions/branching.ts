// Choosing between action lists, and deferring one to a later window.

import type { EffectDurationRef } from "../durations.js";
import type { Target } from "../filters/filter.js";
import type { Condition } from "../predicates/conditions.js";
import type { Scaling } from "../predicates/scaling.js";
import type { Action } from "./action.js";
import type { ActionBase } from "./base.js";

/**
 * Grant a triggered effect to a chosen permanent for a duration — "gains '[Start of Your Main
 * Phase] This Digimon attacks'" (CAP-C-16, BT21-077). The watcher fires through the SubTrigger
 * bus and is swept at the duration boundary. `sameTarget` on the target reuses the preceding
 * action's permanent(s).
 */

export interface GainTriggeredEffectAction extends ActionBase {
  kind: "GainTriggeredEffect";
  target: Target;
  /** Mapped to a SubTriggerEventName by the interpreter's SUBTRIGGER_EVENT_MAP. */
  gainedTrigger: string;
  gainedActions: Action[];
  duration: EffectDurationRef;
}

export interface DelayedEffectAction extends ActionBase {
  kind: "DelayedEffect";
  trigger: "nextEndOfOpponentTurn";
  effect: Action;
}

/** "Activate N of the effects below". */
export interface ModalAction extends ActionBase {
  kind: "Modal";
  choose: number;
  /** "for every N of <unit>, activate 1 option". Overrides `choose` when present. */
  chooseScaling?: Scaling;
  /** Activate every option instead, when the live condition holds. */
  chooseAll?: { condition: Condition };
  options: Action[][];
  /** Player-facing labels, aligned by index with `options`. */
  labels?: string[];
  /** Per-option availability gate evaluated at decision time. */
  optionConditions?: Array<Condition | null>;
}

/** Execute exactly one ordered action list based on a live condition. */
export interface ConditionalBranchAction extends Omit<ActionBase, "condition"> {
  kind: "ConditionalBranch";
  condition: Condition;
  ifTrue: Action[];
  ifFalse?: Action[];
}
