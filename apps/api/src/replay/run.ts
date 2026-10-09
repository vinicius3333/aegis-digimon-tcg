import { GameState, type Intent, type Seat } from "@aegis/shared";
import { GameEngine } from "../engine/GameEngine.js";
import type { ReplayDivergence, ReplayInput, ReplayRecord, ReplaySite } from "./types.js";
import "../cards/index.js";

export interface RunReplayOptions {
  /**
   * Stop before applying `inputs[untilInput]`, once the engine has gone idle, so the state can be
   * inspected as it stood when that input arrived.
   */
  untilInput?: number;
  /** Stop at the first divergence instead of playing on. */
  stopOnDivergence?: boolean;
}

export interface ReplayRun {
  engine: GameEngine;
  state: GameState;
  /** How many inputs were applied. */
  applied: number;
  divergences: ReplayDivergence[];
}

/** Macrotask turns allowed for the engine to go quiet before an input is applied anyway. */
const MAX_IDLE_TURNS = 1_000;

/**
 * Rebuild a recorded match on a fresh engine and feed it the recorded inputs.
 *
 * The engine is constructed with the same rule-affecting hooks as `AegisRoom` (seed, imposed first
 * seat) and the state carries the room's deck format. An input recorded without a site is applied
 * once the engine is idle, because that is when the room receives one: a message or a timer can
 * only run once every pending promise continuation has settled. An input recorded at a site (the
 * room issued it synchronously from inside its handling of the engine, see `ReplaySite`) is applied
 * at the same site, at the moment the engine has emitted the recorded number of events.
 *
 * The room's batch bookkeeping is reproduced (one batch per input, an implicit batch for events
 * emitted after an input returned, `stateVersion` bumped when a batch that emitted closes), so the
 * replayed `stateVersion` and event count are compared with the recorded ones at every input.
 */
