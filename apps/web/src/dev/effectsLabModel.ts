/* The effects lab's inspector model: the closed server batches and the animation step
   events one live match produced, bounded, plus the views the panel draws from them.
   Pure, so the reducer and the derived views are tested without a match. */

import type { DecisionRequest, SequencedServerEvent } from "@aegis/shared";
import type { AnimationQueueMode } from "../game/animationQueue";
import type { ServerBatch } from "../net/serverBatches";

export const MAX_LAB_BATCHES = 100;
export const MAX_LAB_STEP_EVENTS = 500;

export type StepPhase = "queued" | "started" | "finished" | "dropped";

/** One queue event, flattened to what survives `JSON.stringify`. */
export interface LabStepEvent {
  /** Unique per step object; step ids alone can repeat. */
  key: string;
  stepId: string;
  track: string;
  side?: string;
  phase: StepPhase;
  mode: AnimationQueueMode;
  cancelled: boolean;
  skipping: boolean;
  failed: boolean;
  durationMs?: number;
  batchId?: string;
  stateVersion?: number;
  sourceCardId?: string;
  timing?: string;
  /** Milliseconds since page load. */
  at: number;
}

export interface LabBatch {
  id: string;
  stateVersion: number;
  events: readonly SequencedServerEvent[];
  receivedAt: number;
}

export interface LabDecision {
  kind: string;
  seat: number;
  sourceCardId?: string;
  at: number;
}

export interface EffectsLabState {
  batches: readonly LabBatch[];
  stepEvents: readonly LabStepEvent[];
  decisions: readonly LabDecision[];
}

export type EffectsLabAction =
  | { type: "batch"; batch: ServerBatch; at: number }
  | { type: "step"; event: LabStepEvent }
  | { type: "decision"; decision: DecisionRequest | undefined; at: number }
  | { type: "reset" };

export const emptyEffectsLab: EffectsLabState = { batches: [], stepEvents: [], decisions: [] };

function lastOf<T>(items: readonly T[], limit: number): readonly T[] {
  return items.length > limit ? items.slice(items.length - limit) : items;
}

export function effectsLabReducer(state: EffectsLabState, action: EffectsLabAction): EffectsLabState {
  switch (action.type) {
    case "batch":
      if (state.batches.some((batch) => batch.id === action.batch.id)) return state;
      return {
        ...state,
        batches: lastOf(
          [
            ...state.batches,
            {
              id: action.batch.id,
              stateVersion: action.batch.stateVersion,
              events: action.batch.events,
              receivedAt: action.at,
            },
          ],
          MAX_LAB_BATCHES,
        ),
      };
    case "step":
      return { ...state, stepEvents: lastOf([...state.stepEvents, action.event], MAX_LAB_STEP_EVENTS) };
    case "decision":
      if (!action.decision) return state;
      return {
        ...state,
        decisions: lastOf(
          [
            ...state.decisions,
            {
              kind: action.decision.kind,
              seat: action.decision.seat,
              ...(action.decision.sourceCardId ? { sourceCardId: action.decision.sourceCardId } : {}),
              at: action.at,
            },
          ],
          MAX_LAB_BATCHES,
        ),
      };
    case "reset":
      return emptyEffectsLab;
  }
}

export type StepStatus =
  | "queued"
  | "running"
  | "finished"
  | "skipped"
  | "cancelled"
  | "dropped"
  | "failed"
  | "drained"
  | "replayed";

/** One step's life on the timeline: queued, started, and how it ended. */
export interface StepBar {
  key: string;
  stepId: string;
  track: string;
  side?: string;
  batchId?: string;
  stateVersion?: number;
  sourceCardId?: string;
  timing?: string;
  queuedAt?: number;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  status: StepStatus;
}

function endStatus(event: LabStepEvent): StepStatus {
  if (event.phase === "dropped") return "dropped";
  if (event.failed) return "failed";
  if (event.cancelled) return "cancelled";
  if (event.mode === "replay") return "replayed";
  if (event.mode === "drain") return "drained";
  if (event.skipping) return "skipped";
  return "finished";
}

