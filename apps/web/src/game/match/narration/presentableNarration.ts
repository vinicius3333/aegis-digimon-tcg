import { narrationReadingTime, TOUCH_NARRATION_LIFETIME_SCALE, type NarrationItem } from "../../narration";
import { isOwnEffectNotice } from "../../notices";

/**
 * What one open (or just closed) decision dialog for the viewer's own card silences.
 *
 * The dialog prints the clause of the effect that asked, so the notice carrying that same
 * clause is dropped: everything queued for the card when the dialog opened, and anything
 * the card raises while it stays open. Once it closes, the card's later clauses read out
 * again — a Tamer that asks a question every turn still narrates its other effects.
 */
export interface OwnEffectDialog {
  /** Narration items for the card that were queued, not yet shown, when the dialog opened. */
  queuedItemIds: ReadonlySet<string>;
  dialogOpen: boolean;
}

export interface PresentableNarrationDeps {
  collapseNarration: boolean;
  suppressedOwnEffects: ReadonlyMap<string, OwnEffectDialog>;
}

function suppressedByDialog(item: NarrationItem, suppressedOwnEffects: ReadonlyMap<string, OwnEffectDialog>): boolean {
  const { notice } = item;
  if (notice === undefined) return false;
  for (const [cardId, dialog] of suppressedOwnEffects) {
    if (!isOwnEffectNotice(notice, cardId)) continue;
    if (dialog.dialogOpen || dialog.queuedItemIds.has(item.id)) return true;
  }
  return false;
}

/**
 * The item as it will be shown, or null when there is nothing left of it.
 *
 * A clause whose own decision dialog has opened since the item was queued is dropped
 * here rather than read out beside a dialog printing the same words; the panel it
 * travelled with, which the dialog does not repeat, stays.
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
  if (!suppressedByDialog(item, suppressedOwnEffects)) return shown(item);
  if (!item.panel) return null;
  return shown({ ...item, notice: undefined });
}
