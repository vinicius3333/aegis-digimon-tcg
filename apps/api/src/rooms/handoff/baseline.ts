import { performance } from "node:perf_hooks";
import { CardInstance, GameState, Phase, Permanent, PlayerState, type Seat } from "@aegis/shared";
import { exportStoppedMainBoundary, importStoppedMainBoundary, roomHandoffExperimentEnabled } from "./experiment.js";

export const HANDOFF_BASELINE_ENV = "AEGIS_ROOM_HANDOFF_BASELINE";
const FIXTURE_NAME = "two-seat-main-boundary-v1";
const CARD_IDS = ["BT1-001", "BT1-002", "BT1-003", "BT1-010", "BT1-011", "BT1-012"];

export interface DeterministicBaselineFixture {
  readonly state: GameState;
  readonly cardCount: number;
}

export interface HandoffBaselineReport {
  readonly fixture: typeof FIXTURE_NAME;
  readonly repetitions: number;
  readonly seats: 2;
  readonly cardCount: number;
  readonly serializedPayloadBytes: number;
  readonly serializedEnvelopeBytes: number;
  readonly exportMedianMs: number;
  readonly exportP95Ms: number;
  readonly importMedianMs: number;
  readonly importP95Ms: number;
  readonly cpuUserMs: number;
  readonly cpuSystemMs: number;
  readonly heapBeforeCodecBytes: number;
  readonly heapAfterExportBytes: number;
  readonly heapAfterImportBytes: number;
  readonly rssBeforeCodecBytes: number;
  readonly rssAfterExportBytes: number;
  readonly rssAfterImportBytes: number;
  readonly roundTripVerified: boolean;
}

/** Measurement requires a test process and two independent opt-in flags. */
export function handoffBaselineEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.NODE_ENV === "test" &&
    env.AEGIS_ROOM_HANDOFF_EXPERIMENT === "1" &&
    env[HANDOFF_BASELINE_ENV] === "1" &&
    roomHandoffExperimentEnabled(env)
  );
}

/**
 * Build a deterministic schema-only fixture with private zones, public board state, linked and
 * stacked cards, delay cards, breeding state, and an Option resolving outside a regular zone.
 * The IDs and all card identities are synthetic/static test data, never production match data.
 */
export function createDeterministicBaselineFixture(): DeterministicBaselineFixture {
  const state = new GameState();
  state.matchId = "handoff-baseline-synthetic";
  state.matchLogId = "handoff-baseline-log";
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.turnCount = 7;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 2;
  state.stateVersion = 21;

  let cardCount = 0;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.displayName = `Fixture seat ${seat}`;
    player.sessionId = `fixture-session-${seat}`;

    for (let index = 0; index < 50; index += 1) player.deck.push(makeCard(seat, "deck", index, false));
    for (let index = 0; index < 5; index += 1) player.eggDeck.push(makeCard(seat, "egg", index, false));
    for (let index = 0; index < 5; index += 1) player.hand.push(makeCard(seat, "hand", index, false));
    for (let index = 0; index < 5; index += 1) player.security.push(makeCard(seat, "security", index, false));
    for (let index = 0; index < 8; index += 1) player.trash.push(makeCard(seat, "trash", index, true));
    for (let index = 0; index < 2; index += 1) player.delayZone.push(makeCard(seat, "delay", index, false));

    for (let permanentIndex = 0; permanentIndex < 3; permanentIndex += 1) {
      const permanent = new Permanent();
      permanent.permanentId = `fixture-s${seat}-perm-${permanentIndex}`;
      permanent.controllerSeat = seat;
      permanent.topCard = makeCard(seat, `field-${permanentIndex}-top`, 0, true);
      permanent.baseDP = 5000 + permanentIndex * 1000;
      permanent.currentDP = permanent.baseDP;
      permanent.enterFieldTurnCount = 3;
      permanent.isSuspended = permanentIndex === 2;
      for (let stackIndex = 0; stackIndex < 2; stackIndex += 1)
        permanent.stack.push(makeCard(seat, `field-${permanentIndex}-stack`, stackIndex, true));
      permanent.linked.push(makeCard(seat, `field-${permanentIndex}-linked`, 0, true));
      player.battleArea.push(permanent);
    }

    const breeding = new Permanent();
    breeding.permanentId = `fixture-s${seat}-breeding`;
    breeding.controllerSeat = seat;
    breeding.inBreeding = true;
    breeding.topCard = makeCard(seat, "breeding-top", 0, true);
    breeding.stack.push(makeCard(seat, "breeding-stack", 0, true));
    breeding.baseDP = 3000;
    breeding.currentDP = 3000;
    player.breeding = breeding;
    player.resolvingOption = makeCard(seat, "resolving-option", 0, true);

    player.connected = true;
    player.hasMulliganed = seat === 1;
    player.deckCount = player.deck.length;
    player.eggDeckCount = player.eggDeck.length;
    player.handCount = player.hand.length;
    player.securityCount = player.security.length;
    state.players.push(player);

    cardCount +=
      player.deck.length +
      player.eggDeck.length +
      player.hand.length +
      player.security.length +
      player.trash.length +
      player.delayZone.length +
      player.battleArea.reduce((sum, permanent) => sum + 1 + permanent.stack.length + permanent.linked.length, 0) +
      1 + // breeding top
      breeding.stack.length +
      1; // resolving Option
  }

  return { state, cardCount };
}

