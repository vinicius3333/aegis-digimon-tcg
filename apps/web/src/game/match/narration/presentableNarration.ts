import { narrationReadingTime, TOUCH_NARRATION_LIFETIME_SCALE, type NarrationItem } from "../../narration";

/** Start the reading clock when the animation queue actually publishes this moment. */
export function presentableNarration(
  item: NarrationItem,
  { collapseNarration }: { collapseNarration: boolean },
): NarrationItem {
  const now = Date.now();
  return {
    ...item,
    ...(collapseNarration
      ? { lifetimeMs: Math.round(narrationReadingTime(item) * TOUCH_NARRATION_LIFETIME_SCALE) }
      : {}),
    createdAt: now,
  };
}
