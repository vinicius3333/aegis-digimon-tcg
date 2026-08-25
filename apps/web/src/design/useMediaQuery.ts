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