/** Folds the step events into one bar per step, in the order each step was first seen. */
export function stepBars(events: readonly LabStepEvent[]): StepBar[] {
  const bars = new Map<string, StepBar>();
  for (const event of events) {
    const bar: StepBar = bars.get(event.key) ?? {
      key: event.key,
      stepId: event.stepId,
      track: event.track,
      status: "queued",
    };
    if (event.side) bar.side = event.side;
    if (event.batchId !== undefined) bar.batchId = event.batchId;
    if (event.stateVersion !== undefined) bar.stateVersion = event.stateVersion;
    if (event.sourceCardId) bar.sourceCardId = event.sourceCardId;
    if (event.timing) bar.timing = event.timing;
    if (event.phase === "queued") bar.queuedAt = event.at;
    else if (event.phase === "started") {
      bar.startedAt = event.at;
      bar.status = "running";
    } else {
      bar.endedAt = event.at;
      if (event.durationMs !== undefined) bar.durationMs = event.durationMs;
      bar.status = endStatus(event);
    }
    bars.set(event.key, bar);
  }
  return [...bars.values()];
}

export interface TrackLane {
  track: string;
  bars: StepBar[];
}

/** One lane per track, in the order the tracks first appeared. */
export function trackLanes(bars: readonly StepBar[]): TrackLane[] {
  const lanes = new Map<string, StepBar[]>();
  for (const bar of bars) lanes.set(bar.track, [...(lanes.get(bar.track) ?? []), bar]);
  return [...lanes].map(([track, laneBars]) => ({ track, bars: laneBars }));
}

/** Where a bar sits on the time axis. A step never started is drawn as a tick at its queue time. */
export function barSpan(bar: StepBar, now: number): { start: number; end: number } {
  const start = bar.startedAt ?? bar.queuedAt ?? bar.endedAt ?? now;
  const end = bar.endedAt ?? (bar.status === "running" ? now : start);
  return { start, end: Math.max(start, end) };
}

export function timelineBounds(bars: readonly StepBar[], now: number): { start: number; end: number } {
  if (bars.length === 0) return { start: now, end: now };
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const bar of bars) {
    const span = barSpan(bar, now);
    start = Math.min(start, bar.queuedAt ?? span.start);
    end = Math.max(end, span.end);
  }
  return { start, end };
}

export function activeSteps(bars: readonly StepBar[]): { running: StepBar[]; queued: StepBar[] } {
  return {
    running: bars.filter((bar) => bar.status === "running"),
    queued: bars.filter((bar) => bar.status === "queued"),
  };
}

export function stepKeysOfBatch(bars: readonly StepBar[], batchId: string): Set<string> {
  return new Set(bars.filter((bar) => bar.batchId === batchId).map((bar) => bar.key));
}

/** A server event as a timeline row: effect events carry who, which card and why. */
export interface BatchEventRow {
  seq: number;
  kind: string;
  seat?: number;
  sourceCardId?: string;
  timing?: string;
  description?: string;
}

export function batchEventRows(batch: LabBatch): BatchEventRow[] {
  return batch.events.map((event) => {
    if (event.kind === "effectTriggered" || event.kind === "effectResolved")
      return {
        seq: event.seq,
        kind: event.kind,
        seat: event.seat,
        sourceCardId: event.sourceCardId,
        ...(event.timing ? { timing: event.timing } : {}),
        description: event.description,
      };
    return { seq: event.seq, kind: event.kind };
  });
}

export function stepTooltip(bar: StepBar): string {
  const duration =
    bar.durationMs !== undefined
      ? `${Math.round(bar.durationMs)} ms`
      : bar.startedAt !== undefined && bar.endedAt !== undefined
        ? `${Math.round(bar.endedAt - bar.startedAt)} ms`
        : "–";
  const origin = [
    bar.batchId !== undefined ? `batch ${bar.batchId}` : undefined,
    bar.stateVersion !== undefined ? `v${bar.stateVersion}` : undefined,
    bar.sourceCardId,
    bar.timing,
  ]
    .filter(Boolean)
    .join(" · ");
  return [
    bar.stepId,
    `track ${bar.track}${bar.side ? ` (${bar.side})` : ""}`,
    origin || "no origin",
    `${bar.status} · ${duration}`,
  ].join("\n");
}

export function effectsLabTrace(state: EffectsLabState, context: Record<string, unknown>): string {
  return JSON.stringify(
    {
      ...context,
      capturedAt: new Date().toISOString(),
      batches: state.batches,
      decisions: state.decisions,
      stepEvents: state.stepEvents,
    },
    null,
    2,
  );
}
