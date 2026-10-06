/* Which surface a pending decision is answered on, and the small pieces of text
   that surface needs. All pure: the server still owns every rule, this module
   chooses a left action rail or a central card dialog and formats labels for the trigger
   chooser.

   The dialog is the fallback for everything, so a decision shape this module has
   not been taught about still renders. */

import type { DecisionRequest, Permanent } from "@aegis/shared";

export type DecisionPresentation = "board" | "dialog";

/** Every offered card is already a physical permanent on the battle areas. */
export function isFieldCardSelection(
  decision: DecisionRequest | undefined,
  fieldInstanceIds: readonly string[],
): boolean {
  if (decision?.kind !== "selectCards" && decision?.kind !== "chooseTargets") return false;
  const options = decision.options;
  if (
    options?.assemblyCardId !== undefined ||
    options?.digiXrosCardId !== undefined ||
    options?.selectionContext === "partitionActivation"
  )
    return false;
  const candidates = options?.candidateInstanceIds ?? [];
  const visible = options?.visibleInstanceIds ?? candidates;
  const field = new Set(fieldInstanceIds);
  return candidates.length > 0 && candidates.every((id) => field.has(id)) && visible.every((id) => field.has(id));
}

/** The effect is asking for field targets, rather than a cost, zone card, or attack declaration. */
export function isFieldTargetDecision(decision: DecisionRequest, permanents: readonly Permanent[]): boolean {
  if (decision.kind !== "chooseTargets" && decision.kind !== "selectCards") return false;
  if (decision.options?.purpose === "cost" || decision.options?.selectionContext !== undefined) return false;
  const candidates = decision.options?.candidateInstanceIds ?? [];
  const field = new Set(permanents.flatMap((permanent) => [permanent.permanentId, permanent.topCard?.instanceId]));
  return candidates.length > 0 && candidates.every((id) => field.has(id));
}

/** The engine's dedicated optional Decoy sacrifice question, not any effect mentioning the keyword. */
export function isDecoyDecision(decision: DecisionRequest | undefined): boolean {
  return decision?.kind === "selectCards" && /^[＜<]\s*Decoy(?:\s*[＞>]|\s*\()/i.test(decision.promptText ?? "");
}

/** Hand and field selections are answered on their physical cards.
 * Other card selections retain the central dialog and its revealed context.
 * Simple optional actions use the left rail when their source is on the field.
 * Unknown decisions retain the dialog fallback.
 */
export function decisionPresentation({
  decision,
  handInstanceIds,
  sourcePermanentId,
  fieldInstanceIds = [],
}: {
  decision: DecisionRequest;
  handInstanceIds: readonly string[];
  sourcePermanentId?: string;
  fieldInstanceIds?: readonly string[];
}): DecisionPresentation {
  if (isFieldCardSelection(decision, fieldInstanceIds)) return "board";
  if (decision.kind === "selectCards" || decision.kind === "chooseTargets") {
    const options = decision.options;
    const candidates = options?.candidateInstanceIds ?? [];
    const hand = new Set(handInstanceIds);
    const visible = options?.visibleInstanceIds ?? candidates;
    const material = options?.assemblyCardId !== undefined || options?.digiXrosCardId !== undefined;
    if (
      !material &&
      options?.selectionContext !== "partitionActivation" &&
      options?.selectionContext !== "attackTarget" &&
      candidates.length > 0 &&
      candidates.every((id) => hand.has(id)) &&
      visible.every((id) => hand.has(id))
    )
      return "board";
  }
  return decision.kind === "optional" && sourcePermanentId !== undefined ? "board" : "dialog";
}

/** Card galleries need the central dialog; compact activation choices keep the board rail. */
export function effectDecisionSurface(decision: DecisionRequest): "left" | "center" {
  if (decision.options?.selectionContext === "partitionActivation") return "left";
  return ["chooseTargets", "selectCards", "orderCards", "orderTriggers", "mulligan"].includes(decision.kind)
    ? "center"
    : "left";
}

/**
 * The permanent a pending decision's source card is sitting on, so the board
 * prompt can highlight it. Physical source identity also locates effects buried
 * in a digivolution stack; older requests fall back to the face-up card code.
 */
export function sourcePermanentIdOf(
  sourceCardId: string | undefined,
  permanents: readonly Permanent[],
  source?: { sourceInstanceId?: string; sourcePermanentId?: string },
): string | undefined {
  if (source?.sourcePermanentId) {
    return permanents.find((permanent) => permanent.permanentId === source.sourcePermanentId)?.permanentId;
  }
  if (source?.sourceInstanceId) {
    return permanents.find((permanent) =>
      [permanent.topCard, ...(permanent.stack ?? []), ...(permanent.linked ?? [])].some(
        (card) => card?.instanceId === source.sourceInstanceId,
      ),
    )?.permanentId;
  }
  if (sourceCardId === undefined) return undefined;
  return permanents.find((permanent) => permanent.topCard?.cardId === sourceCardId)?.permanentId;
}

/** How much of a printed clause fits on one line under a trigger chooser card. */
export const TRIGGER_SUMMARY_MAX_CHARS = 64;

/**
 * One-line summary of a printed clause for the trigger chooser. Drops the timing
 * brackets (the card already carries its own source label) and truncates on a
 * word boundary so a clipped summary never ends mid-word.
 */
export function triggerClauseSummary(
  clause: string | undefined,
  maxChars: number = TRIGGER_SUMMARY_MAX_CHARS,
): string | undefined {
  const stripped = clause
    ?.replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return undefined;
  if (stripped.length <= maxChars) return stripped;
  const head = stripped.slice(0, maxChars);
  const lastSpace = head.lastIndexOf(" ");
  const cut = lastSpace > maxChars / 2 ? head.slice(0, lastSpace) : head;
  return `${cut.replace(/[,.;:]$/, "")}…`;
}

export type TriggerSource = { zone: "field"; position: number } | { zone: "hand" } | { zone: "unknown" };

/**
 * Where a pending trigger fires from, as the chooser labels it. `position` is
 * the 1-based slot in the battle area, matching the "Field:1" wording the
 * reference client uses.
 */
export function triggerSource(
  instanceId: string,
  zones: { fieldSlots: readonly (readonly string[])[]; handInstanceIds: readonly string[] },
): TriggerSource {
  const slot = zones.fieldSlots.findIndex((instanceIds) => instanceIds.includes(instanceId));
  if (slot !== -1) return { zone: "field", position: slot + 1 };
  return zones.handInstanceIds.includes(instanceId) ? { zone: "hand" } : { zone: "unknown" };
}

/**
 * One entry per battle-area slot, listing every instance id that slot holds (top
 * card first), so a trigger raised by an inherited effect still resolves to the
 * permanent's slot rather than to no zone at all.
 */
export function fieldSlots(permanents: readonly Permanent[]): string[][] {
  return permanents.map((permanent) => {
    const top = permanent.topCard?.instanceId;
    const under = permanent.stack.map((card) => card.instanceId);
    return top === undefined ? under : [top, ...under];
  });
}

/** Mirror the server's shortage rule using the offered candidates, including hidden ones. */
export function decisionSelectionMin(decision: DecisionRequest | undefined): number {
  const min = decision?.options?.min ?? 1;
  if (decision?.kind !== "selectCards" && decision?.kind !== "chooseTargets") return min;
  return Math.min(min, new Set(decision.options?.candidateInstanceIds ?? []).size);
}
