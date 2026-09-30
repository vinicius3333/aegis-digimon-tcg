/* Pacing metrics over one recording. Pure: everything here reads the recording only.

   Units. A unit is one triggered effect, opened by `effectTriggered` and closed by its
   `effectResolved`, built from the closed batches exactly as the client's own effect
   sequence builds it (match/effectSequence.ts): every event between the two belongs to the
   innermost unit still open.

   Versions. A batch's close revision is the board revision that contains its changes. A
   unit's first result revision is the close revision of its earliest batch that carried a
   result event (anything but bookkeeping); a unit with none is taken to change the board at
   its resolving batch. The screen's board revision is the snapshot `selectPresentedState`
   picks, sampled every frame.

   Chains. Consecutive units form one chain unless a player action (a play, a digivolution,
   an attack, a phase change) happened outside every unit between them, or their server gap
   (next trigger minus previous resolution, not counting time spent waiting on the viewer's
   answer) exceeds `CHAIN_GAP_MS`. Chains shorter than two units are reported as singles. */

import type { SequencedServerEvent, ServerEvent } from "@aegis/shared";
import { isMinorEffect } from "../../src/game/match/effectSequence";
import type { Recording, Sample } from "./runScenario";

export const CHAIN_GAP_MS = 4000;
/** Cited reading rate for on-screen text: BBC subtitles, 180 wpm (REFERENCES.md). */
export const READING_WORDS_PER_SECOND = 3;
/** Time to find the text before reading it; the source glow's beat (REFERENCES.md, takeaway 1). */
export const READING_ORIENT_MS = 360;
/** The words a viewer must get through to know what an effect is: its timing and its verb. */
export const HEADLINE_WORDS = 4;

/** Events that start a new moment of play when no effect is resolving. */
const ACTIONS: ReadonlySet<ServerEvent["kind"]> = new Set([
  "cardPlayed",
  "digivolved",
  "attackDeclared",
  "phaseChanged",
  "turnEnded",
  "hatched",
  "movedFromBreeding",
]);

const BOOKKEEPING: ReadonlySet<ServerEvent["kind"]> = new Set([
  "effectTriggered",
  "effectResolved",
  "batchClosed",
  "resolutionOrderChosen",
  "effectActivated",
  "effectOptionChosen",
]);

export interface UnitFacts {
  index: number;
  seat: number;
  sourceCardId: string;
  description: string;
  words: number;
  minor: boolean;
  openBatchId: string;
  firstResultVersion: number;
  lastVersion: number;
  triggeredAt: number;
  resolvedAt?: number;
  batchIds: string[];
  /** A player action came between this unit and the one before it. */
  afterAction: boolean;
}

export interface UnitMetrics extends UnitFacts {
  narrated: boolean;
  clauseShownAt?: number;
  clauseHiddenAt?: number;
  visibleMs: number;
  aloneMs: number;
  /** Words per second the viewer must read to finish the clause while it is alone. */
  requiredWordsPerSecond?: number;
  firstResultAt?: number;
  resultsEndAt?: number;
  announceToResultMs?: number;
  /** A consequence cue of this unit showed before its clause. */
  resultBeforeCause: boolean;
  /** The cues that did, as `<kind>-<key>@<ms since the run started>`. */
  earlyCues: string[];
  /** Its results reached the board before its clause, while an earlier unit was announced. */
  boardAheadMs: number;
}

export interface ChainMetrics {
  units: UnitMetrics[];
  startAt: number;
  settledAt: number;
  durationMs: number;
  /** Duration less the time a prompt stood open waiting for the viewer's own answer. */
  presentationMs: number;
  maxConcurrentClauses: number;
  resultBeforeCause: number;
  boardAheadUnits: number;
  boardAheadMs: number;
  deadMs: number;
  minorShare: number;
  settleGapsMs: number[];
  announceToResultMs: number[];
}

export interface DecisionMetrics {
  kind: string;
  sourceCardId?: string;
  promptDelayMs?: number;
}

