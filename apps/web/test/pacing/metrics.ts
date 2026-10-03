/* Pacing metrics over one recording. Pure: everything here reads the recording only.

   Units. A unit is one triggered effect, opened by `effectTriggered` and closed by its
   `effectResolved`, built from the closed batches exactly as the client's own effect
   sequence builds it (match/effectSequence.ts): every event between the two belongs to the
   innermost unit still open.

   Results. Public results are measured against the screen's visible projection: exact field
   identities, pile membership/counts, rotations and readouts after presentation holds.
   A batch's close revision qualifies the authoritative state; a selected revision alone
   cannot prove that a held Security play has appeared. Results without public identities
   retain the selected revision check. Exact printed source costs instead require prior focus.

   Chains. Consecutive units form one chain unless a player action (a play, a digivolution,
   an attack, a phase change) happened outside every unit between them, or their server gap
   (next trigger minus previous resolution, not counting time spent waiting on the viewer's
   answer) exceeds `CHAIN_GAP_MS`. Chains shorter than two units are reported as singles. */

import { Zone, type SequencedServerEvent, type ServerEvent } from "@aegis/shared";
import { isMinorEffect } from "../../src/game/match/effectSequence";
import { costClauseFromEvent } from "../../src/game/match/present/costClause";
import type { Recording, Sample } from "./runScenario";
import type { PresentationCounters } from "../../src/game/presentationTelemetry";

export const CHAIN_GAP_MS = 4000;
/** Cited reading rate for on-screen text: BBC subtitles, 180 wpm (REFERENCES.md). */
export const READING_WORDS_PER_SECOND = 3;
/** Time to find the text before reading it; the source glow's beat (REFERENCES.md, takeaway 1). */
export const READING_ORIENT_MS = 360;
/** The words a viewer must get through to know what an effect is: its timing and its verb. */
export const HEADLINE_WORDS = 4;
/** Printed payment wording; merely being optional never makes a suspension a cost. */
const SOURCE_SUSPENSION_COST =
  /\b(?:by suspending this (?:Tamer|Digimon)|(?:you )?may suspend this (?:Tamer|Digimon) to)\b/i;

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
  effectKey: string;
  sourceInstanceId?: string;
  costSourcePermanentId?: string;
  costKind?: "delayDeparture" | "sourceSuspension";
  description: string;
  words: number;
  minor: boolean;
  openBatchId: string;
  firstResultVersion: number;
  lastVersion: number;
  triggeredAt: number;
  resolvedAt?: number;
  batchIds: string[];
  /** Results owned by this exact effect, excluding its source's own printed activation cost. */
  resultEvents: {
    event: ServerEvent;
    version: number;
    receivedAt: number;
    /** Exact destination count of this batch, rather than growth from an older visible frame. */
    targetHandCount?: number;
    /** A play from the same batch supplies the newly created destination identity. */
    arrivalPermanentIds?: readonly string[];
  }[];
  costEvents: { event: ServerEvent; version: number; receivedAt: number }[];
  /** Exact public DP changes in a batch owned by this effect, with unchanged top instance. */
  dpResults: { permanentId: string; from: number; to: number; version: number; receivedAt: number }[];
  /** A player action came between this unit and the one before it. */
  afterAction: boolean;
  declined: boolean;
}

export interface UnitMetrics extends UnitFacts {
  narrated: boolean;
  clauseShownAt?: number;
  clauseHiddenAt?: number;
  visibleMs: number;
  /** Time the clause was the only active clause on screen. */
  aloneMs: number;
  /** Time the clause stayed on screen dimmed under a later one. */
  dimmedMs: number;
  /** Time an open decision rail printed this effect's clause for the viewer. */
  railMs: number;
  /** Time the clause could be read: alone while active, dimmed in the stack, or on its own rail. */
  readableMs: number;
  /** Still on screen when the recording ended, so its readable time is cut short by the run. */
  shownAtEnd: boolean;
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
  costBeforeFocus: boolean;
}

