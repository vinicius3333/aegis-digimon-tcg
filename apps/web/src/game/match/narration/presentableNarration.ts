import { narrationReadingTime, TOUCH_NARRATION_LIFETIME_SCALE, type NarrationItem } from "../../narration";
import { isOwnEffectNotice, type MatchNotice } from "../../notices";

/**
 * One decision dialog for the viewer's own card, open or answered moments ago.
 *
 * The dialog prints the clause of the effect that asked, so the notice carrying that same
 * clause would read out twice, side by side. It is held back instead: whatever the card
 * raises while the dialog is open waits here and reads out once the viewer has answered.
 */
export interface OwnEffectDialog {
  /** The card's notices held back until the dialog is answered, oldest first. */
  deferred: MatchNotice[];
  /** Existing moment IDs, so returning a clause does not create a second occurrence. */
  narrationIds?: Map<string, string>;
  /** Pending read-out of {@link deferred}; a dialog reopening for the card cancels it. */
  releaseTimer?: ReturnType<typeof setTimeout>;
}

export interface PresentableNarrationDeps {
  collapseNarration: boolean;
  suppressedOwnEffects: ReadonlyMap<string, OwnEffectDialog>;
}

function deferringDialog(
  notice: MatchNotice,
  suppressedOwnEffects: ReadonlyMap<string, OwnEffectDialog>,
): OwnEffectDialog | undefined {
  for (const [cardId, dialog] of suppressedOwnEffects) if (isOwnEffectNotice(notice, cardId)) return dialog;
  return undefined;
}

/**
 * The item as it will be shown, or null when there is nothing left of it.
 *
 * A clause whose own decision dialog is open is taken off the item and handed to that
 * dialog, which reads it out after the answer; the panel it travelled with, which the
 * dialog does not repeat, stays.
 */
export function presentableNarration(item: NarrationItem, deps: PresentableNarrationDeps): NarrationItem | null {
  const { collapseNarration, suppressedOwnEffects } = deps;
  // The folded slot reads slower than the board does, so its items get a longer clock.
  const shown = (presented: NarrationItem): NarrationItem => ({
    ...presented,
    ...(collapseNarration
      ? { lifetimeMs: Math.round(narrationReadingTime(presented) * TOUCH_NARRATION_LIFETIME_SCALE) }
      : {}),
    createdAt: Date.now(),
  });
  const dialog = item.notice ? deferringDialog(item.notice, suppressedOwnEffects) : undefined;
  if (dialog === undefined || item.notice === undefined) return shown(item);
  (dialog.narrationIds ??= new Map()).set(item.notice.id, item.id);
  dialog.deferred.push(item.notice);
  if (!item.panel) return null;
  return shown({ ...item, notice: undefined });
}