export async function runReplay(record: ReplayRecord, options: RunReplayOptions = {}): Promise<ReplayRun> {
  const state = new GameState();
  state.format = record.rules.deckFormat;
  state.unlimited = record.rules.unlimited;
  const inputs = record.inputs;
  const limit = Math.min(options.untilInput ?? inputs.length, inputs.length);
  const divergences: ReplayDivergence[] = [];

  let emitted = 0;
  let progress = 0;
  let cursor = 0;
  let stopped = false;
  let batch: { emitted: number } | undefined;
  let batchDepth = 0;
  let started = false;

  const withBatch = <T>(run: () => T): T => {
    const opened = batch ?? (batch = { emitted: 0 });
    batchDepth += 1;
    try {
      return run();
    } finally {
      batchDepth -= 1;
      if (batchDepth === 0 && batch === opened) closeBatch();
    }
  };
  // Mirrors AegisRoom.closeBatch: the match clock runs before the bump and `broadcastPatch` after
  // it, and both can issue a room input on the spot.
  const closeBatch = () => {
    const closing = batch;
    batch = undefined;
    if (!closing || closing.emitted === 0) return;
    applyDueAt("batchClose");
    state.stateVersion += 1;
    applyDueAt("batchClose");
  };
  const startOnce = (start: () => void) => {
    if (started) return;
    started = true;
    withBatch(start);
  };

  const engine: GameEngine = new GameEngine(state, {
    seed: record.seed,
    ...(record.firstSeat !== undefined ? { firstSeat: record.firstSeat } : {}),
    requestDecision: () => {
      progress += 1;
      applyDueAt("decisionRequest");
    },
    onBothReady: () => applyDueAt("bothReady"),
    onActionSettled: () => {
      progress += 1;
    },
    emit: (event) => {
      emitted += 1;
      progress += 1;
      if (!batch) {
        const implicit = (batch = { emitted: 0 });
        queueMicrotask(() => {
          if (batchDepth === 0 && batch === implicit) closeBatch();
        });
      }
      batch.emitted += 1;
      if (event.kind === "matchStarted") applyDueAt("matchStarted");
    },
  });

  /** Apply the next inputs while they were recorded at this site and at exactly this point. */
  function applyDueAt(site: ReplaySite): void {
    while (!stopped && cursor < limit) {
      const input = inputs[cursor]!;
      if (!("site" in input) || input.site !== site) return;
      if (input.stateVersion !== state.stateVersion) return;
      if (input.engineEvents !== undefined && input.engineEvents !== emitted) return;
      applyNext();
    }
  }

  function applyNext(): void {
    const index = cursor++;
    const input = inputs[index]!;
    const before = divergences.length;
    const diverge = (divergence: Omit<ReplayDivergence, "index" | "inputKind" | "seat" | "intentType">) =>
      divergences.push({ index, inputKind: input.kind, ...seatAndType(input), ...divergence });
    if (state.stateVersion !== input.stateVersion)
      diverge({
        kind: "state-version",
        expected: input.stateVersion,
        actual: state.stateVersion,
        message: `input #${index} (${describe(input)}): stateVersion ${state.stateVersion}, recorded ${input.stateVersion}`,
      });
    if (input.engineEvents !== undefined && emitted !== input.engineEvents)
      diverge({
        kind: "event-count",
        expected: input.engineEvents,
        actual: emitted,
        message: `input #${index} (${describe(input)}): ${emitted} engine events so far, recorded ${input.engineEvents}`,
      });
    try {
      const outcome = apply(input);
      if (input.kind === "intent" && outcome !== undefined) {
        if (input.threw)
          diverge({
            kind: "threw",
            expected: "threw",
            actual: "returned",
            message: `input #${index} (${describe(input)}): returned, recorded a throw`,
          });
        else if (input.ok !== undefined && outcome.ok !== input.ok) {
          const reason = outcome.ok ? undefined : outcome.reason;
          const recorded = input.ok ? "accepted" : `rejected${input.reason ? ` (${input.reason})` : ""}`;
          const replayed = outcome.ok ? "accepted" : `rejected (${reason})`;
          diverge({
            kind: "intent-result",
            expected: recorded,
            actual: replayed,
            ...(reason ? { reason } : {}),
            message: `input #${index} (${describe(input)}): ${replayed}, recorded ${recorded}`,
          });
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (!(input.kind === "intent" && input.threw))
        diverge({
          kind: "threw",
          expected: "returned",
          actual: "threw",
          reason,
          message: `input #${index} (${describe(input)}): threw ${reason}`,
        });
    }
    if (options.stopOnDivergence && divergences.length > before) stopped = true;
  }

  /** Apply one input through the engine method the room used; returns an intent's outcome. */
  function apply(input: ReplayInput): { ok: true } | { ok: false; reason: string } | undefined {
    switch (input.kind) {
      case "seat":
        // The replay carries no identities; placeholders stand in for the session and the name.
        withBatch(() =>
          engine.seatPlayer(input.seat, `replay-seat-${input.seat}`, {
            displayName: `Seat ${input.seat}`,
            deck: structuredClone(input.deck),
            ...input.deckRules,
          }),
        );
        return undefined;
      case "intent": {
        const result = withBatch(() => engine.applyIntent(input.seat, structuredClone(input.intent)));
        applyDueAt("afterIntent");
        return result;
      }
      case "startMatch":
        startOnce(() => engine.startMatch());
        return undefined;
      case "startDevScenario":
        startOnce(() => engine.startDevScenario(input.scenario));
        return undefined;
      case "disconnect":
        withBatch(() => engine.handleDisconnect(input.seat, input.final));
        return undefined;
      case "reconnect":
        withBatch(() => engine.handleReconnect(input.seat));
        return undefined;
      case "clearReady":
        withBatch(() => engine.clearReady(input.seat));
        return undefined;
      case "expireMatchTimer":
        withBatch(() => engine.expireMatchTimer(input.seat));
        return undefined;
      case "expireCombatWindow":
        withBatch(() => engine.expireCombatWindow());
        return undefined;
    }
  }

  while (!stopped && cursor < limit) {
    await waitForIdle(() => progress);
    if (stopped || cursor >= limit) break;
    const input = inputs[cursor]!;
    if ("site" in input && input.site !== undefined)
      divergences.push({
        index: cursor,
        kind: "position",
        inputKind: input.kind,
        ...seatAndType(input),
        expected: input.site,
        actual: "idle",
        message: `input #${cursor} (${describe(input)}): recorded at ${input.site}, never reached there; applied once idle`,
      });
    applyNext();
  }
  await waitForIdle(() => progress);
  return { engine, state, applied: cursor, divergences };
}

/**
 * Wait until the engine is idle.
 *
 * The engine resolves effects on promise continuations and schedules no timers of its own (the
 * decision timeout is off, as in the room), so one macrotask turn drains all of its pending work.
 * The progress counter (events, decision requests, settled actions) confirms it: the engine is
 * idle once a further full turn passes without any of them.
 */
async function waitForIdle(progress: () => number): Promise<boolean> {
  let last = progress();
  for (let turn = 0; turn < MAX_IDLE_TURNS; turn++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
    const now = progress();
    if (now === last && turn > 0) return true;
    last = now;
  }
  return false;
}

function seatAndType(input: ReplayInput): { seat?: Seat; intentType?: Intent["type"] } {
  if (input.kind === "intent") return { seat: input.seat, intentType: input.intent.type };
  return "seat" in input ? { seat: input.seat } : {};
}

function describe(input: ReplayInput): string {
  if (input.kind === "intent") return `seat ${input.seat} ${input.intent.type}`;
  return "seat" in input ? `${input.kind} seat ${input.seat}` : input.kind;
}
