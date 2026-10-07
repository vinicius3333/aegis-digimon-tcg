import { narrationReadingTime, TOUCH_NARRATION_LIFETIME_SCALE, type NarrationItem } from "../../narration";
import { noticeDurationScale } from "../../noticeDuration";

/** Start the reading clock when the animation queue actually publishes this moment. */
export function presentableNarration(
  item: NarrationItem,
  { collapseNarration }: { collapseNarration: boolean },
): NarrationItem {
  const layoutScale = collapseNarration ? TOUCH_NARRATION_LIFETIME_SCALE : 1;
  const scale = layoutScale * noticeDurationScale();
  return {
    ...item,
    ...(scale !== 1 ? { lifetimeMs: Math.round(narrationReadingTime(item) * scale) } : {}),
    createdAt: Date.now(),
  };
}
