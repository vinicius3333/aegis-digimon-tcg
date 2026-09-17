import type { AnimationQueueMode } from "../animationQueue";

/**
 * `prefers-reduced-motion` and a hidden tab put the queue in `drain` mode,
 * which collapses the decorative cues and leaves the ones that carry
 * something to read their full time. This is the only module allowed to read
 * `window` or `document`.
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The phone layouts, matching GameScreen's `NARROW_LAYOUT_QUERY` and the touch block in game.css. */
export const TOUCH_LAYOUT_QUERY = "(width < 600px), (height < 520px) and (orientation: landscape)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function isTouchLayout(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(TOUCH_LAYOUT_QUERY).matches;
}

export function documentHidden(): boolean {
  return typeof document !== "undefined" && document.hidden === true;
}

export function liveMode(): AnimationQueueMode {
  return prefersReducedMotion() || documentHidden() ? "drain" : "live";
}
