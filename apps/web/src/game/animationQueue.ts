/* The match screen's animation sequencer. Every cue the server provokes is a
   step whose `run` awaits real time through `ctx.wait`, so the queue can cut a
   wait short instead of leaving a `setTimeout` to fire into a screen that has
   moved on.

   Steps are grouped into tracks. A track runs its steps one after another;
   different tracks run side by side, which is what keeps independent cues (the
   lunge, the banner, a draw flight) on their own clocks. A step marked
   `replace` cancels whatever its track was holding, the way a fresh cue used to
   clear the previous timeout.

   The queue has three modes:
   - `live` — real time.
   - `drain` — reduced motion or a hidden tab: skippable waits collapse to
     nothing, so a sequence jumps to its end state, while a step that carries
     something to read (`skippable: false`) keeps its real duration.
   - `replay` — reconnect history: every wait collapses, so replayed events
     leave the final state behind without playing a frame of animation. */

import type { Side } from "./side";

export type AnimationQueueMode = "live" | "drain" | "replay";

export interface AnimationStepContext {
  /** Resolves after `ms`, or at once when the wait is drained, replayed or skipped. */
  wait(ms: number): Promise<void>;
  /** True once the step's track was replaced or the queue cleared: stop and leave the state alone. */
  readonly cancelled: boolean;
  readonly mode: AnimationQueueMode;
  /** True while the user is fast-forwarding the current cues. */
  readonly skipping: boolean;
}

export interface AnimationStep {
  id: string;
  /** Originating server batch, retained by steps spawned after later batches arrive. */
  origin?: { batchId: string; stateVersion: number; sourceCardId?: string; timing?: string; phaseOrder?: number };
  run(context: AnimationStepContext): void | Promise<void>;
  /**
   * Which side of the screen the step draws on, for the diagnostic report. Only the cues
   * that exist once per side set it; the track name says the rest.
   */
  side?: Side;
  /** Steps sharing a track run in order; separate tracks run concurrently. */
  track?: string;
  /** Cancel whatever the track is running or holding before this step starts. */
  replace?: boolean;
  /** Defaults to true. A step that carries something to read sets false and keeps its time. */
  skippable?: boolean;
  /** Informational steps can remain visible without holding the presented board snapshot. */
  holdsBoard?: boolean;
  /** Informational steps can remain visible while an authoritative decision opens. */
  blocksDecision?: boolean;
  /**
   * Overrides the queue's mode for this step alone. Reconnect replay enqueues
   * `replay` steps while the queue itself stays live for whatever comes next.
   */
  mode?: AnimationQueueMode;
}

export interface AnimationQueueOptions {
  /** Called when queued/running steps or the playback mode change. */
  onChange?: () => void;
  mode?: AnimationQueueMode;
  /** A failing cue must not wedge the ones behind it, so errors are reported, not thrown. */
  onError?: (error: unknown, step: AnimationStep) => void;
  onStep?: (event: AnimationStepEvent) => void;
}

export interface AnimationStepEvent {
  step: AnimationStep;
  phase: "queued" | "started" | "finished" | "dropped";
  durationMs?: number;
  mode: AnimationQueueMode;
  cancelled: boolean;
  skipping: boolean;
  failed: boolean;
}

export interface AnimationQueue {
  /** A single step, or an array run as one parallel group on the first step's track. */
  enqueue(step: AnimationStep | readonly AnimationStep[]): void;
  /** Fast-forward: collapse every skippable wait until the queue runs dry. */
  skip(): void;
  setMode(mode: AnimationQueueMode): void;
  getMode(): AnimationQueueMode;
  /** Cancel everything in flight and drop what is queued behind it. */
  clear(): void;
  isIdle(): boolean;
  /** Resolves the next time nothing is running. */
  idle(): Promise<void>;
  pendingCount(): number;
  /** Includes queued steps; cancelled and non-live steps cannot hold a visual barrier. */
  hasPendingStep(predicate: (step: AnimationStep) => boolean): boolean;
}

export const DEFAULT_TRACK = "main";

interface Waiter {
  skippable: boolean;
  settle(): void;
}

interface StepRun {
  step: AnimationStep;
  cancelled: boolean;
  waiters: Set<Waiter>;
}

interface QueueEntry {
  steps: readonly AnimationStep[];
}

interface Track {
  queued: QueueEntry[];
  running: StepRun[];
  draining: boolean;
}

function isSkippable(step: AnimationStep): boolean {
  return step.skippable !== false;
}