export interface ChainMetrics {
  units: UnitMetrics[];
  startAt: number;
  settledAt: number;
  durationMs: number;
  /** Duration less the time a prompt stood open waiting for the viewer's own answer. */
  presentationMs: number;
  maxConcurrentClauses: number;
  /** Most clauses on screen at once that no later clause had dimmed. */
  maxActiveClauses: number;
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
  sourceInstanceId?: string;
  effectKey?: string;
  activationConfirmation?: boolean;
  promptDelayMs?: number;
  /** When the decision reached the client, opened and was answered (ms since the run started). */
  arrivedAtMs: number;
  visibleAtMs?: number;
  answeredAtMs?: number;
  /** From the viewer's answer to the first thing it changed on screen (a cue or the board). */
  answerToResultMs?: number;
}

function answerToResultMs(samples: readonly Sample[], answeredAt: number): number | undefined {
  const index = samples.findIndex((sample) => sample.at >= answeredAt);
  const before = samples[index];
  if (!before) return undefined;
  const changed = samples
    .slice(index + 1)
    .find(
      (sample) =>
        sample.displayedVersion > before.displayedVersion || sample.cues.some((cue) => !before.cues.includes(cue)),
    );
  return changed ? changed.at - answeredAt : undefined;
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
  counters: PresentationCounters;
  pendingSteps: number;
  failedSteps: string[];
  droppedSteps: string[];
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
  return (
    unit.seat === event.seat &&
    unit.sourceCardId === event.sourceCardId &&
    (event.sourceInstanceId === undefined || unit.sourceInstanceId === event.sourceInstanceId)
  );
}