export interface RunMetrics {
  scenario: string;
  pacing: string;
  speed: string;
  timedOut: boolean;
  startedAt: number;
  gateExpiries: readonly string[];
  chains: ChainMetrics[];
  singles: UnitMetrics[];
  decisions: DecisionMetrics[];
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => /\w/.test(word)).length;
}

/** The fewest milliseconds an effect's clause needs, alone on screen, to be read to its verb. */
export function minReadableMs(scale = 1): number {
  return Math.round((READING_ORIENT_MS + (HEADLINE_WORDS / READING_WORDS_PER_SECOND) * 1000) * scale);
}

/** The time to read a clause in full at the cited rate. */
export function fullReadingMs(words: number): number {
  return READING_ORIENT_MS + (words / READING_WORDS_PER_SECOND) * 1000;
}

function sameEffect(unit: Omit<UnitFacts, "index">, event: Extract<ServerEvent, { kind: "effectResolved" }>) {
  return unit.seat === event.seat && unit.sourceCardId === event.sourceCardId;
}

export function buildUnits(recording: Recording): UnitFacts[] {
  const units: (UnitFacts & {
    effectKey: string;
    sourceInstanceId?: string;
    resultKinds: Set<ServerEvent["kind"]>;
    closed: boolean;
  })[] = [];
  const open: typeof units = [];
  let actionSinceLastUnit = true;
  for (const batch of recording.batches) {
    for (const event of batch.events as readonly SequencedServerEvent[]) {
      if (event.kind === "effectTriggered") {
        const unit = {
          index: units.length,
          seat: event.seat,
          sourceCardId: event.sourceCardId,
          effectKey: event.effectKey,
          ...(event.sourceInstanceId ? { sourceInstanceId: event.sourceInstanceId } : {}),
          description: event.description,
          words: wordCount(event.description),
          minor: false,
          openBatchId: batch.id,
          firstResultVersion: Number.POSITIVE_INFINITY,
          lastVersion: batch.stateVersion,
          triggeredAt: batch.receivedAt,
          batchIds: [batch.id],
          afterAction: actionSinceLastUnit,
          resultKinds: new Set<ServerEvent["kind"]>(),
          closed: false,
        };
        units.push(unit);
        open.push(unit);
        actionSinceLastUnit = false;
        continue;
      }
      if (open.length === 0 && ACTIONS.has(event.kind)) actionSinceLastUnit = true;
      if (event.kind === "turnEnded") open.length = 0;
      const carrier = open.at(-1);
      if (carrier) {
        if (!carrier.batchIds.includes(batch.id)) carrier.batchIds.push(batch.id);
        carrier.lastVersion = batch.stateVersion;
        if (!BOOKKEEPING.has(event.kind)) {
          carrier.resultKinds.add(event.kind);
          carrier.firstResultVersion = Math.min(carrier.firstResultVersion, batch.stateVersion);
        }
      }
      if (event.kind !== "effectResolved") continue;
      const matching = open.filter((unit) => unit.effectKey === event.effectKey && sameEffect(unit, event)).at(-1);
      if (!matching) continue;
      open.splice(open.indexOf(matching), 1);
      matching.closed = true;
      matching.resolvedAt = batch.receivedAt;
      matching.lastVersion = batch.stateVersion;
      if (!matching.batchIds.includes(batch.id)) matching.batchIds.push(batch.id);
    }
  }
  return units.map(({ resultKinds, closed, effectKey: _key, sourceInstanceId: _instance, ...unit }) => ({
    ...unit,
    minor: isMinorEffect({ closed, resultKinds }),
    firstResultVersion: Number.isFinite(unit.firstResultVersion) ? unit.firstResultVersion : unit.lastVersion,
  }));
}