/**
 * Measure the existing private stopped-Main-boundary schema codec. The snapshot itself is held
 * only in memory and never returned or printed. Memory samples are process-wide observations
 * before/after a single export/import pair, not peak allocation; CPU and wall time cover repeated
 * codec operations, with CPU sampled around each export/import pair.
 */
export function measureStoppedMainBoundary(input: {
  repetitions: number;
  env?: NodeJS.ProcessEnv;
}): HandoffBaselineReport {
  if (!handoffBaselineEnabled(input.env)) {
    throw new Error("room handoff baseline is disabled; opt in from a non-production test process");
  }
  if (!Number.isSafeInteger(input.repetitions) || input.repetitions < 1 || input.repetitions > 100) {
    throw new RangeError("room handoff baseline repetitions must be an integer from 1 to 100");
  }

  const warmupFixture = createDeterministicBaselineFixture();
  const warmup = exportStoppedMainBoundary(warmupFixture.state);
  importStoppedMainBoundary(warmup);

  const memoryFixture = createDeterministicBaselineFixture();
  const memoryExpectedState = JSON.stringify(memoryFixture.state.toJSON());
  const memoryBefore = process.memoryUsage();
  const memorySnapshot = exportStoppedMainBoundary(memoryFixture.state);
  const memoryAfterExport = process.memoryUsage();
  const memoryRestored = importStoppedMainBoundary(memorySnapshot);
  const memoryAfterImport = process.memoryUsage();
  const memoryRoundTripVerified = JSON.stringify(memoryRestored.toJSON()) === memoryExpectedState;

  // Export consumes encoder state, so each sample gets a fresh, identical schema tree to
  // represent a complete room snapshot instead of an incremental patch.
  const exportTimes: number[] = [];
  const importTimes: number[] = [];
  let roundTripVerified = memoryRoundTripVerified;
  let cpuUserMicros = 0;
  let cpuSystemMicros = 0;

  for (let index = 0; index < input.repetitions; index += 1) {
    const fixture = createDeterministicBaselineFixture();
    const expectedState = JSON.stringify(fixture.state.toJSON());
    const cpuBefore = process.cpuUsage();
    const exportStarted = performance.now();
    const sample = exportStoppedMainBoundary(fixture.state);
    exportTimes.push(performance.now() - exportStarted);

    const importStarted = performance.now();
    const restored = importStoppedMainBoundary(sample);
    importTimes.push(performance.now() - importStarted);
    const operationCpu = process.cpuUsage(cpuBefore);
    cpuUserMicros += operationCpu.user;
    cpuSystemMicros += operationCpu.system;
    roundTripVerified &&= JSON.stringify(restored.toJSON()) === expectedState;
  }

  return {
    fixture: FIXTURE_NAME,
    repetitions: input.repetitions,
    seats: 2,
    cardCount: warmupFixture.cardCount,
    serializedPayloadBytes: Buffer.from(memorySnapshot.payload, "base64").byteLength,
    serializedEnvelopeBytes: Buffer.byteLength(JSON.stringify(memorySnapshot), "utf8"),
    exportMedianMs: round(median(exportTimes)),
    exportP95Ms: round(percentile95(exportTimes)),
    importMedianMs: round(median(importTimes)),
    importP95Ms: round(percentile95(importTimes)),
    cpuUserMs: round(cpuUserMicros / 1000),
    cpuSystemMs: round(cpuSystemMicros / 1000),
    heapBeforeCodecBytes: memoryBefore.heapUsed,
    heapAfterExportBytes: memoryAfterExport.heapUsed,
    heapAfterImportBytes: memoryAfterImport.heapUsed,
    rssBeforeCodecBytes: memoryBefore.rss,
    rssAfterExportBytes: memoryAfterExport.rss,
    rssAfterImportBytes: memoryAfterImport.rss,
    roundTripVerified,
  };
}

function makeCard(seat: Seat, zone: string, index: number, faceUp: boolean): CardInstance {
  const card = new CardInstance();
  card.instanceId = `fixture-s${seat}-${zone}-${index}`;
  card.cardId = CARD_IDS[(seat + index) % CARD_IDS.length]!;
  card.artId = "";
  card.ownerSeat = seat;
  card.faceUp = faceUp;
  return card;
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? (ordered[middle - 1]! + ordered[middle]!) / 2 : ordered[middle]!;
}

function percentile95(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * 0.95) - 1)]!;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
