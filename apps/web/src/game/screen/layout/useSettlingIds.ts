import { useLayoutEffect, useRef, useState } from "react";
import type { Permanent } from "@aegis/shared";

/** How long a card that just turned stays on its own before it may join a group. */
export const SETTLE_MS = 700;

/**
 * Permanents whose suspended state just changed. They stay out of any group for a beat,
 * so the copy is seen sliding out of its group and turning before it joins another one.
 *
 * A change is detected during render, against the last committed state, so the very
 * first frame after it already draws the card on its own.
 */
export function useSettlingIds(
  permanents: readonly Permanent[],
  isSuspended: (permanent: Permanent) => boolean,
): ReadonlySet<string> {
  const committed = useRef(new Map<string, boolean>());
  const [held, setHeld] = useState<ReadonlySet<string>>(() => new Set());

  const changed = permanents
    .filter((permanent) => {
      const before = committed.current.get(permanent.permanentId);
      return before !== undefined && before !== isSuspended(permanent);
    })
    .map((permanent) => permanent.permanentId);
  const changedKey = changed.join("|");

  useLayoutEffect(() => {
    committed.current = new Map(permanents.map((permanent) => [permanent.permanentId, isSuspended(permanent)]));
  });

  const timers = useRef(new Set<number>());
  useLayoutEffect(() => {
    if (!changedKey) return;
    const ids = changedKey.split("|");
    setHeld((previous) => new Set([...previous, ...ids]));
    // Not cleared when the next render empties `changedKey`: the release must still come.
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setHeld((previous) => new Set([...previous].filter((id) => !ids.includes(id))));
    }, SETTLE_MS);
    timers.current.add(timer);
  }, [changedKey]);
  useLayoutEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) window.clearTimeout(timer);
    };
  }, []);

  return changed.length === 0 ? held : new Set([...held, ...changed]);
}
