import { type CombatPromptEvent, type DecisionKind } from "@aegis/shared";
import type { StackCard } from "./types";

/**
 * BlockOverlay, CounterOverlay, AllianceOverlay, EvadeOverlay and BarrierOverlay
 * dispatch on GameScreen's `blockWindow`/`counterWindow`/`allianceWindow`/
 * `evadeWindow`/`barrierWindow` state; this pins that coverage against
 * COMBAT_PROMPT_EVENTS so a new prompt event fails typecheck instead of shipping
 * unhandled.
 */
export const SUPPORTED_COMBAT_PROMPTS = [
  "blockWindowOpened",
  "counterWindowOpened",
  "alliancePrompt",
  "evadePrompt",
  "barrierPrompt",
] as const satisfies readonly CombatPromptEvent[];

type _SupportedCombatPromptsComplete =
  Exclude<CombatPromptEvent, (typeof SUPPORTED_COMBAT_PROMPTS)[number]> extends never ? true : never;
const _supportedCombatPromptsComplete: _SupportedCombatPromptsComplete = true;
void _supportedCombatPromptsComplete;

/**
 * DecisionOverlay branches on request.kind via isOptional/isChoose/isSelect/
 * isOrderTriggers (mulligan is handled separately by MulliganOverlay). This pins
 * that coverage against DECISION_KINDS so a new DecisionRequest.kind fails
 * typecheck instead of rendering nothing.
 */
export const SUPPORTED_DECISION_KINDS = [
  "optional",
  "chooseTargets",
  "selectCards",
  "orderCards",
  "orderTriggers",
  "chooseOption",
  "mulligan",
] as const satisfies readonly DecisionKind[];

type _SupportedDecisionKindsComplete =
  Exclude<DecisionKind, (typeof SUPPORTED_DECISION_KINDS)[number]> extends never ? true : never;
const _supportedDecisionKindsComplete: _SupportedDecisionKindsComplete = true;
void _supportedDecisionKindsComplete;

export const ROLE_LABEL_KEYS: Record<
  StackCard["role"],
  "overlay.role.top" | "overlay.role.stack" | "overlay.role.linked"
> = {
  top: "overlay.role.top",
  stack: "overlay.role.stack",
  linked: "overlay.role.linked",
};
