import { logError } from "../../logger.js";
import type { Clock, DeadlineScheduler } from "./DeadlineScheduler.js";

export type DeadlineWorker = {
  /** Resolves once the loop has stopped and any pass in flight has finished. */
  stop: () => Promise<void>;
  /** Runs one pass now. The loop uses it; tests drive it directly instead of waiting on timers. */
  runOnce: () => Promise<number>;
};

export const DEFAULT_DEADLINE_INTERVAL_MS = 5_000;

/**
 * Polls the deadline queue until told to stop.
 *
 * The first pass runs immediately, before any interval elapses. That is the restart recovery: a
 * process that comes up after a crash, a deploy or an overnight gap finds every overdue row
 * already waiting and applies it at once, rather than letting a fresh timer decide when the past
 * gets dealt with.
 *
 * Passes never overlap — the next one is scheduled only after the current one settles — so a slow
 * batch produces a slower loop, not a pile of concurrent workers competing for the same leases.
 *
 * Stopping is cooperative and immediate: the timer is cleared and the in-flight pass is awaited.
 * Nothing is left holding a lease deliberately, and nothing needs to be: leases are short and the
 * commands are idempotent, so a process killed mid-pass costs at most one lease's worth of delay
 * before another instance retries the same row to the same effect. This is what lets the deployment
 * drain shut the loop down without draining the queue first.
 *
 * The timer is unref'd, so the worker alone never keeps the process alive.
 */
export function startDeadlineWorker(options: {
  scheduler: DeadlineScheduler;
  /**
   * Extra reconciliation pass run after the deadlines, e.g. `SwissProgram.sweepOpenTournaments` —
   * the guarantee behind the in-memory round-close notification. Failures are logged, never fatal.
   */
  sweep?: (now: number) => Promise<number>;
  intervalMs?: number;
  clock?: Clock;
}): DeadlineWorker {
  const intervalMs = options.intervalMs ?? DEFAULT_DEADLINE_INTERVAL_MS;
  const clock = options.clock ?? Date.now;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let inFlight: Promise<unknown> = Promise.resolve();

  const runOnce = async (): Promise<number> => {
    const pass = (async () => {
      const processed = await options.scheduler.processDueDeadlines(clock());
      if (options.sweep) {
        try {
          await options.sweep(clock());
        } catch (error) {
          logError("[TOURNAMENT_DEADLINE] sweep pass failed", error);
        }
      }
      return processed;
    })();
    inFlight = pass.catch(() => undefined);
    return pass;
  };

  const loop = async (): Promise<void> => {
    if (stopped) return;
    try {
      await runOnce();
    } catch (error) {
      logError("[TOURNAMENT_DEADLINE] worker pass failed", error);
    }
    if (stopped) return;
    timer = setTimeout(() => void loop(), intervalMs);
    timer.unref?.();
  };

  void loop();

  return {
    runOnce,
    stop: async () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      await inFlight;
    },
  };
}
