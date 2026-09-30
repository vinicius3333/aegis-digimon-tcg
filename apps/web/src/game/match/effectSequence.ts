/* Sequential pacing: one triggered effect is one unit, and units play strictly in turn.

   The server resolves a whole chain in a few milliseconds, but it closes each effect's
   announcement, its consequences and its resolution in batches of their own. Under the
   `current` pacing those batches are presented side by side, so the fourth effect's draw can
   fly while the first effect's clause is still being read. Under `sequential` pacing every
   effect gets three beats of its own, in server order:

   - announce: its source card lights up and its clause is the only clause on screen;
   - results:  everything its batches did plays, once the clause has been read for
               `effectAnnounceMin`;
   - settle:   the board rests for `effectSettle` before the next effect lights up.

   A unit opens at `effectTriggered` and closes at the matching `effectResolved`; the
   batches in between are its consequences. Two steps per unit on one serial track enforce
   the order: the first holds the board while the unit is announced, the second waits out
   the unit's results and the settle beat.

   Nothing here decides anything about the game; it is bookkeeping over the batches the
   server already closed. */

import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep } from "../animationQueue";
import { TIMINGS } from "../timings";
import { CueTrack } from "./enums";
import { createPresentationGate, waitForGate, type PresentationGate } from "./presentationGate";

export const EFFECT_UNIT_TRACK = "effectUnit";

/** How long a unit waits for its clause to have been read before its results play anyway. */
const EFFECT_ANNOUNCE_MAX_MS = 8_000;

/** How long a unit waits for its results, and for the server to close it, before it settles anyway. */
const EFFECT_RESULTS_MAX_MS = 6_000;

const RESULTS_POLL_MS = 16;

/**
 * What one unit costs on screen when nothing goes wrong: the source glow, the clause read,
 * a typical result and the settle beat. The budgets that bound how far the board and the
 * prompt may lag grow by this much per unit still to play.
 */
export const EFFECT_UNIT_ESTIMATE_MS =
  TIMINGS.effectSourceHold + TIMINGS.effectAnnounceMin + TIMINGS.drawFlight + TIMINGS.effectSettle;

/** The ceiling on any budget stretched for pending units. */
export const SEQUENTIAL_BUDGET_CEILING_MS = 20_000;

/**
 * A lag budget stretched by the units still waiting to play, so a long chain is not cut short
 * by a clock sized for one moment. With nothing pending it is the base budget unchanged.
 */
export function sequentialBudgetMs(baseMs: number, pendingUnits: number): number {
  if (pendingUnits <= 0) return baseMs;
  return Math.min(SEQUENTIAL_BUDGET_CEILING_MS, Math.max(baseMs, baseMs + pendingUnits * EFFECT_UNIT_ESTIMATE_MS));
}

export interface EffectUnit {
  id: number;
  seat: Seat;
  sourceCardId: string;
  effectKey: string;
  sourceInstanceId?: string;
  timing?: string;
  description: string;
  /** Every batch the unit spans: its announcement, its consequences, its resolution. */
  batchIds: Set<string>;
  /** Its `effectResolved` has been presented. */
  closed: boolean;
  /** A clause was raised for it. A unit nobody announces has nothing to read before its results. */
  narrated: boolean;
  /** The unit ahead of this one has settled: its source may light up. */
  started: PresentationGate;
  /** Its clause has been on screen for `effectAnnounceMin`: its results may play. */
  announced: PresentationGate;
}

/** What one presented batch means for the units. */
export interface ObservedBatch {
  /** The units this batch opened, with the index of the `effectTriggered` that opened each. */
  opened: readonly { unit: EffectUnit; eventIndex: number }[];
  /** The unit whose announcement this batch's consequences wait on, if any. */
  owner: EffectUnit | undefined;
}

