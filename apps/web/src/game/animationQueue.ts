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
     leave the final state behind without playing a frame of animation.

   Playback controls (`setRate`, `pause`, `resume`, `stepOnce`) exist for dev
   tooling. Their defaults (rate 1, not paused) schedule every wait exactly as a
   plain `setTimeout(ms)` would. */

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
  /**
   * Queue at the FRONT of the track instead of the back, behind any front-queued steps
   * already waiting there.
   *
   * A cue that spawns its own follow-up while it runs — a security dock reading out the
   * clause of the card it is holding — would otherwise land behind everything that arrived
   * from the server in the meantime. Whole later checks were enqueued during the beat the
   * dock was on screen, so its clause read out after all of them instead of beside the card
   * it belongs to. Ordering among front-queued steps is the order they were enqueued in.
   */
  next?: boolean;
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
  /**
   * Scales every wait: a wait of `ms` takes `ms / rate` real milliseconds. A change
   * mid-wait reschedules only the time that wait still owes.
   */
  setRate(rate: number): void;
  getRate(): number;
  /**
   * Freezes the remaining time of every running wait and holds each track before its next
   * entry. What is already running keeps its state; nothing new starts until `resume` or
   * `stepOnce`.
   */
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  /**
   * While paused, lets exactly one entry start: the one that has waited longest at the pause
   * gate across all tracks (a parallel group enqueued as an array is one entry). Its waits
   * run at the current rate despite the pause, and its track stops at the gate again before
   * its next entry. Waits frozen by `pause` stay frozen. When no track is waiting at the
   * gate, the permit is kept for the next entry that reaches it (one permit at most).
   * Returns true when an entry was released at once. Does nothing when not paused.
   */
  stepOnce(): boolean;
  /** Counts what `hasPendingStep` would find, so a waiter can tell progress from a stall. */
  countPendingSteps(predicate: (step: AnimationStep) => boolean): number;
}

export const DEFAULT_TRACK = "main";

interface Waiter {
  skippable: boolean;
  /** Unscaled time the wait still owes, as of `scheduledAt`. */
  remainingMs: number;
  scheduledAt: number;
  /** Undefined while frozen by a pause. */
  timer: ReturnType<typeof setTimeout> | undefined;
  settle(): void;
}

interface StepRun {
  step: AnimationStep;
  cancelled: boolean;
  waiters: Set<Waiter>;
  /** Released by `stepOnce`: its waits keep running while the queue is paused. */
  stepped: boolean;
}

interface QueueEntry {
  steps: readonly AnimationStep[];
  /** Entered at the front of the track; kept so later front-queued steps land behind it. */
  next: boolean;
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
  let rate = 1;
  let paused = false;
  let stepPermit = false;
  /** Tracks held before their next entry by a pause, in the order they arrived there. */
  const gatedTracks = new Map<Track, (stepped: boolean) => void>();

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
            remainingMs: ms,
            scheduledAt: 0,
            timer: undefined,
            settle: () => {
              if (!run.waiters.delete(waiter)) return;
              clearTimeout(waiter.timer);
              resolve();
            },
          };
          run.waiters.add(waiter);
          schedule(waiter, run);
        });
      },
    };
  }

  function frozen(run: StepRun): boolean {
    return paused && !run.stepped;
  }

  function schedule(waiter: Waiter, run: StepRun) {
    if (waiter.timer !== undefined || frozen(run)) return;
    waiter.scheduledAt = Date.now();
    waiter.timer = setTimeout(() => waiter.settle(), waiter.remainingMs / rate);
  }

  function suspend(waiter: Waiter) {
    if (waiter.timer === undefined) return;
    clearTimeout(waiter.timer);
    waiter.timer = undefined;
    waiter.remainingMs = Math.max(0, waiter.remainingMs - (Date.now() - waiter.scheduledAt) * rate);
  }

  function runningRuns(): StepRun[] {
    return [...tracks.values()].flatMap((track) => track.running);
  }

  function waitAtGate(track: Track): Promise<boolean> {
    return new Promise((resolve) => gatedTracks.set(track, resolve));
  }

  function openGate(track: Track, stepped: boolean) {
    const release = gatedTracks.get(track);
    if (!release) return;
    gatedTracks.delete(track);
    release(stepped);
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
    openGate(track, false);
    for (const run of track.running) {
      run.cancelled = true;
      settleWaiters(run, false);
    }
  }

  function isIdle(): boolean {
    for (const track of tracks.values()) if (track.queued.length > 0 || track.running.length > 0) return false;
    return true;
  }

  function countPendingSteps(predicate: (step: AnimationStep) => boolean): number {
    let total = 0;
    for (const track of tracks.values()) {
      for (const run of track.running)
        if (!run.cancelled && modeOf(run.step) === "live" && predicate(run.step)) total += 1;
      for (const entry of track.queued)
        for (const step of entry.steps) if (modeOf(step) === "live" && predicate(step)) total += 1;
    }
    return total;
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
        let stepped = false;
        if (paused) {
          if (stepPermit) {
            stepPermit = false;
            stepped = true;
          } else {
            stepped = await waitAtGate(track);
            // Resumed, or the track was cancelled or replaced: look at the queue again.
            if (!stepped) continue;
          }
        }
        const entry = track.queued.shift();
        if (!entry) break;
        const runs = entry.steps.map((step) => ({
          step,
          run: { step, cancelled: false, waiters: new Set<Waiter>(), stepped },
        }));
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
      const next = steps.some((candidate) => candidate.next === true);
      if (next) {
        const behindFrontQueued = track.queued.findIndex((entry) => !entry.next);
        track.queued.splice(behindFrontQueued < 0 ? track.queued.length : behindFrontQueued, 0, { steps, next });
      } else track.queued.push({ steps, next });
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
      return countPendingSteps(predicate) > 0;
    },
    countPendingSteps,
    pendingCount() {
      let total = 0;
      for (const track of tracks.values()) total += track.queued.length + track.running.length;
      return total;
    },
    setRate(next) {
      if (!(next > 0) || next === rate) return;
      const runs = runningRuns();
      for (const run of runs) for (const waiter of run.waiters) suspend(waiter);
      rate = next;
      for (const run of runs) for (const waiter of run.waiters) schedule(waiter, run);
      options.onChange?.();
    },
    getRate() {
      return rate;
    },
    pause() {
      if (paused) return;
      paused = true;
      for (const run of runningRuns()) if (frozen(run)) for (const waiter of run.waiters) suspend(waiter);
      options.onChange?.();
    },
    resume() {
      if (!paused) return;
      paused = false;
      stepPermit = false;
      for (const track of [...gatedTracks.keys()]) openGate(track, false);
      for (const run of runningRuns()) {
        run.stepped = false;
        for (const waiter of run.waiters) schedule(waiter, run);
      }
      options.onChange?.();
    },
    isPaused() {
      return paused;
    },
    stepOnce() {
      if (!paused) return false;
      const waiting = gatedTracks.keys().next();
      if (waiting.done) stepPermit = true;
      else openGate(waiting.value, true);
      options.onChange?.();
      return !waiting.done;
    },
  };
}
