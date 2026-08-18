/* React bindings for server-authoritative countdowns and conditional polling.
   Both own a timer, and both clear it on unmount — a tournament screen mounts and unmounts on
   every navigation, so a leaked interval would keep polling the API for the rest of the session. */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { serverClockOffsetMs, serverClockOffsetSeconds, serverNow, subscribeServerClock } from "./serverClock";

/**
 * How urgent a deadline is, as a value rather than a color. Every level renders as text so the
 * warning is legible to a screen reader and to a player who cannot distinguish the accent colors.
 */
export type CountdownLevel = "none" | "normal" | "warning_5m" | "warning_2m" | "warning_1m" | "expired";

const COUNTDOWN_WARNING_THRESHOLDS_MS = { warning_5m: 300_000, warning_2m: 120_000, warning_1m: 60_000 } as const;

export function countdownLevel(remainingMs: number | null): CountdownLevel {
  if (remainingMs === null) return "none";
  if (remainingMs <= 0) return "expired";
  if (remainingMs <= COUNTDOWN_WARNING_THRESHOLDS_MS.warning_1m) return "warning_1m";
  if (remainingMs <= COUNTDOWN_WARNING_THRESHOLDS_MS.warning_2m) return "warning_2m";
  if (remainingMs <= COUNTDOWN_WARNING_THRESHOLDS_MS.warning_5m) return "warning_5m";
  return "normal";
}

/** `m:ss` for anything under an hour, `h:mm:ss` above it. Never negative. */
export function formatRemaining(remainingMs: number | null): string {
  if (remainingMs === null) return "--:--";
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * The offset-corrected clock. The reactive value is the offset in whole SECONDS: sub-second
 * corrections still move `now()`, but they do not re-render or re-arm anything that ticks once a
 * second, which is what keeps a displayed countdown from skipping or repeating a second.
 */
export function useServerClock(): { offsetMs: number; offsetSeconds: number; now: () => number } {
  const offsetSeconds = useSyncExternalStore(subscribeServerClock, serverClockOffsetSeconds, serverClockOffsetSeconds);
  return useMemo(() => ({ offsetMs: serverClockOffsetMs(), offsetSeconds, now: serverNow }), [offsetSeconds]);
}

export type Countdown = { remainingMs: number | null; level: CountdownLevel; text: string };

/**
 * Counts `deadlineAt` (a server timestamp) down against server time. A null deadline runs no
 * timer at all, and an already-expired one stops ticking instead of counting into the negative.
 */
export function useCountdown(deadlineAt: number | null | undefined, intervalMs = 1000): Countdown {
  // Only a whole-second correction re-arms the interval; the tick itself always reads the live
  // offset through `serverNow()`, so finer corrections apply without disturbing the cadence.
  const { offsetSeconds } = useServerClock();
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    deadlineAt == null ? null : deadlineAt - serverNow(),
  );

  useEffect(() => {
    if (deadlineAt == null) {
      setRemainingMs(null);
      return;
    }
    // Stops at zero rather than counting into the negative, so an expired deadline leaves no
    // timer behind on a screen that may stay mounted for the rest of the round.
    const tick = () => {
      const remaining = deadlineAt - serverNow();
      setRemainingMs(remaining);
      if (remaining <= 0) clearInterval(timer);
    };
    const remaining = deadlineAt - serverNow();
    setRemainingMs(remaining);
    if (remaining <= 0) return;
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [deadlineAt, intervalMs, offsetSeconds]);

  return { remainingMs, level: countdownLevel(remainingMs), text: formatRemaining(remainingMs) };
}

/** True while the document is visible; polling stops entirely on a hidden tab. */
function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== "hidden");
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, []);
  return visible;
}

/**
 * Calls `refresh` on an interval, but only while the tab is visible, and once more the moment it
 * becomes visible again so a returning player never reads a stale board. `enabled` lets a caller
 * suspend polling (an unauthenticated visitor, a finished event) without unmounting the screen.
 *
 * A tick is skipped while the previous one is still in flight: on a slow connection the interval
 * would otherwise stack requests faster than they resolve.
 */
export function usePolling(refresh: () => void | Promise<unknown>, intervalMs: number, enabled = true): void {
  const visible = useDocumentVisible();

  // `refresh` is a dependency, not a ref: a caller whose loader changed (a different tournament
  // id) needs the poll to restart against the new one immediately, not at the next interval.
  // Callers must therefore memoize it, exactly as an effect dependency demands.
  useEffect(() => {
    if (!enabled || !visible) return;
    // Scoped to this polling session rather than to the component: a restart abandons the old
    // request, so that request must not be able to gate the first tick of the new session.
    let inFlight = false;
    const tick = () => {
      if (inFlight) return;
      const result = refresh();
      if (!(result instanceof Promise)) return;
      inFlight = true;
      void result.finally(() => { inFlight = false; });
    };
    tick();
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, visible, intervalMs, refresh]);
}

/**
 * Polls one resource into React state under three guards that a bare interval does not give you:
 *
 * - **in flight** — a tick while the previous request is unresolved is skipped;
 * - **ordering** — a response is applied only if no newer request has started since, so a slow
 *   older response cannot overwrite newer state;
 * - **lifetime** — the in-flight request is aborted on unmount and whenever `load` changes, so a
 *   response cannot land after navigation and write state (or the clock offset) behind the
 *   screen's back.
 */
export function usePolledRequest<T>(
  load: (signal: AbortSignal) => Promise<T>,
  apply: (value: T) => void,
  intervalMs: number,
  enabled = true,
): { refresh: () => Promise<void> } {
  // The loader is a dependency so a changed one restarts the poll; the applier is a ref because
  // it only writes state, and re-rendering the writer must not trigger a fetch.
  const latestApply = useRef(apply);
  latestApply.current = apply;

  const sequence = useRef(0);
  const controller = useRef<AbortController | undefined>(undefined);

  const refresh = useCallback(async () => {
    const token = ++sequence.current;
    const own = new AbortController();
    controller.current?.abort();
    controller.current = own;
    let value: T;
    try {
      value = await load(own.signal);
    } catch {
      return;
    }
    if (own.signal.aborted || token !== sequence.current) return;
    latestApply.current(value);
  }, [load]);

  usePolling(refresh, intervalMs, enabled);

  useEffect(() => () => {
    // Invalidates any response still in flight as well as aborting it: a fetch that has already
    // resolved cannot be aborted, and the bumped sequence is what stops it applying.
    sequence.current += 1;
    controller.current?.abort();
  }, []);

  return { refresh };
}