export interface EffectSequence {
  observeBatch(batchId: string, stateVersion: number, events: readonly ServerEvent[]): ObservedBatch;
  /** Ties a raised clause to the unit it announces. */
  bindNotice(notice: object, unit: EffectUnit): void;
  unitOf(notice: object | undefined): EffectUnit | undefined;
  /** A clause step, which no unit's results wait on: it belongs to its own unit's announce. */
  markClauseStep(stepId: string): void;
  isClauseStep(stepId: string): boolean;
  /**
   * The cause of a change the live state shows before the batch that made it has been
   * presented: the state patch reaches the client ahead of its batch's close, and one patch
   * can carry several batches. The change is pinned to the earliest batch still to come,
   * because pinning it to the newest would hold it behind every effect in between. The gate
   * opens once that batch's unit, if it has one, is announced, and its ceiling only starts
   * once that unit has started.
   */
  causeOfLiveChange(liveStateVersion: number): PresentationGate;
  /** The newest batch revision observed, so a watcher can tell a change whose batch is still ahead. */
  observedVersion(): number;
  /** A batch at this revision was presented, whatever the pacing: the causes it carried are known. */
  noteVersion(stateVersion: number): void;
  /** Units opened and not yet settled. */
  pendingCount(): number;
  settle(unit: EffectUnit): void;
  hasLaterUnit(unit: EffectUnit): boolean;
}

function sameEffect(unit: EffectUnit, event: Extract<ServerEvent, { kind: "effectResolved" }>): boolean {
  if (unit.seat !== event.seat || unit.effectKey !== event.effectKey) return false;
  return (
    unit.sourceInstanceId === undefined ||
    event.sourceInstanceId === undefined ||
    unit.sourceInstanceId === event.sourceInstanceId
  );
}

export function createEffectSequence(): EffectSequence {
  let newestId = 0;
  let latestVersion = -1;
  /** The gate the next unit to open starts behind. */
  let tail: PresentationGate | null = null;
  const open: EffectUnit[] = [];
  const pending = new Set<EffectUnit>();
  const notices = new WeakMap<object, EffectUnit>();
  const clauseSteps = new Set<string>();
  const causes = new Map<number, { gate: PresentationGate; started: PresentationGate }>();

  function openUnit(event: Extract<ServerEvent, { kind: "effectTriggered" }>, batchId: string): EffectUnit {
    const started = createPresentationGate();
    const announced = createPresentationGate();
    announced.after = started;
    if (tail) started.after = tail;
    newestId += 1;
    const unit: EffectUnit = {
      id: newestId,
      seat: event.seat,
      sourceCardId: event.sourceCardId,
      effectKey: event.effectKey,
      ...(event.sourceInstanceId !== undefined ? { sourceInstanceId: event.sourceInstanceId } : {}),
      ...(event.timing !== undefined ? { timing: event.timing } : {}),
      description: event.description,
      batchIds: new Set([batchId]),
      closed: false,
      narrated: false,
      started,
      announced,
    };
    tail = announced;
    open.push(unit);
    pending.add(unit);
    return unit;
  }

  function bindCauses(stateVersion: number, owner: EffectUnit | undefined) {
    for (const [version, cause] of causes) {
      if (version > stateVersion) continue;
      causes.delete(version);
      if (owner) {
        void owner.started.opened.then(() => cause.started.release());
        void owner.announced.opened.then(() => cause.gate.release());
      } else {
        cause.started.release();
        cause.gate.release();
      }
    }
  }

  return {
    observeBatch(batchId, stateVersion, events) {
      latestVersion = Math.max(latestVersion, stateVersion);
      const carriedBy = open.at(-1);
      const opened: { unit: EffectUnit; eventIndex: number }[] = [];
      let closed: EffectUnit | undefined;
      for (const [eventIndex, event] of events.entries()) {
        if (event.kind === "effectTriggered") {
          opened.push({ unit: openUnit(event, batchId), eventIndex });
          continue;
        }
        open.at(-1)?.batchIds.add(batchId);
        // No effect outlives its turn. One the server never closed must not claim the next turn's batches.
        if (event.kind === "turnEnded") open.length = 0;
        if (event.kind !== "effectResolved") continue;
        const matching = open.filter((unit) => sameEffect(unit, event)).at(-1);
        const [resolved] = matching ? open.splice(open.indexOf(matching), 1) : [];
        if (!resolved) continue;
        resolved.closed = true;
        resolved.batchIds.add(batchId);
        closed = resolved;
      }
      const owner = opened.at(-1)?.unit ?? carriedBy ?? closed;
      bindCauses(stateVersion, owner);
      return { opened, owner };
    },
    bindNotice(notice, unit) {
      notices.set(notice, unit);
      unit.narrated = true;
    },
    unitOf(notice) {
      return notice ? notices.get(notice) : undefined;
    },
    markClauseStep(stepId) {
      clauseSteps.add(stepId);
      if (clauseSteps.size > 200) clauseSteps.delete(clauseSteps.values().next().value!);
    },
    isClauseStep(stepId) {
      return clauseSteps.has(stepId);
    },
    causeOfLiveChange(liveStateVersion) {
      const version = Math.min(liveStateVersion, latestVersion + 1);
      const existing = causes.get(version);
      if (existing) return existing.gate;
      const started = createPresentationGate();
      const gate = createPresentationGate();
      gate.after = started;
      causes.set(version, { gate, started });
      return gate;
    },
    observedVersion() {
      return latestVersion;
    },
    noteVersion(stateVersion) {
      latestVersion = Math.max(latestVersion, stateVersion);
      bindCauses(stateVersion, undefined);
    },
    pendingCount() {
      return pending.size;
    },
    settle(unit) {
      pending.delete(unit);
      unit.started.release();
      unit.announced.release();
      if (tail === unit.announced) tail = null;
    },
    hasLaterUnit(unit) {
      return newestId > unit.id;
    },
  };
}

