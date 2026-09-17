import { narrationReadingTime, TOUCH_NARRATION_LIFETIME_SCALE, type NarrationItem } from "../../narration";
import { isOwnEffectNotice } from "../../notices";

export interface PresentableNarrationDeps {
  collapseNarration: boolean;
  suppressedOwnEffects: ReadonlySet<string>;
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
  const { notice } = item;
  // The folded slot reads slower than the board does, so its items get a longer clock.
  const shown = (presented: NarrationItem): NarrationItem => ({
    ...presented,
    ...(collapseNarration
      ? { lifetimeMs: Math.round(narrationReadingTime(presented) * TOUCH_NARRATION_LIFETIME_SCALE) }
      : {}),
    createdAt: Date.now(),
  });
  const suppressed =
    notice !== undefined && [...suppressedOwnEffects].some((cardId) => isOwnEffectNotice(notice, cardId));
  if (!suppressed) return shown(item);
  if (!item.panel) return null;
  return shown({ ...item, notice: undefined });
}