/** The unit each clause on screen announces: same opening batch and card, else the first unmatched same card. */
function mapClauses(units: readonly UnitFacts[], samples: readonly Sample[]): Map<string, number> {
  const byItem = new Map<string, number>();
  const taken = new Set<number>();
  for (const sample of samples)
    for (const clause of sample.clauses) {
      if (byItem.has(clause.itemId)) continue;
      const exact = units.find(
        (unit) => !taken.has(unit.index) && unit.openBatchId === clause.batchId && unit.sourceCardId === clause.cardId,
      );
      const loose =
        exact ??
        units.find(
          (unit) => !taken.has(unit.index) && unit.sourceCardId === clause.cardId && unit.triggeredAt <= sample.at,
        );
      if (!loose) continue;
      byItem.set(clause.itemId, loose.index);
      taken.add(loose.index);
    }
  return byItem;
}

const CUE_STEP_PREFIX: Record<string, string[]> = {
  draw: ["draw-flight-"],
  delete: ["delete-burst-"],
  dp: ["dp-pulse-", "suppressed-dp-pulse-"],
  freeze: ["freeze-pulse-"],
  burst: ["burst-"],
  reveal: ["reveal-showcase-"],
  zone: ["zone-change-"],
};
const WATCHER_KINDS = new Set(["dp", "freeze"]);

