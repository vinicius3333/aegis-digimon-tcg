import { log, logDirectory } from "../logger.js";
import { extractReplayFromLogDir, ReplayExtractionError } from "../replay/extract.js";
import type { ReplayRecord } from "../replay/types.js";
import type { FeedbackStore } from "./FeedbackStore.js";
import type { ReplayFailure, ReplayOutcome } from "./GitHubIssueTracker.js";

/** How long a report waits for its replay before it is filed without one. */
export const DEFAULT_REPLAY_CAPTURE_TIMEOUT_MS = 3_000;
// Scans read the shared log directory; a few at once is plenty for hand-typed reports, and the cap
// keeps a burst of reports from many accounts from turning into a burst of full-directory reads.
const DEFAULT_MAX_CONCURRENT_CAPTURES = 2;
// The log writer prunes a segment once its last write is 12 hours old (see localLogWriter.ts). A
// segment older than that cannot hold a match a player is reporting from now, even if pruning lags.
const SCAN_WINDOW_MS = 12 * 60 * 60 * 1000;

/** Reads one match's replay out of the logs; it must stop reading when `signal` aborts. */
export type ReplayExtractor = (matchId: string, signal: AbortSignal) => Promise<ReplayRecord>;

export type ReplayCapturerOptions = {
  /** Where the room's `api-*.jsonl` segments are. */
  logDir: string;
  timeoutMs?: number;
  maxConcurrent?: number;
  /** Replaces the log scan, so a test can stall or fail it. */
  extract?: ReplayExtractor;
  now?: () => number;
};

class CaptureTimedOut extends Error {}

/**
 * Copies a match's replay out of the logs, within a time budget and a concurrency cap. It never
 * throws: every failure becomes a {@link ReplayFailure} the report can carry.
 */
export class ReplayCapturer {
  private running = 0;
  private readonly timeoutMs: number;
  private readonly maxConcurrent: number;
  private readonly extract: ReplayExtractor;

  constructor(options: ReplayCapturerOptions) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REPLAY_CAPTURE_TIMEOUT_MS;
    this.maxConcurrent = options.maxConcurrent ?? DEFAULT_MAX_CONCURRENT_CAPTURES;
    const now = options.now ?? Date.now;
    this.extract =
      options.extract ??
      ((matchId, signal) =>
        extractReplayFromLogDir(options.logDir, matchId, { signal, modifiedAfter: now() - SCAN_WINDOW_MS }));
  }

  /**
   * Reads `AEGIS_REPLAY_CAPTURE_TIMEOUT_MS` (default 3000) and the log directory; returns undefined
   * when `AEGIS_REPLAY_CAPTURE_ENABLED=false`.
   */
  static fromEnvironment(env: NodeJS.ProcessEnv = process.env): ReplayCapturer | undefined {
    if (env.AEGIS_REPLAY_CAPTURE_ENABLED?.trim().toLowerCase() === "false") return undefined;
    const timeout = Number(env.AEGIS_REPLAY_CAPTURE_TIMEOUT_MS);
    return new ReplayCapturer({
      logDir: env.AEGIS_LOG_DIR ?? logDirectory,
      timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_REPLAY_CAPTURE_TIMEOUT_MS,
    });
  }

  async capture(matchId: string): Promise<ReplayRecord | { failure: ReplayFailure; detail?: string }> {
    if (this.running >= this.maxConcurrent) return { failure: "busy" };
    this.running += 1;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new CaptureTimedOut());
      }, this.timeoutMs);
      timer.unref?.();
    });
    try {
      // The race answers on time even when a read stalls; the abort then tears the read down.
      return await Promise.race([this.extract(matchId, controller.signal), timedOut]);
    } catch (error) {
      if (error instanceof CaptureTimedOut) return { failure: "timed_out" };
      if (error instanceof ReplayExtractionError || isMissingDirectory(error)) {
        return { failure: "logs_not_found", detail: error instanceof Error ? error.message : undefined };
      }
      return { failure: "error", detail: error instanceof Error ? error.message : String(error) };
    } finally {
      clearTimeout(timer);
      controller.abort();
      this.running -= 1;
    }
  }
}

/**
 * Captures and stores the replay of the match a report was filed from. Never throws and never
 * blocks longer than the capturer's budget plus one insert: the report is already saved, and a
 * replay is a bonus on top of it.
 */
export async function captureReportReplay(
  store: FeedbackStore,
  capturer: ReplayCapturer,
  reportId: number,
  matchId: string,
): Promise<ReplayOutcome> {
  const started = Date.now();
  let outcome: ReplayOutcome;
  let detail: string | undefined;
  try {
    const captured = await capturer.capture(matchId);
    if ("failure" in captured) {
      outcome = { saved: false, reason: captured.failure };
      detail = captured.detail;
    } else {
      await store.saveReplay(reportId, captured);
      outcome = { saved: true, reportId, inputCount: captured.inputs.length };
    }
  } catch (error) {
    outcome = { saved: false, reason: "error" };
    detail = error instanceof Error ? error.message : String(error);
  }
  log("[bug-reports] replay capture", {
    reportId,
    matchId,
    ...(outcome.saved ? { saved: true, inputCount: outcome.inputCount } : { saved: false, reason: outcome.reason }),
    ...(detail ? { detail } : {}),
    ms: Date.now() - started,
  });
  return outcome;
}

function isMissingDirectory(error: unknown): boolean {
  return isMissingFile(error) || (error as NodeJS.ErrnoException | undefined)?.code === "ENOTDIR";
}

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}
