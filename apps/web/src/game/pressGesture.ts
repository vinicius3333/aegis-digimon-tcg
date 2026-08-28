/** Pointer travel, in px, that separates a tap from a drag. */
const DRAG_THRESHOLD = 6;
/**
 * The same for a finger, which never lands as still as a mouse. At the mouse
 * threshold an ordinary tap was read as a drag, and the tap did nothing at all.
 */
const TOUCH_DRAG_THRESHOLD = 14;

/** What a press has become once the pointer has travelled `dx`/`dy` from where it landed. */
export type PressGesture = "press" | "drag" | "scroll";

/**
 * Read a moving press: still a press until it clears the pointer's own slop, then a
 * drag — unless a finger is swiping sideways, which belongs to the row the card sits
 * in (the hand and the battle rows pan on touch) and is handed back to the browser.
 */
export function pressGesture({ dx, dy, touch }: { dx: number; dy: number; touch: boolean }): PressGesture {
  if (Math.hypot(dx, dy) <= (touch ? TOUCH_DRAG_THRESHOLD : DRAG_THRESHOLD)) return "press";
  return touch && Math.abs(dx) > Math.abs(dy) ? "scroll" : "drag";
}

/**
 * Drop the click the browser sends after a tap that has already been answered.
 *
 * A tap opens its sheet right under the finger that made it, so the trailing click
 * lands on whatever mounted there — zooming the card, or dismissing the sheet before
 * it was ever read.
 */
export function swallowNextClick(): void {
  const swallow = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 400);
}
