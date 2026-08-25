/* Which surface a pending decision is answered on, and the small pieces of text
   that surface needs. All pure: the server still owns every rule, this module
   only decides whether the answer is taken on the board itself (left rail, cards
   picked in place) or in the modal dialog, and formats labels for the trigger
   chooser.

   The dialog is the fallback for everything, so a decision shape this module has
   not been taught about still renders. */

import type { DecisionRequest, Permanent } from "@aegis/shared";

export type DecisionPresentation = "board" | "dialog";

/**
 * `selectCards` answered entirely out of the viewer's own hand needs no dialog:
 * the cards are already on screen. `optional` prompts read better beside the
 * field they are about to change, as long as their source card is visible there.
 */
export function decisionPresentation({
  decision,
  handInstanceIds,
  sourcePermanentId,
}: {
  decision: DecisionRequest;
  handInstanceIds: readonly string[];
  sourcePermanentId?: string;
}): DecisionPresentation {
  if (decision.kind === "optional") return sourcePermanentId === undefined ? "dialog" : "board";
  // `chooseTargets` deliberately keeps the dialog. Its candidates are frequently
  // cards that are NOT on the field (a revealed deck card, a card in the trash),
  // and the grid is the only surface that can show those at all — so moving the
  // on-field cases to the board would split one prompt across two answering
  // surfaces depending on where its candidates happen to live.
  if (decision.kind !== "selectCards") return "dialog";
  const candidates = decision.options?.candidateInstanceIds ?? [];
  if (candidates.length === 0) return "dialog";
  const hand = new Set(handInstanceIds);
  if (!candidates.every((instanceId) => hand.has(instanceId))) return "dialog";
  // A visible card outside the hand (a revealed deck card shown alongside) has
  // nowhere to render on the board, so that decision keeps the dialog.
  const visible = decision.options?.visibleInstanceIds ?? [];
  return visible.every((instanceId) => hand.has(instanceId)) ? "board" : "dialog";
}

/**
 * The permanent an `optional` decision's source card is sitting on, so the board
 * prompt can highlight it. Matches on the face-up top card only: a source buried
 * in a digivolution stack is not what the player is looking at.
 */
export function sourcePermanentIdOf(
  sourceCardId: string | undefined,
  permanents: readonly Permanent[],
): string | undefined {
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