export function buildUnits(recording: Recording): UnitFacts[] {
  const units: (UnitFacts & {
    effectKey: string;
    sourceInstanceId?: string;
    resultKinds: Set<ServerEvent["kind"]>;
    closed: boolean;
  })[] = [];
  const open: typeof units = [];
  const dpBatchOwners = new Map<string, Set<number>>();
  const noteBatchOwner = (batchId: string, index: number) => {
    const owners = dpBatchOwners.get(batchId) ?? new Set<number>();
    owners.add(index);
    dpBatchOwners.set(batchId, owners);
  };
  let actionSinceLastUnit = true;
  for (const batch of recording.batches) {
    for (const event of batch.events as readonly SequencedServerEvent[]) {
      if (event.kind === "effectTriggered") {
        const delayCost = costClauseFromEvent(event);
        const suspensionCost = SOURCE_SUSPENSION_COST.test(event.description) && event.sourcePermanentId !== undefined;
        const unit = {
          index: units.length,
          seat: event.seat,
          sourceCardId: event.sourceCardId,
          effectKey: event.effectKey,
          costSourcePermanentId: delayCost?.permanentId ?? (suspensionCost ? event.sourcePermanentId : undefined),
          costKind: delayCost
            ? ("delayDeparture" as const)
            : suspensionCost
              ? ("sourceSuspension" as const)
              : undefined,
          ...(event.sourceInstanceId ? { sourceInstanceId: event.sourceInstanceId } : {}),
          description: event.description,
          words: wordCount(event.description),
          minor: false,
          openBatchId: batch.id,
          firstResultVersion: Number.POSITIVE_INFINITY,
          lastVersion: batch.stateVersion,
          triggeredAt: batch.receivedAt,
          batchIds: [batch.id],
          resultEvents: [] as UnitFacts["resultEvents"],
          costEvents: [] as UnitFacts["costEvents"],
          dpResults: [] as UnitFacts["dpResults"],
          afterAction: actionSinceLastUnit,
          declined: false,
          resultKinds: new Set<ServerEvent["kind"]>(),
          closed: false,
        };
        units.push(unit);
        open.push(unit);
        noteBatchOwner(batch.id, unit.index);
        actionSinceLastUnit = false;
        continue;
      }
      if (open.length === 0 && ACTIONS.has(event.kind)) actionSinceLastUnit = true;
      if (event.kind === "turnEnded") open.length = 0;
      const carrier = open.at(-1);
      if (carrier) {
        noteBatchOwner(batch.id, carrier.index);
        if (!carrier.batchIds.includes(batch.id)) carrier.batchIds.push(batch.id);
        carrier.lastVersion = batch.stateVersion;
        if (isOwnActivationCost(carrier, event))
          carrier.costEvents.push({ event, version: batch.stateVersion, receivedAt: batch.receivedAt });
        else if (!BOOKKEEPING.has(event.kind)) {
          const count = recording.handCountSnapshots?.find((snapshot) => snapshot.stateVersion === batch.stateVersion);
          const targetHandCount =
            event.kind === "cardsMoved" && event.to === Zone.Hand && event.seat !== undefined
              ? count?.counts[event.seat]
              : undefined;
          const arrivalPermanentIds =
            event.kind === "cardsMoved" && event.to === Zone.BattleArea && !event.placedUnder
              ? batch.events.flatMap((played) =>
                  played.kind === "cardPlayed" &&
                  played.instanceId !== undefined &&
                  played.permanentId !== undefined &&
                  event.instanceIds.includes(played.instanceId)
                    ? [played.permanentId]
                    : [],
                )
              : [];
          carrier.resultEvents.push({
            event,
            version: batch.stateVersion,
            receivedAt: batch.receivedAt,
            ...(targetHandCount === undefined ? {} : { targetHandCount }),
            ...(arrivalPermanentIds.length === 0 ? {} : { arrivalPermanentIds }),
          });
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
  for (const batch of recording.batches) {
    const owners = dpBatchOwners.get(batch.id);
    const owner = owners?.values().next().value;
    if (owner === undefined) continue;
    const after = recording.dpSnapshots?.find((snapshot) => snapshot.stateVersion === batch.stateVersion);
    const before = recording.dpSnapshots?.findLast((snapshot) => snapshot.stateVersion < batch.stateVersion);
    if (!after || !before) continue;
    for (const permanent of after.permanents) {
      const prior = before.permanents.find((candidate) => candidate.permanentId === permanent.permanentId);
      // A newly played/evolved top has its own arrival metric; this covers an existing
      // printed DP readout changing while that same physical card remains in place.
      if (!prior || prior.topInstanceId !== permanent.topInstanceId || prior.currentDP === permanent.currentDP)
        continue;
      // An aggregate patch cannot identify which of several effects changed this readout.
      // Picking the first would let its earlier clause hide a later effect's premature DP.
      if (owners!.size !== 1) {
        const effects = [...owners!].map((index) => {
          const unit = units[index]!;
          return `${unit.seat}:${unit.sourceCardId}:${unit.effectKey}:${unit.sourceInstanceId ?? "unknown-source"}`;
        });
        throw new Error(
          `Ambiguous DP result: batch=${batch.id} version=${batch.stateVersion} permanent=${permanent.permanentId} effects=${effects.join(",")}`,
        );
      }
      units[owner]!.dpResults.push({
        permanentId: permanent.permanentId,
        from: prior.currentDP,
        to: permanent.currentDP,
        version: batch.stateVersion,
        receivedAt: batch.receivedAt,
      });
      units[owner]!.resultKinds.add("dpModifierApplied");
      units[owner]!.firstResultVersion = Math.min(units[owner]!.firstResultVersion, batch.stateVersion);
    }
  }
  return units.map(({ resultKinds, closed, ...unit }) => ({
    ...unit,
    // Declining an optional sub-action after a mandatory result still needs narration.
    declined:
      resultKinds.size === 0 &&
      recording.decisions.some(
        (decision) =>
          decision.optionalAccepted === false &&
          decision.sourceCardId === unit.sourceCardId &&
          decision.arrivedAt >= unit.triggeredAt &&
          decision.arrivedAt <= (unit.resolvedAt ?? Infinity),
      ),
    minor: isMinorEffect({ closed, resultKinds }),
    firstResultVersion: Number.isFinite(unit.firstResultVersion) ? unit.firstResultVersion : unit.lastVersion,
  }));
}

/** Exact physical source costs are pre-clause after focus. Trashing another Option,
 * deleting a victim or suspending another permanent remains a consequence. */
function isOwnActivationCost(
  unit: Pick<UnitFacts, "costSourcePermanentId" | "costKind" | "sourceInstanceId">,
  event: ServerEvent,
): boolean {
  if (unit.costSourcePermanentId === undefined || event.kind !== "cardsMoved") return false;
  if (unit.costKind === "sourceSuspension")
    return (
      event.from === "unsuspended" &&
      event.to === "suspended" &&
      event.instanceIds.length > 0 &&
      event.instanceIds.every((id) => id === unit.costSourcePermanentId)
    );
  return (
    unit.costKind === "delayDeparture" &&
    (event.from === Zone.BattleArea || event.from === "various") &&
    event.to === Zone.Trash &&
    event.instanceIds.length > 0 &&
    event.instanceIds.every((id) => id === unit.sourceInstanceId) &&
    event.trashedPermanents?.some((permanent) => permanent.permanentId === unit.costSourcePermanentId) === true
  );
}

/** A snapshot revision can advance while the rendered field still holds a reveal or flight.
 * For public movements, compare the physical result with the projection the screen renders.
 * Results without a public identity retain the revision check rather than disappearing from
 * measurement. Animations are also measured separately through their owned cue keys. */
function boardResultVisible(
  unit: UnitFacts,
  sample: Sample,
  beforeBoards: ReadonlyMap<number, Sample["visibleBoard"]>,
): boolean {
  const board = sample.visibleBoard;
  if (!board || (unit.resultEvents.length === 0 && unit.dpResults.length === 0))
    return sample.displayedVersion >= unit.firstResultVersion;
  const printedDP = unit.dpResults.some(
    (change) =>
      sample.at >= change.receivedAt &&
      sample.liveVersion >= change.version &&
      board.players.some((player) =>
        player.battleArea.some(
          (permanent) => permanent.permanentId === change.permanentId && permanent.currentDP === change.to,
        ),
      ),
  );
  return (
    printedDP ||
    unit.resultEvents.some(({ event, version, receivedAt, targetHandCount, arrivalPermanentIds }) => {
      if (sample.at < receivedAt || sample.liveVersion < version) return false;
      const previous = beforeBoards.get(receivedAt);
      const permanents = board.players.flatMap((player) => [
        ...player.battleArea,
        ...(player.breeding ? [player.breeding] : []),
      ]);
      const beforePermanents = previous?.players.flatMap((player) => [
        ...player.battleArea,
        ...(player.breeding ? [player.breeding] : []),
      ]);
      switch (event.kind) {
        case "cardPlayed":
          return event.permanentId
            ? board.players[event.seat].battleArea.some((permanent) => permanent.permanentId === event.permanentId)
            : sample.displayedVersion >= version;
        case "digivolved":
        case "hatched":
        case "movedFromBreeding":
          return permanents.some(
            (permanent) => permanent.permanentId === event.permanentId && permanent.topCard.cardId === event.cardId,
          );
        case "memoryChanged":
          return (
            event.from !== event.to &&
            board.memory.value === event.to &&
            (previous === undefined ? sample.displayedVersion >= version : previous.memory.value !== event.to)
          );
        case "cardsMoved": {
          const owner = event.seat;
          const player = owner === undefined ? undefined : board.players[owner];
          const before = owner === undefined ? undefined : previous?.players[owner];
          if (
            (event.from === "unsuspended" && event.to === "suspended") ||
            (event.from === "suspended" && event.to === "unsuspended")
          ) {
            const suspended = event.to === "suspended";
            return event.instanceIds.some((id) => {
              const shown = permanents.find((permanent) => permanent.permanentId === id);
              const prior = beforePermanents?.find((permanent) => permanent.permanentId === id);
              return (
                shown !== undefined &&
                shown.isSuspended === suspended &&
                (prior === undefined ? sample.displayedVersion >= version : prior.isSuspended !== suspended)
              );
            });
          }
          if (event.to === Zone.BattleArea) {
            if (arrivalPermanentIds)
              return permanents.some(
                (permanent) =>
                  arrivalPermanentIds.includes(permanent.permanentId) &&
                  event.instanceIds.includes(permanent.topCard.instanceId),
              );
            const cards = (permanent: (typeof permanents)[number]) =>
              event.placedUnder
                ? permanent.permanentId === event.placedUnder.permanentId
                  ? [...permanent.stack]
                  : []
                : [permanent.topCard];
            return permanents.some((permanent) =>
              cards(permanent).some(
                (card) =>
                  event.instanceIds.includes(card.instanceId) &&
                  !beforePermanents?.some((before) =>
                    cards(before).some((prior) => prior.instanceId === card.instanceId),
                  ),
              ),
            );
          }
          if (
            event.to === Zone.Trash &&
            board.players.some((seat) =>
              seat.trash.some(
                (card) =>
                  event.instanceIds.includes(card.instanceId) &&
                  !previous?.players.some((prior) =>
                    prior.trash.some((before) => before.instanceId === card.instanceId),
                  ),
              ),
            )
          )
            return true;
          const departed = [
            ...(event.deletedPermanents ?? []),
            ...(event.returnedPermanents ?? []),
            ...(event.trashedPermanents ?? []),
          ];
          if (departed.length > 0)
            return departed.some(
              (permanent) =>
                !permanents.some((shown) => shown.permanentId === permanent.permanentId) &&
                (beforePermanents === undefined ||
                  beforePermanents.some((before) => before.permanentId === permanent.permanentId)),
            );
          if (event.strippedStackTops || event.trashedSources) {
            const host = event.strippedStackTops?.permanentId ?? event.trashedSources!.permanentId;
            const permanent = permanents.find((entry) => entry.permanentId === host);
            return (
              permanent !== undefined &&
              event.instanceIds.some(
                (id) => ![permanent.topCard, ...permanent.stack].some((card) => card.instanceId === id),
              )
            );
          }
          if (event.to === Zone.Hand && player) {
            if (player.hand.some((card) => event.instanceIds.includes(card.instanceId))) return true;
            // A turn draw or an earlier effect may have raised the count after both result
            // batches reached the socket. It cannot stand in for this later draw's target.
            if (targetHandCount !== undefined)
              return (
                player.handCount >= targetHandCount &&
                (before === undefined ? sample.displayedVersion >= version : targetHandCount > before.handCount)
              );
            if (before && player.handCount > before.handCount) return true;
            return false;
          }
          if (event.from === Zone.Hand && player && before) {
            return (
              before.hand.some((card) => event.instanceIds.includes(card.instanceId)) &&
              event.instanceIds.some((id) => !player.hand.some((card) => card.instanceId === id))
            );
          }
          if (event.from === Zone.Security && player && before) return player.securityCount < before.securityCount;
          return sample.displayedVersion >= version;
        }
        case "securityRecovered":
          return (
            previous !== undefined &&
            board.players[event.seat].securityCount > previous.players[event.seat].securityCount
          );
        case "dpModifierApplied": // Protection kept the printed DP unchanged; its pulse is measured as a cue.
        case "cardRevealed":
        case "securityRevealed":
        case "deckShuffled":
          return false;
        default:
          return sample.displayedVersion >= version;
      }
    })
  );
}

/** The unit each clause on screen announces: same opening batch and card, else the first unmatched same card. */
function mapClauses(units: readonly UnitFacts[], samples: readonly Sample[]): Map<string, number> {
  const byItem = new Map<string, number>();
  const taken = new Set<number>();
  for (const sample of samples)
    for (const clause of sample.clauses) {
      if (byItem.has(clause.itemId)) continue;
      const exact = units.find(
        (unit) =>
          !taken.has(unit.index) &&
          unit.openBatchId === clause.batchId &&
          unit.sourceCardId === clause.cardId &&
          (clause.sourceInstanceId === undefined || unit.sourceInstanceId === clause.sourceInstanceId),
      );
      const loose =
        exact ??
        units.find(
          (unit) =>
            !taken.has(unit.index) &&
            unit.sourceCardId === clause.cardId &&
            unit.triggeredAt <= sample.at &&
            (clause.sourceInstanceId === undefined || unit.sourceInstanceId === clause.sourceInstanceId),
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
function attributeCues(
  recording: Recording,
  units: readonly UnitFacts[],
  costCues: Map<string, number>,
): Map<string, number | undefined> {
  /* A batch's cues are the result of the unit open at its first result event. A batch that
     opens with a play or a digivolution while no unit is open (an effect's own digivolution,
     which the server reports after closing that effect) carries the cause of the trigger it
     then opens, not its result. */
  const unitOfBatch = new Map<string, number | undefined>();
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
        const closing = [...open]
          .reverse()
          .find((index) => units[index]!.effectKey === event.effectKey && sameEffect(units[index]!, event));
        if (closing !== undefined) open.splice(open.indexOf(closing), 1);
      }
      if (event.kind === "turnEnded") open.length = 0;
      if (!BOOKKEEPING.has(event.kind) && !unitOfBatch.has(batch.id)) {
        if (open.length > 0) unitOfBatch.set(batch.id, open.at(-1));
        else if (ACTIONS.has(event.kind)) unitOfBatch.set(batch.id, undefined);
      }
      if (event.kind === "cardsMoved" && event.to === "hand" && event.from === "deck")
        draws.push(...event.instanceIds.map(() => ({ version: batch.stateVersion, unit: open.at(-1) })));
    }
  const unitOfBatchId = (batchId: string) =>
    unitOfBatch.has(batchId) ? unitOfBatch.get(batchId) : units.find((unit) => unit.batchIds.includes(batchId))?.index;
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
      const costIndex = step.batchId === undefined ? undefined : unitOfBatchId(step.batchId);
      const costBatch = recording.batches.find((batch) => batch.id === step.batchId);
      if (kind === "delete" && costIndex !== undefined && costBatch) {
        const results = costBatch.events.filter((event) => !BOOKKEEPING.has(event.kind));
        if (results.length > 0 && results.every((event) => isOwnActivationCost(units[costIndex]!, event))) {
          costCues.set(cue, costIndex);
          attribution.set(cue, undefined);
          continue;
        }
      }
      if (kind === "draw" && !step.fromBatch) attribution.set(cue, watchedDrawUnit(step.liveVersionAtQueue));
      // An arrival's burst is queued by its zone change when that runs, and carries its batch.
      else if (kind === "burst" && step.batchId !== undefined) attribution.set(cue, unitOfBatchId(step.batchId));
      else if (WATCHER_KINDS.has(kind) || !step.fromBatch) attribution.set(cue, watcherUnit(step.liveVersionAtQueue));
      else attribution.set(cue, step.batchId === undefined ? undefined : unitOfBatchId(step.batchId));
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
  const costCues = new Map<string, number>();
  const cueUnit = attributeCues(recording, units, costCues);
  const frame = samples.length > 1 ? samples[1]!.at - samples[0]!.at : 16;

  const perUnit: UnitMetrics[] = units.map((unit) => ({
    ...unit,
    narrated: false,
    visibleMs: 0,
    aloneMs: 0,
    dimmedMs: 0,
    railMs: 0,
    readableMs: 0,
    shownAtEnd: false,
    resultBeforeCause: false,
    earlyCues: [],
    boardAheadMs: 0,
    costBeforeFocus: false,
  }));
  // An effect repeated right after itself is announced once by the client ("×N"): its
  // copies share the first copy's clause.
  const announcedUnits = new Set(clauseUnit.values());
  const membersOf = new Map<number, number[]>();
  for (const unit of units) {
    if (announcedUnits.has(unit.index)) continue;
    const previous = units[unit.index - 1];
    const leader =
      previous &&
      (membersOf.has(previous.index)
        ? previous.index
        : [...membersOf].find(([, members]) => members.includes(previous.index))?.[0]);
    const identical =
      previous !== undefined &&
      previous.seat === unit.seat &&
      previous.sourceCardId === unit.sourceCardId &&
      previous.description === unit.description;
    if (!identical) continue;
    const head = leader ?? previous.index;
    if (!announcedUnits.has(head)) continue;
    membersOf.set(head, [...(membersOf.get(head) ?? []), unit.index]);
  }
  const cueEndAt = new Map<number, number>();
  const boardDoneAt = new Map<number, number>();
  const boardResultAt = new Map<number, number>();
  const beforeBoards = new Map<number, Sample["visibleBoard"]>();
  for (const unit of units)
    for (const result of [...unit.resultEvents, ...unit.costEvents])
      if (!beforeBoards.has(result.receivedAt))
        beforeBoards.set(
          result.receivedAt,
          samples.findLast((sample) => sample.at < result.receivedAt && sample.visibleBoard)?.visibleBoard,
        );
  const focusedPermanents = new Map<string, number>();
  for (const sample of samples) {
    for (const id of sample.focusedPermanentIds) focusedPermanents.set(id, sample.at);
    // The same words on a prompt and its toast do not give the viewer twice as much time.
    const readableThisFrame = new Set<number>();
    const mapped = sample.clauses.flatMap((clause) => {
      const index = clauseUnit.get(clause.itemId);
      return index === undefined ? [] : [{ index, active: clause.active, cardId: clause.cardId }];
    });
    // Beside an open decision rail a desktop board shows only the prompt's own clause.
    const heads = sample.promptVisible
      ? mapped.filter((head) => head.cardId === sample.promptSourceCardId).slice(-1)
      : mapped;
    if (sample.promptSourceCardId !== undefined) {
      const asking = perUnit
        .filter((unit) => unit.sourceCardId === sample.promptSourceCardId && unit.triggeredAt <= sample.at)
        .at(-1);
      if (asking) {
        asking.railMs += frame;
        readableThisFrame.add(asking.index);
      }
    }
    const activeHeads = heads.filter((head) => head.active).length;
    for (const head of heads)
      for (const index of [head.index, ...(membersOf.get(head.index) ?? [])]) {
        const unit = perUnit[index]!;
        unit.narrated = true;
        unit.clauseShownAt ??= sample.at;
        unit.clauseHiddenAt = sample.at + frame;
        unit.visibleMs += frame;
        if (!head.active) {
          unit.dimmedMs += frame;
          readableThisFrame.add(index);
        } else if (activeHeads === 1) {
          unit.aloneMs += frame;
          readableThisFrame.add(index);
        }
      }
    for (const index of readableThisFrame) perUnit[index]!.readableMs += frame;
    for (const cue of sample.cues) {
      const costIndex = costCues.get(cue);
      if (costIndex !== undefined) {
        const unit = perUnit[costIndex]!;
        const focused = (focusedPermanents.get(unit.costSourcePermanentId!) ?? -Infinity) >= unit.triggeredAt;
        unit.costBeforeFocus ||= !focused;
        continue;
      }
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
      if (
        sample.visibleBoard &&
        unit.costEvents.length > 0 &&
        boardResultVisible({ ...unit, resultEvents: unit.costEvents, dpResults: [] }, sample, beforeBoards)
      )
        unit.costBeforeFocus ||= (focusedPermanents.get(unit.costSourcePermanentId!) ?? -Infinity) < unit.triggeredAt;
      if (boardResultVisible(unit, sample, beforeBoards)) {
        unit.firstResultAt = Math.min(unit.firstResultAt ?? Infinity, sample.at);
        if (!boardResultAt.has(unit.index)) boardResultAt.set(unit.index, sample.at);
      }
      if (sample.displayedVersion >= unit.lastVersion && !boardDoneAt.has(unit.index))
        boardDoneAt.set(unit.index, sample.at);
    }
  }
  const lastSampleAt = samples.at(-1)?.at;
  for (const unit of perUnit) {
    unit.shownAtEnd =
      unit.clauseHiddenAt !== undefined && lastSampleAt !== undefined && unit.clauseHiddenAt > lastSampleAt;
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
    chains.push(chainMetrics(chainUnits, recording, boardResultAt));
  }
  // A chain has settled at the latest when the next effect, in any chain, starts on screen.
  for (const chain of chains) {
    const last = Math.max(...chain.units.map((unit) => unit.index));
    const nextStart = Math.min(
      ...perUnit
        .filter((unit) => unit.index > last)
        .flatMap((unit) => [unit.clauseShownAt, unit.firstResultAt].filter((at) => at !== undefined)),
    );
    if (!Number.isFinite(nextStart) || nextStart >= chain.settledAt || nextStart <= chain.startAt) continue;
    const trimmed = chain.settledAt - nextStart;
    chain.settledAt = nextStart;
    chain.durationMs -= trimmed;
    chain.presentationMs -= trimmed;
  }

  return {
    scenario: recording.scenario,
    pacing: recording.pacing,
    speed: recording.speed,
    timedOut: recording.timedOut,
    startedAt: recording.startedAt,
    gateExpiries: recording.gateExpiries,
    counters: recording.counters,
    pendingSteps: recording.pendingSteps,
    failedSteps: recording.steps.filter((step) => step.failed).map((step) => step.id),
    droppedSteps: recording.steps.filter((step) => step.outcome === "dropped").map((step) => step.id),
    chains,
    singles,
    decisions: recording.decisions.map((decision) => {
      const afterAnswer =
        decision.answeredAt === undefined ? undefined : answerToResultMs(samples, decision.answeredAt);
      return {
        kind: decision.kind,
        ...(decision.sourceCardId ? { sourceCardId: decision.sourceCardId } : {}),
        ...(decision.sourceInstanceId ? { sourceInstanceId: decision.sourceInstanceId } : {}),
        ...(decision.effectKey ? { effectKey: decision.effectKey } : {}),
        activationConfirmation: decision.activationConfirmation,
        ...(decision.visibleAt !== undefined ? { promptDelayMs: decision.visibleAt - decision.arrivedAt } : {}),
        arrivedAtMs: decision.arrivedAt - recording.startedAt,
        ...(decision.visibleAt !== undefined ? { visibleAtMs: decision.visibleAt - recording.startedAt } : {}),
        ...(decision.answeredAt !== undefined ? { answeredAtMs: decision.answeredAt - recording.startedAt } : {}),
        ...(afterAnswer !== undefined ? { answerToResultMs: afterAnswer } : {}),
      };
    }),
  };
}

function chainMetrics(
  units: UnitMetrics[],
  recording: Recording,
  boardResultAt: ReadonlyMap<number, number>,
): ChainMetrics {
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
  const maxActiveClauses = Math.max(
    0,
    ...window.map((sample) => sample.clauses.filter((clause) => clause.active).length),
  );

  let boardAheadMs = 0;
  const boardAheadUnits = new Set<number>();
  let deadMs = 0;
  for (const sample of window) {
    const announcedEarlier = units.some((unit) => unit.clauseShownAt !== undefined && unit.clauseShownAt <= sample.at);
    let ahead = false;
    for (const unit of units) {
      if (unit.clauseShownAt === undefined || unit.clauseShownAt <= sample.at) continue;
      if (!announcedEarlier || (boardResultAt.get(unit.index) ?? Infinity) > sample.at) continue;
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
    maxActiveClauses,
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
