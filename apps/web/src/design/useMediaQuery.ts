/* One media-query subscription hook for the whole client, so a layout that has to
   branch in TypeScript (a card width, a column count) reads the same breakpoint
   the stylesheet does instead of measuring the window itself. */

import { useEffect, useState } from "react";

export function useMediaQuery(mediaQuery: string): boolean {
  const [matches, setMatches] = useState(
    () =>
      typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(mediaQuery).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(mediaQuery);
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [mediaQuery]);
  return matches;
}

/**
 * A pointer-sized window with room for the wide selection grid. Below it the
 * decision dialog keeps its compact card size so the grid still fits the sheet.
 */
export const WIDE_DIALOG_QUERY = "(width >= 1100px) and (height >= 760px)";

/**
 * The pointer is a finger rather than a mouse. Chrome that has to stay clear of
 * the contact point — a label floated over a dragged card, for one — reads this
 * instead of guessing from the viewport, because a touchscreen laptop is wide.
 */
export const COARSE_POINTER_QUERY = "(pointer: coarse)";

/**
 * The touch board layout: a phone in portrait, plus a phone on its side. It is the
 * same condition the stylesheet's phone block carries, so chrome that only exists
 * there — the hand strip's scroll cues, for one — is mounted on exactly the
 * viewports whose CSS lays it out.
 */
export const TOUCH_LAYOUT_QUERY = "(width < 600px), (height < 520px) and (orientation: landscape)";
