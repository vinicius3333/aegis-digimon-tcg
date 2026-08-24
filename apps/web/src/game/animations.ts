/* Entrance-animation bookkeeping for the match screen. The animations themselves
   are pure CSS: this only decides which entries are new, so a class can be added
   once and the browser plays the keyframes on its own. */

import { useRef } from "react";

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Keys that appeared after the first render, e.g. cards drawn into a hand that
 * was already on screen. The entries stay marked while they remain present, so a
 * re-render never strips the class mid-animation; the first render marks nothing,
 * so an already-populated list does not animate on mount.
 */
export function useEnterAnimation(keys: readonly string[]): ReadonlySet<string> {
  const seen = useRef<ReadonlySet<string> | null>(null);
  const entering = useRef<Set<string>>(new Set());
  const current = new Set(keys);
  if (seen.current === null) {
    seen.current = current;
    return EMPTY;
  }
  for (const key of current) if (!seen.current.has(key)) entering.current.add(key);
  for (const key of entering.current) if (!current.has(key)) entering.current.delete(key);
  seen.current = current;
  return entering.current;
}
