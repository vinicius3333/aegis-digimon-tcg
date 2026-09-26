/* A dev-build timeline of the presentation queue: which step started and finished when, on
   which track. Read it from the console as `__aegisCueTrace()` after playing a sequence, and
   clear it with `__aegisCueTrace.reset()`. It exists so pacing can be judged from numbers
   rather than from memory of a two-second animation. Nothing is recorded in production. */

import type { AnimationStepEvent } from "./animationQueue";

export interface CueTraceEntry {
  /** Milliseconds since the trace was last reset. */
  atMs: number;
  phase: "batch" | AnimationStepEvent["phase"];
  id: string;
  track?: string;
  cancelled?: boolean;
}

const CUE_TRACE_CAPACITY = 400;

/** Where a dev build hangs the reader: `__aegisCueTrace()` in the console. */
const DEV_GLOBAL_KEY = "__aegisCueTrace";

const enabled = import.meta.env.DEV && typeof window !== "undefined";

let origin = enabled ? performance.now() : 0;

let entries: CueTraceEntry[] = [];

function record(entry: Omit<CueTraceEntry, "atMs">) {
  if (!enabled) return;
  entries.push({ atMs: Math.round(performance.now() - origin), ...entry });
  if (entries.length > CUE_TRACE_CAPACITY) entries = entries.slice(-CUE_TRACE_CAPACITY);
}

export function traceCueBatch(batchId: string) {
  record({ phase: "batch", id: batchId });
}

export function traceCueStep(phase: AnimationStepEvent["phase"], id: string, track: string, cancelled = false) {
  record({ phase, id, track, ...(cancelled ? { cancelled } : {}) });
}

if (enabled) {
  const read = () =>
    entries.map(
      (entry) =>
        `${String(entry.atMs).padStart(6)}ms ${entry.phase.padEnd(8)} ${entry.id}` +
        `${entry.track ? ` [${entry.track}]` : ""}${entry.cancelled ? " (cancelled)" : ""}`,
    );
  const reset = () => {
    entries = [];
    origin = performance.now();
  };
  (window as unknown as Record<string, unknown>)[DEV_GLOBAL_KEY] = Object.assign(read, { reset });
}