/** Which unit a keyed consequence cue belongs to, by the batch of the step that drew it. */
function attributeCues(recording: Recording, units: readonly UnitFacts[]): Map<string, number | undefined> {
  const unitOfBatch = new Map<string, number>();
  for (const unit of units) for (const batchId of unit.batchIds) unitOfBatch.set(batchId, unit.index);
  const stepsById = new Map(recording.steps.map((step) => [step.id, step]));
  const attribution = new Map<string, number | undefined>();
  // Every card that reached a hand from a deck, in order, with the unit that moved it (none
  // for a turn's own draw). A watched draw flight takes the next one its board revision covers.
  const draws: { version: number; unit: number | undefined }[] = [];
  const open: number[] = [];
  let opened = 0;
  for (const batch of recording.batches)
    for (const event of batch.events) {
      if (event.kind === "effectTriggered" && units[opened]) open.push(units[opened++]!.index);
      if (event.kind === "effectResolved") {
        const closing = [...open].reverse().find((index) => units[index]!.sourceCardId === event.sourceCardId);
        if (closing !== undefined) open.splice(open.indexOf(closing), 1);
      }
      if (event.kind === "turnEnded") open.length = 0;
      if (event.kind === "cardsMoved" && event.to === "hand" && event.from === "deck")
        draws.push(...event.instanceIds.map(() => ({ version: batch.stateVersion, unit: open.at(-1) })));
    }
  const watchedDrawUnit = (liveVersion: number) => {
    const next = draws.findIndex((draw) => draw.version <= liveVersion);
    if (next < 0) return undefined;
    return draws.splice(next, 1)[0]!.unit;
  };
  let lastWatcherVersion = 0;
  const watcherUnit = (liveVersion: number) => {
    const from = lastWatcherVersion;
    lastWatcherVersion = Math.max(lastWatcherVersion, liveVersion);
    return units.find((unit) => unit.firstResultVersion > from && unit.firstResultVersion <= liveVersion)?.index;
  };
  for (const sample of recording.samples)
    for (const cue of sample.cues) {
      if (attribution.has(cue)) continue;
      const [kind, key] = [cue.slice(0, cue.indexOf("-")), cue.slice(cue.indexOf("-") + 1)];
      const step = (CUE_STEP_PREFIX[kind] ?? []).map((prefix) => stepsById.get(`${prefix}${key}`)).find(Boolean);
      if (!step) {
        attribution.set(cue, undefined);
        continue;
      }
      if (kind === "draw" && !step.fromBatch) attribution.set(cue, watchedDrawUnit(step.liveVersionAtQueue));
      else if (WATCHER_KINDS.has(kind) || !step.fromBatch) attribution.set(cue, watcherUnit(step.liveVersionAtQueue));
      else attribution.set(cue, step.batchId === undefined ? undefined : unitOfBatch.get(step.batchId));
    }
  return attribution;
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export { median };

function groupChains(recording: Recording, units: readonly UnitFacts[]): UnitFacts[][] {
  const waits = recording.decisions.flatMap((decision) =>
    decision.answeredAt !== undefined ? [[decision.arrivedAt, decision.answeredAt] as const] : [],
  );
  const waited = (from: number, to: number) =>
    waits.reduce((total, [start, end]) => total + Math.max(0, Math.min(end, to) - Math.max(start, from)), 0);
  const chains: UnitFacts[][] = [];
  for (const unit of units) {
    const chain = chains.at(-1);
    const previous = chain?.at(-1);
    const end = previous?.resolvedAt ?? previous?.triggeredAt;
    if (
      chain &&
      !unit.afterAction &&
      end !== undefined &&
      unit.triggeredAt - end - waited(end, unit.triggeredAt) <= CHAIN_GAP_MS
    ) {
      chain.push(unit);
    } else chains.push([unit]);
  }
  return chains;
}

export function measure(recording: Recording): RunMetrics {
  const units = buildUnits(recording);
  const samples = recording.samples;
  const clauseUnit = mapClauses(units, samples);
  const cueUnit = attributeCues(recording, units);
  const frame = samples.length > 1 ? samples[1]!.at - samples[0]!.at : 16;

  const perUnit: UnitMetrics[] = units.map((unit) => ({
    ...unit,
    narrated: false,
    visibleMs: 0,
    aloneMs: 0,
    resultBeforeCause: false,
    earlyCues: [],
    boardAheadMs: 0,
  }));
  const cueEndAt = new Map<number, number>();
  const boardDoneAt = new Map<number, number>();
  for (const sample of samples) {
    const shown = sample.clauses.map((clause) => clauseUnit.get(clause.itemId)).filter((index) => index !== undefined);
    for (const index of shown) {
      const unit = perUnit[index]!;
      unit.narrated = true;
      unit.clauseShownAt ??= sample.at;
      unit.clauseHiddenAt = sample.at + frame;
      unit.visibleMs += frame;
      if (shown.length === 1) unit.aloneMs += frame;
    }
    for (const cue of sample.cues) {
      const index = cueUnit.get(cue);
      if (index === undefined) continue;
      const unit = perUnit[index]!;
      unit.firstResultAt = Math.min(unit.firstResultAt ?? Infinity, sample.at);
      cueEndAt.set(index, sample.at + frame);
      if (unit.clauseShownAt === undefined && !unit.earlyCues.some((early) => early.startsWith(`${cue}@`))) {
        unit.resultBeforeCause = true;
        unit.earlyCues.push(`${cue}@${sample.at - recording.startedAt}`);
      }
    }
    for (const unit of perUnit) {
      if (sample.displayedVersion >= unit.firstResultVersion)
        unit.firstResultAt = Math.min(unit.firstResultAt ?? Infinity, sample.at);
      if (sample.displayedVersion >= unit.lastVersion && !boardDoneAt.has(unit.index))
        boardDoneAt.set(unit.index, sample.at);
    }
  }
  for (const unit of perUnit) {
    const ends = [cueEndAt.get(unit.index), boardDoneAt.get(unit.index)].filter((at) => at !== undefined);
    if (ends.length > 0) unit.resultsEndAt = Math.max(...ends);
    if (unit.clauseShownAt !== undefined && unit.firstResultAt !== undefined && Number.isFinite(unit.firstResultAt))
      unit.announceToResultMs = unit.firstResultAt - unit.clauseShownAt;
    if (unit.aloneMs > 0) unit.requiredWordsPerSecond = unit.words / (unit.aloneMs / 1000);
    if (unit.firstResultAt === Infinity) delete unit.firstResultAt;
  }

  const chains: ChainMetrics[] = [];
  const singles: UnitMetrics[] = [];
  for (const group of groupChains(recording, units)) {
    const chainUnits = group.map((unit) => perUnit[unit.index]!);
    if (chainUnits.length < 2) {
      singles.push(...chainUnits);
      continue;
    }
    chains.push(chainMetrics(chainUnits, recording));
  }

  return {
    scenario: recording.scenario,
    pacing: recording.pacing,
    speed: recording.speed,
    timedOut: recording.timedOut,
    startedAt: recording.startedAt,
    gateExpiries: recording.gateExpiries,
    chains,
    singles,
    decisions: recording.decisions.map((decision) => ({
      kind: decision.kind,
      ...(decision.sourceCardId ? { sourceCardId: decision.sourceCardId } : {}),
      ...(decision.visibleAt !== undefined ? { promptDelayMs: decision.visibleAt - decision.arrivedAt } : {}),
    })),
  };
}

function chainMetrics(units: UnitMetrics[], recording: Recording): ChainMetrics {
  const samples = recording.samples;
  const frame = samples.length > 1 ? samples[1]!.at - samples[0]!.at : 16;
  const narrated = units.filter((unit) => unit.clauseShownAt !== undefined);
  const firstMarks = units.flatMap((unit) => [unit.clauseShownAt, unit.firstResultAt]).filter((at) => at !== undefined);
  const startAt = Math.min(...firstMarks, units[0]!.triggeredAt);
  const lastShown = Math.max(...narrated.map((unit) => unit.clauseShownAt!), startAt);
  const lastVersion = Math.max(...units.map((unit) => unit.lastVersion));
  const settled = samples.find(
    (sample) =>
      sample.at >= lastShown &&
      sample.at >= (units.at(-1)!.resolvedAt ?? 0) &&
      sample.queueIdle &&
      sample.cues.length === 0 &&
      sample.displayedVersion >= lastVersion,
  );
  const settledAt = settled?.at ?? samples.at(-1)!.at;
  const window = samples.filter((sample) => sample.at >= startAt && sample.at <= settledAt);

  const promptOpenMs = window.filter((sample) => sample.promptVisible).length * frame;
  const maxConcurrentClauses = Math.max(0, ...window.map((sample) => sample.clauses.length));

  let boardAheadMs = 0;
  const boardAheadUnits = new Set<number>();
  let deadMs = 0;
  for (const sample of window) {
    const announcedEarlier = units.some((unit) => unit.clauseShownAt !== undefined && unit.clauseShownAt <= sample.at);
    let ahead = false;
    for (const unit of units) {
      if (unit.clauseShownAt === undefined || unit.clauseShownAt <= sample.at) continue;
      if (!announcedEarlier || sample.displayedVersion < unit.firstResultVersion) continue;
      ahead = true;
      boardAheadUnits.add(unit.index);
      unit.boardAheadMs += frame;
    }
    if (ahead) boardAheadMs += frame;
    const unannounced = units.some((unit) => unit.narrated && (unit.clauseShownAt ?? Infinity) > sample.at);
    const freshClause = units.some(
      (unit) =>
        unit.clauseShownAt !== undefined && sample.at - unit.clauseShownAt < 1000 && sample.at >= unit.clauseShownAt,
    );
    const busy =
      sample.litSources.length > 0 || sample.cues.length > 0 || sample.promptVisible || sample.banner || freshClause;
    if (unannounced && !busy) deadMs += frame;
  }

  const settleGapsMs: number[] = [];
  for (const [position, unit] of narrated.entries()) {
    const next = narrated[position + 1];
    if (!next || unit.clauseShownAt === undefined) continue;
    const end = Math.max(unit.resultsEndAt ?? unit.clauseShownAt, unit.clauseShownAt);
    settleGapsMs.push(next.clauseShownAt! - end);
  }

  return {
    units,
    startAt,
    settledAt,
    durationMs: settledAt - startAt,
    presentationMs: settledAt - startAt - promptOpenMs,
    maxConcurrentClauses,
    resultBeforeCause: units.filter((unit) => unit.resultBeforeCause).length,
    boardAheadUnits: boardAheadUnits.size,
    boardAheadMs,
    deadMs,
    minorShare: units.filter((unit) => unit.minor).length / units.length,
    settleGapsMs,
    announceToResultMs: units.flatMap((unit) =>
      unit.announceToResultMs !== undefined ? [unit.announceToResultMs] : [],
    ),
  };
}
