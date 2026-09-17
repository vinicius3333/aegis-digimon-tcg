import { useEffect, useState } from "react";
import type { ScrollOverflow } from "./types";

/**
 * Which way a sideways-scrolling row still has cards hidden. The row is watched
 * for both scrolling and resizing: a phone rotating, or the hand growing by a
 * draw, changes the answer without anyone scrolling.
 *
 * `revision` re-measures when the content changes but the box does not — a
 * ResizeObserver on the scroller sees its own size, never its content width.
 */
export function useScrollOverflow(element: HTMLElement | null, revision: number): ScrollOverflow {
  const [overflow, setOverflow] = useState<ScrollOverflow>({ start: false, end: false });
  useEffect(() => {
    if (!element) {
      setOverflow({ start: false, end: false });
      return;
    }
    const measure = () => {
      // Sub-pixel layout leaves a scrollLeft a hair off both ends, so a cue is
      // only claimed for a full pixel of hidden content.
      const hidden = element.scrollWidth - element.clientWidth;
      const left = element.scrollLeft;
      setOverflow({ start: left > 1, end: left < hidden - 1 });
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : undefined;
    observer?.observe(element);
    return () => {
      element.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [element, revision]);
  return overflow;
}