export interface EffectUnitStepsDeps {
  sequence: EffectSequence;
  queue: Pick<AnimationQueue, "hasPendingStep">;
  /** The server batch a queued step belongs to, however it was enqueued. */
  batchOf: (step: AnimationStep) => string | undefined;
  decisionPending: () => boolean;
  /** The unit's source has lit up: it is the effect on screen now. */
  onStarted?: (unit: EffectUnit) => void;
  onSettled?: (unit: EffectUnit) => void;
}

/**
 * The two steps that pace one unit, both on {@link EFFECT_UNIT_TRACK} so a unit cannot begin
 * before the one ahead of it has settled.
 *
 * The first holds the board at the batch that announced the unit while its source glows and
 * its clause is read: a later effect's batch must not reach the board first. The second lets
 * the board go, waits for the unit's results to finish, then rests for `effectSettle`. Both
 * block a decision, so a prompt opens over a settled board rather than mid-effect.
 */
export function effectUnitSteps(unit: EffectUnit, deps: EffectUnitStepsDeps): AnimationStep[] {
  const { sequence, queue, batchOf, decisionPending, onStarted, onSettled } = deps;
  const resultsPending = () =>
    queue.hasPendingStep((step) => {
      if (step.track === EFFECT_UNIT_TRACK || sequence.isClauseStep(step.id)) return false;
      if (step.track === CueTrack.SecurityDock || step.track === CueTrack.SecurityHold) return false;
      const batchId = batchOf(step);
      return batchId !== undefined && unit.batchIds.has(batchId);
    });
  // The server has not closed the unit yet. It may be waiting on the viewer, or resolving an
  // effect nested inside this one, and neither lets the unit's own close arrive first.
  const awaitingClose = () => !unit.closed && !decisionPending() && !sequence.hasLaterUnit(unit);
  return [
    {
      id: `effect-unit-announce-${unit.id}`,
      track: EFFECT_UNIT_TRACK,
      holdsBoard: true,
      async run(context) {
        try {
          unit.started.release();
          onStarted?.(unit);
          if (context.mode !== "live" || !unit.narrated) return;
          await waitForGate(unit.announced, context, EFFECT_ANNOUNCE_MAX_MS, "effectUnit/announced");
        } finally {
          unit.announced.release();
        }
      },
    },
    {
      id: `effect-unit-settle-${unit.id}`,
      track: EFFECT_UNIT_TRACK,
      holdsBoard: false,
      async run(context) {
        try {
          const live = () => context.mode === "live" && !context.cancelled && !context.skipping;
          // Counted in queue time, so a paused or slowed queue does not run the ceiling out.
          for (
            let waited = 0;
            live() && waited < EFFECT_RESULTS_MAX_MS && (resultsPending() || awaitingClose());
            waited += RESULTS_POLL_MS
          )
            await context.wait(RESULTS_POLL_MS);
          if (live()) await context.wait(TIMINGS.effectSettle);
        } finally {
          sequence.settle(unit);
          onSettled?.(unit);
        }
      },
    },
  ];
}
