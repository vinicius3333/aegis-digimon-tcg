/* What the presentation queue actually cost, so `TIMINGS` can be tuned from data.

   Phase 4 of docs/presentation-queue-plan.md asks for queue depth and time-to-idle per
   batch. Both are already known to presentationProgress.ts: a batch is `present()`ed at a
   revision, every moment it raises is `track()`ed, and `settle()` is the queue running dry.
   This module only writes those three facts down, plus the counters that say how often the
   two budgets had to rescue the board and how often a player asked to move on.

   It is in-memory and read on demand: nothing here is sent anywhere, and the record ring
   is small enough that a long match cannot grow it. */

/** One server batch, as the presentation queue saw it. */
export interface PresentationBatchRecord {
  batchId: string;
  /** The board this batch produced. */
  stateVersion: number;
  /** Moments enqueued for the batch: the queue depth it was worth. */
  steps: number;
  /** `present()` to the `settle()` that closed it, or undefined while it is still open. */
  timeToIdleMs?: number;
}

export interface PresentationCounters {
  /** The board caught up because `PRESENTED_BOARD_BUDGET_MS` ran out. */
  boardBudgetHits: number;
  /** A prompt opened because `PLAY_LEAD_IN_BUDGET_MS` ran out. */
  decisionBudgetHits: number;
  /** Explicit fast-forwards: the skip button, or a board tap with nothing to advance. */
  skips: number;
  /** Taps that moved a narration item on rather than skipping. */
  manualAdvances: number;
}

export interface PresentationTelemetrySnapshot {
  /** The most recent batches, oldest first. */
  batches: readonly PresentationBatchRecord[];
  counters: PresentationCounters;
}

export interface PresentationTelemetry {
  present(batchId: string, stateVersion: number): void;
  /** Count one moment into the batch being presented. */
  countStep(): void;
  /** The queue ran dry: every open batch has reached idle. */
  settle(): void;
  countBoardBudgetHit(): void;
  countDecisionBudgetHit(): void;
  countSkip(): void;
  countManualAdvance(): void;
  read(): PresentationTelemetrySnapshot;
  reset(): void;
}

/** How many batches are kept. A match is thousands of batches; a tuning sample is not. */
export const PRESENTATION_TELEMETRY_CAPACITY = 60;

interface OpenRecord extends PresentationBatchRecord {
  presentedAt: number;
}

function emptyCounters(): PresentationCounters {
  return { boardBudgetHits: 0, decisionBudgetHits: 0, skips: 0, manualAdvances: 0 };
}

export function createPresentationTelemetry(now: () => number = Date.now): PresentationTelemetry {
  let records: OpenRecord[] = [];
  let presenting: OpenRecord | undefined;
  let counters = emptyCounters();

  function strip(record: OpenRecord): PresentationBatchRecord {
    const { presentedAt: _presentedAt, ...rest } = record;
    return rest;
  }

  return {
    present(batchId, stateVersion) {
      presenting = { batchId, stateVersion, steps: 0, presentedAt: now() };
      records = [...records, presenting].slice(-PRESENTATION_TELEMETRY_CAPACITY);
    },
    countStep() {
      if (presenting) presenting.steps += 1;
    },
    settle() {
      const at = now();
      for (const record of records) {
        if (record.timeToIdleMs === undefined) record.timeToIdleMs = at - record.presentedAt;
      }
      presenting = undefined;
    },
    countBoardBudgetHit() {
      counters = { ...counters, boardBudgetHits: counters.boardBudgetHits + 1 };
    },
    countDecisionBudgetHit() {
      counters = { ...counters, decisionBudgetHits: counters.decisionBudgetHits + 1 };
    },
    countSkip() {
      counters = { ...counters, skips: counters.skips + 1 };
    },
    countManualAdvance() {
      counters = { ...counters, manualAdvances: counters.manualAdvances + 1 };
    },
    read() {
      return { batches: records.map(strip), counters };
    },
    reset() {
      records = [];
      presenting = undefined;
      counters = emptyCounters();
    },
  };
}

/** The instance the match screen writes to. */
export const presentationTelemetry = createPresentationTelemetry();

/** Where a dev build hangs the reader: `__aegisPresentation()` in the console. */
const DEV_GLOBAL_KEY = "__aegisPresentation";

// There is no debug panel in the match screen — the header's bug button files a report —
// so the numbers are read from the dev console instead, and only in a dev build.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>)[DEV_GLOBAL_KEY] = () => presentationTelemetry.read();
}