export function createAnimationQueue(options: AnimationQueueOptions = {}): AnimationQueue {
  const tracks = new Map<string, Track>();
  const idleResolvers: (() => void)[] = [];
  let mode: AnimationQueueMode = options.mode ?? "live";
  let fastForward = false;

  function trackNamed(name: string): Track {
    const existing = tracks.get(name);
    if (existing) return existing;
    const created: Track = { queued: [], running: [], draining: false };
    tracks.set(name, created);
    return created;
  }

  function modeOf(step: AnimationStep): AnimationQueueMode {
    return step.mode ?? mode;
  }

  function collapses(step: AnimationStep, run: StepRun): boolean {
    const stepMode = modeOf(step);
    if (run.cancelled || stepMode === "replay") return true;
    return isSkippable(step) && (stepMode === "drain" || fastForward);
  }

  function contextFor(step: AnimationStep, run: StepRun): AnimationStepContext {
    return {
      get skipping() {
        return fastForward;
      },
      get cancelled() {
        return run.cancelled;
      },
      get mode() {
        return modeOf(step);
      },
      wait(ms: number): Promise<void> {
        if (ms <= 0 || collapses(step, run)) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const waiter: Waiter = {
            skippable: isSkippable(step),
            settle: () => {
              if (!run.waiters.delete(waiter)) return;
              clearTimeout(timer);
              resolve();
            },
          };
          const timer = setTimeout(() => waiter.settle(), ms);
          run.waiters.add(waiter);
        });
      },
    };
  }

  function settleWaiters(run: StepRun, skippableOnly: boolean) {
    for (const waiter of [...run.waiters]) if (!skippableOnly || waiter.skippable) waiter.settle();
  }

  function releaseWaiters(skippableOnly: boolean) {
    for (const track of tracks.values()) for (const run of track.running) settleWaiters(run, skippableOnly);
  }

  function cancelTrack(track: Track) {
    for (const entry of track.queued)
      for (const step of entry.steps)
        options.onStep?.({
          step,
          phase: "dropped",
          mode: modeOf(step),
          cancelled: true,
          skipping: fastForward,
          failed: false,
        });
    track.queued.length = 0;
    for (const run of track.running) {
      run.cancelled = true;
      settleWaiters(run, false);
    }
  }

  function isIdle(): boolean {
    for (const track of tracks.values()) if (track.queued.length > 0 || track.running.length > 0) return false;
    return true;
  }

  function announceIdle() {
    if (!isIdle()) return;
    fastForward = false;
    const resolvers = idleResolvers.splice(0, idleResolvers.length);
    for (const resolve of resolvers) resolve();
  }

  async function runTrack(name: string, track: Track) {
    if (track.draining) return;
    track.draining = true;
    try {
      while (track.queued.length > 0) {
        const entry = track.queued.shift()!;
        const runs = entry.steps.map((step) => ({ step, run: { step, cancelled: false, waiters: new Set<Waiter>() } }));
        track.running = runs.map((pair) => pair.run);
        await Promise.all(
          runs.map(async ({ step, run }) => {
            const started = performance.now();
            let failed = false;
            options.onStep?.({
              step,
              phase: "started",
              mode: modeOf(step),
              cancelled: false,
              skipping: fastForward,
              failed,
            });
            try {
              await step.run(contextFor(step, run));
            } catch (error) {
              failed = true;
              options.onError?.(error, step);
            } finally {
              options.onStep?.({
                step,
                phase: "finished",
                durationMs: performance.now() - started,
                mode: modeOf(step),
                cancelled: run.cancelled,
                skipping: fastForward,
                failed,
              });
            }
          }),
        );
        track.running = [];
      }
    } finally {
      track.running = [];
      track.draining = false;
      if (tracks.get(name) === track && track.queued.length === 0) tracks.delete(name);
      announceIdle();
      options.onChange?.();
    }
  }

  return {
    enqueue(step) {
      const steps: AnimationStep[] = Array.isArray(step)
        ? [...(step as readonly AnimationStep[])]
        : [step as AnimationStep];
      const first = steps[0];
      if (!first) return;
      const name = first.track ?? DEFAULT_TRACK;
      const track = trackNamed(name);
      if (steps.some((candidate) => candidate.replace === true)) cancelTrack(track);
      track.queued.push({ steps });
      for (const candidate of steps)
        options.onStep?.({
          step: candidate,
          phase: "queued",
          mode: modeOf(candidate),
          cancelled: false,
          skipping: fastForward,
          failed: false,
        });
      void runTrack(name, track);
      options.onChange?.();
    },
    skip() {
      fastForward = true;
      releaseWaiters(true);
    },
    setMode(next) {
      mode = next;
      if (next === "replay") releaseWaiters(false);
      else if (next === "drain") releaseWaiters(true);
      options.onChange?.();
    },
    getMode() {
      return mode;
    },
    clear() {
      for (const track of tracks.values()) cancelTrack(track);
      options.onChange?.();
    },
    isIdle,
    idle() {
      if (isIdle()) return Promise.resolve();
      return new Promise<void>((resolve) => idleResolvers.push(resolve));
    },
    hasPendingStep(predicate) {
      for (const track of tracks.values()) {
        if (track.running.some((run) => !run.cancelled && modeOf(run.step) === "live" && predicate(run.step)))
          return true;
        if (track.queued.some((entry) => entry.steps.some((step) => modeOf(step) === "live" && predicate(step))))
          return true;
      }
      return false;
    },
    pendingCount() {
      let total = 0;
      for (const track of tracks.values()) total += track.queued.length + track.running.length;
      return total;
    },
  };
}
