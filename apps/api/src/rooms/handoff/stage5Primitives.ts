import { isBotProfileName, type BotProfileName } from "../../bot/profiles.js";

/**
 * Serializable primitives for the Stage 5 handoff experiment. The helpers stay data-only; explicit
 * adapters may use them, while no live room enables handoff in production by default.
 */

export interface ContinuityStateFrame {
  readonly protocol: "aegis-continuity-state";
  readonly version: 1;
  readonly random: { readonly algorithm: "mulberry32"; readonly state: number };
  /** Highest allocated ordinal per namespace; tuples keep JSON ordering explicit. */
  readonly idHighWaterMarks: readonly (readonly [string, number])[];
}

export function createContinuityState(
  seed: number,
  idHighWaterMarks: Readonly<Record<string, number>> = {},
): ContinuityStateFrame {
  assertUint32(seed, "random seed");
  const counters = Object.entries(idHighWaterMarks).sort(([left], [right]) => left.localeCompare(right));
  for (const [namespace, counter] of counters) {
    assertIdNamespace(namespace);
    assertOrdinal(counter, `ID high-water mark for ${namespace}`);
  }
  return {
    protocol: "aegis-continuity-state",
    version: 1,
    random: { algorithm: "mulberry32", state: seed >>> 0 },
    idHighWaterMarks: counters,
  };
}

export function nextContinuityRandom(frame: ContinuityStateFrame): { value: number; state: ContinuityStateFrame } {
  assertContinuityState(frame);
  const nextState = (frame.random.state + 0x6d2b79f5) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const draw = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  return {
    value: draw,
    state: { ...frame, random: { algorithm: "mulberry32", state: nextState } },
  };
}

export function allocateContinuityId(
  frame: ContinuityStateFrame,
  namespace: string,
): { id: string; state: ContinuityStateFrame } {
  assertContinuityState(frame);
  assertIdNamespace(namespace);
  const highWaterMarks = new Map(frame.idHighWaterMarks);
  const next = (highWaterMarks.get(namespace) ?? 0) + 1;
  assertOrdinal(next, `next ID ordinal for ${namespace}`);
  highWaterMarks.set(namespace, next);
  return {
    id: `${namespace}-${next}`,
    state: {
      ...frame,
      idHighWaterMarks: [...highWaterMarks.entries()].sort(([left], [right]) => left.localeCompare(right)),
    },
  };
}

export interface DeadlineFrame {
  readonly protocol: "aegis-handoff-deadline";
  readonly version: 1;
  readonly timerId: string;
  readonly kind: string;
  readonly dueAtMs: number;
  readonly compensations: readonly {
    readonly transferId: string;
    readonly pausedAtMs: number;
    readonly resumedAtMs: number;
  }[];
}

/** Server-to-server proof of the exact interval a logical room was paused for transfer. */
export interface MigrationPauseReceipt {
  readonly protocol: "aegis-migration-pause-receipt";
  readonly version: 1;
  readonly transferId: string;
  readonly pausedAtMs: number;
  readonly resumedAtMs: number;
}

export function createMigrationPauseReceipt(input: {
  transferId: string;
  pausedAtMs: number;
  resumedAtMs: number;
}): MigrationPauseReceipt {
  assertNonEmpty(input.transferId, "transfer ID");
  assertTimestamp(input.pausedAtMs, "pause start");
  assertTimestamp(input.resumedAtMs, "resume time");
  if (input.resumedAtMs < input.pausedAtMs) throw new Error("migration pause interval is reversed");
  return {
    protocol: "aegis-migration-pause-receipt",
    version: 1,
    transferId: input.transferId,
    pausedAtMs: input.pausedAtMs,
    resumedAtMs: input.resumedAtMs,
  };
}

export function restoreMigrationPauseReceipt(value: unknown): MigrationPauseReceipt {
  if (typeof value !== "object" || value === null) throw new Error("invalid migration pause receipt");
  const receipt = value as Partial<MigrationPauseReceipt>;
  if (
    receipt.protocol !== "aegis-migration-pause-receipt" ||
    receipt.version !== 1 ||
    typeof receipt.transferId !== "string" ||
    receipt.transferId.length === 0 ||
    typeof receipt.pausedAtMs !== "number" ||
    typeof receipt.resumedAtMs !== "number"
  ) {
    throw new Error("invalid migration pause receipt");
  }
  return createMigrationPauseReceipt(receipt as MigrationPauseReceipt);
}

export function createDeadlineFrame(input: { timerId: string; kind: string; dueAtMs: number }): DeadlineFrame {
  assertNonEmpty(input.timerId, "timer ID");
  assertNonEmpty(input.kind, "timer kind");
  assertTimestamp(input.dueAtMs, "deadline");
  return {
    protocol: "aegis-handoff-deadline",
    version: 1,
    timerId: input.timerId,
    kind: input.kind,
    dueAtMs: input.dueAtMs,
    compensations: [],
  };
}

/** Add transfer downtime to a deadline once; retries must repeat the same transfer interval. */
export function compensatePausedDeadline(
  frame: DeadlineFrame,
  input: { transferId: string; pausedAtMs: number; resumedAtMs: number },
): DeadlineFrame {
  assertDeadlineFrame(frame);
  assertNonEmpty(input.transferId, "transfer ID");
  assertTimestamp(input.pausedAtMs, "pause start");
  assertTimestamp(input.resumedAtMs, "resume time");
  if (input.resumedAtMs < input.pausedAtMs) throw new Error("deadline pause interval is reversed");

  const previous = frame.compensations.find((entry) => entry.transferId === input.transferId);
  if (previous !== undefined) {
    if (previous.pausedAtMs !== input.pausedAtMs || previous.resumedAtMs !== input.resumedAtMs) {
      throw new Error(`conflicting deadline compensation replay: ${input.transferId}`);
    }
    return frame;
  }

  const dueAtMs = frame.dueAtMs + (input.resumedAtMs - input.pausedAtMs);
  assertTimestamp(dueAtMs, "compensated deadline");
  return {
    ...frame,
    dueAtMs,
    compensations: [...frame.compensations, { ...input }],
  };
}

export type ResultSideEffectKind =
  | "ranked-record"
  | "tournament-result"
  | "series-result"
  | "advance-series"
  | "tournament-penalty";
export type ResultSideEffectStatus = "pending" | "committed";

export interface ResultSideEffectFrame {
  readonly kind: ResultSideEffectKind;
  readonly idempotencyKey: string;
  readonly status: ResultSideEffectStatus;
}

export interface ResultOutboxFrame {
  readonly protocol: "aegis-result-side-effects";
  readonly version: 1;
  readonly gameId: string;
  readonly resultId: string;
  readonly ownerEpoch: number;
  readonly effects: readonly ResultSideEffectFrame[];
}

export function createResultOutboxFrame(input: {
  gameId: string;
  resultId: string;
  ownerEpoch: number;
  effects: readonly ResultSideEffectKind[];
}): ResultOutboxFrame {
  assertNonEmpty(input.gameId, "game ID");
  assertNonEmpty(input.resultId, "result ID");
  assertOrdinal(input.ownerEpoch, "owner epoch");
  const kinds = [...new Set(input.effects)];
  return {
    protocol: "aegis-result-side-effects",
    version: 1,
    gameId: input.gameId,
    resultId: input.resultId,
    ownerEpoch: input.ownerEpoch,
    effects: kinds.map((kind) => ({
      kind,
      idempotencyKey: resultEffectIdempotencyKey(input.gameId, input.resultId, kind),
      status: "pending",
    })),
  };
}

/** Update the handoff fence while preserving stable effect keys and delivery status. */
export function transferResultOutbox(frame: ResultOutboxFrame, nextOwnerEpoch: number): ResultOutboxFrame {
  assertResultOutboxFrame(frame);
  assertOrdinal(nextOwnerEpoch, "next owner epoch");
  if (nextOwnerEpoch !== frame.ownerEpoch + 1) throw new Error("result outbox owner epoch must advance once");
  return { ...frame, ownerEpoch: nextOwnerEpoch, effects: frame.effects.map((effect) => ({ ...effect })) };
}

/** Mark an effect complete only under the currently restored owner epoch. */
export function commitResultSideEffect(
  frame: ResultOutboxFrame,
  idempotencyKey: string,
  ownerEpoch: number,
): ResultOutboxFrame {
  assertResultOutboxFrame(frame);
  if (ownerEpoch !== frame.ownerEpoch) throw new Error("stale owner epoch for result side effect");
  const index = frame.effects.findIndex((effect) => effect.idempotencyKey === idempotencyKey);
  if (index < 0) throw new Error(`unknown result side effect: ${idempotencyKey}`);
  if (frame.effects[index]!.status === "committed") return frame;
  const effects = frame.effects.map((effect, effectIndex) =>
    effectIndex === index ? { ...effect, status: "committed" as const } : { ...effect },
  );
  return { ...frame, effects };
}

export function pendingResultSideEffects(frame: ResultOutboxFrame): readonly ResultSideEffectFrame[] {
  assertResultOutboxFrame(frame);
  return frame.effects.filter((effect) => effect.status === "pending");
}

export interface DormantBotDescriptor {
  readonly seat: 0 | 1;
  readonly participantId: string;
  readonly profile: BotProfileName;
  readonly seed: number;
  readonly turnCount: number;
  readonly rngState: number;
  readonly policyRngState: number;
  readonly pendingThinkMs: number | null;
  /** State used by the current evaluation policy; legacy/custom policies may omit these. */
  readonly policyRejectedKeys?: readonly string[];
  readonly policyAttemptedKeys?: readonly string[];
  readonly breedingActionTurn?: number;
  readonly narrationRemainingMs?: number;
}

export interface DormantBotRosterFrame {
  readonly protocol: "aegis-dormant-bot-roster";
  readonly version: 1;
  readonly gameId: string;
  readonly ownerEpoch: number;
  readonly activation: "dormant" | "active";
  /** Seat numbers only; transport session IDs are process-local and never cross handoff. */
  readonly connectedClientSeats: readonly (0 | 1)[];
  readonly bots: readonly DormantBotDescriptor[];
}

export function createDormantBotRoster(input: {
  gameId: string;
  ownerEpoch: number;
  connectedClientSeats: readonly (0 | 1)[];
  bots: readonly DormantBotDescriptor[];
}): DormantBotRosterFrame {
  const frame: DormantBotRosterFrame = {
    protocol: "aegis-dormant-bot-roster",
    version: 1,
    gameId: input.gameId,
    ownerEpoch: input.ownerEpoch,
    activation: "dormant",
    connectedClientSeats: [...new Set(input.connectedClientSeats)].sort(),
    bots: input.bots.map(copyDormantBot),
  };
  assertDormantBotRoster(frame);
  return frame;
}

/** Import descriptors inertly; this function creates no BotPlayer and schedules no callback. */
export function restoreDormantBotRoster(value: unknown): DormantBotRosterFrame {
  assertDormantBotRoster(value);
  if (value.activation !== "dormant") throw new Error("restored bot roster must remain dormant");
  return {
    ...value,
    connectedClientSeats: [...value.connectedClientSeats],
    bots: value.bots.map(copyDormantBot),
  };
}

/** A restored roster becomes eligible for construction only after the destination owns its epoch. */
export function activateDormantBotRoster(
  frame: DormantBotRosterFrame,
  owner: { gameId: string; ownerEpoch: number },
): DormantBotRosterFrame {
  assertDormantBotRoster(frame);
  if (frame.activation !== "dormant") throw new Error("bot roster is not dormant");
  if (owner.gameId !== frame.gameId || owner.ownerEpoch !== frame.ownerEpoch) {
    throw new Error("bot roster does not match the current owner epoch");
  }
  return { ...frame, activation: "active" };
}

function assertContinuityState(value: unknown): asserts value is ContinuityStateFrame {
  if (typeof value !== "object" || value === null) throw new Error("invalid continuity state frame");
  const frame = value as Partial<ContinuityStateFrame>;
  if (
    frame.protocol !== "aegis-continuity-state" ||
    frame.version !== 1 ||
    typeof frame.random !== "object" ||
    frame.random === null ||
    frame.random.algorithm !== "mulberry32" ||
    !Number.isSafeInteger(frame.random.state) ||
    frame.random.state < 0 ||
    frame.random.state > 0xffff_ffff ||
    !Array.isArray(frame.idHighWaterMarks)
  ) {
    throw new Error("invalid continuity state frame");
  }
  const seenNamespaces = new Set<string>();
  for (const entry of frame.idHighWaterMarks) {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string") {
      throw new Error("invalid continuity ID high-water mark");
    }
    assertIdNamespace(entry[0]);
    assertOrdinal(entry[1], `ID high-water mark for ${entry[0]}`);
    if (seenNamespaces.has(entry[0])) throw new Error(`duplicate continuity ID namespace: ${entry[0]}`);
    seenNamespaces.add(entry[0]);
  }
}

function assertDeadlineFrame(value: unknown): asserts value is DeadlineFrame {
  if (typeof value !== "object" || value === null) throw new Error("invalid deadline frame");
  const frame = value as Partial<DeadlineFrame>;
  if (
    frame.protocol !== "aegis-handoff-deadline" ||
    frame.version !== 1 ||
    typeof frame.timerId !== "string" ||
    typeof frame.kind !== "string" ||
    typeof frame.dueAtMs !== "number" ||
    !Number.isSafeInteger(frame.dueAtMs) ||
    frame.dueAtMs < 0 ||
    !Array.isArray(frame.compensations)
  ) {
    throw new Error("invalid deadline frame");
  }
  const seenTransfers = new Set<string>();
  for (const compensation of frame.compensations) {
    if (
      typeof compensation !== "object" ||
      compensation === null ||
      typeof compensation.transferId !== "string" ||
      !Number.isSafeInteger(compensation.pausedAtMs) ||
      compensation.pausedAtMs < 0 ||
      !Number.isSafeInteger(compensation.resumedAtMs) ||
      compensation.resumedAtMs < compensation.pausedAtMs ||
      seenTransfers.has(compensation.transferId)
    ) {
      throw new Error("invalid deadline compensation record");
    }
    seenTransfers.add(compensation.transferId);
  }
}

function assertResultOutboxFrame(value: unknown): asserts value is ResultOutboxFrame {
  if (typeof value !== "object" || value === null) throw new Error("invalid result outbox frame");
  const frame = value as Partial<ResultOutboxFrame>;
  if (
    frame.protocol !== "aegis-result-side-effects" ||
    frame.version !== 1 ||
    typeof frame.gameId !== "string" ||
    frame.gameId.length === 0 ||
    typeof frame.resultId !== "string" ||
    frame.resultId.length === 0 ||
    typeof frame.ownerEpoch !== "number" ||
    !Number.isSafeInteger(frame.ownerEpoch) ||
    frame.ownerEpoch < 0 ||
    !Array.isArray(frame.effects)
  ) {
    throw new Error("invalid result outbox frame");
  }
  const keys = new Set<string>();
  for (const effect of frame.effects) {
    if (
      typeof effect !== "object" ||
      effect === null ||
      !isResultSideEffectKind(effect.kind) ||
      effect.idempotencyKey !== resultEffectIdempotencyKey(frame.gameId, frame.resultId, effect.kind) ||
      (effect.status !== "pending" && effect.status !== "committed") ||
      keys.has(effect.idempotencyKey)
    ) {
      throw new Error("invalid result side-effect frame");
    }
    keys.add(effect.idempotencyKey);
  }
}

function assertDormantBotRoster(value: unknown): asserts value is DormantBotRosterFrame {
  if (typeof value !== "object" || value === null) throw new Error("invalid dormant bot roster frame");
  const frame = value as Partial<DormantBotRosterFrame>;
  if (
    frame.protocol !== "aegis-dormant-bot-roster" ||
    frame.version !== 1 ||
    typeof frame.gameId !== "string" ||
    frame.gameId.length === 0 ||
    typeof frame.ownerEpoch !== "number" ||
    !Number.isSafeInteger(frame.ownerEpoch) ||
    frame.ownerEpoch < 0 ||
    (frame.activation !== "dormant" && frame.activation !== "active") ||
    !Array.isArray(frame.connectedClientSeats) ||
    !frame.connectedClientSeats.every(isSeat) ||
    new Set(frame.connectedClientSeats).size !== frame.connectedClientSeats.length ||
    !Array.isArray(frame.bots)
  ) {
    throw new Error("invalid dormant bot roster frame");
  }
  const seats = new Set<number>();
  const participants = new Set<string>();
  for (const bot of frame.bots) {
    if (
      typeof bot !== "object" ||
      bot === null ||
      !isSeat(bot.seat) ||
      typeof bot.participantId !== "string" ||
      bot.participantId.length === 0 ||
      !isBotProfileName(bot.profile) ||
      !isUint32(bot.seed) ||
      !Number.isSafeInteger(bot.turnCount) ||
      bot.turnCount < 0 ||
      !isUint32(bot.rngState) ||
      !isUint32(bot.policyRngState) ||
      (bot.pendingThinkMs !== null && (!Number.isSafeInteger(bot.pendingThinkMs) || bot.pendingThinkMs < 0)) ||
      (bot.policyRejectedKeys !== undefined && !isStringArray(bot.policyRejectedKeys)) ||
      (bot.policyAttemptedKeys !== undefined && !isStringArray(bot.policyAttemptedKeys)) ||
      (bot.breedingActionTurn !== undefined &&
        (!Number.isSafeInteger(bot.breedingActionTurn) || bot.breedingActionTurn < -1)) ||
      (bot.narrationRemainingMs !== undefined &&
        (!Number.isSafeInteger(bot.narrationRemainingMs) || bot.narrationRemainingMs < 0)) ||
      seats.has(bot.seat) ||
      participants.has(bot.participantId)
    ) {
      throw new Error("invalid dormant bot descriptor");
    }
    seats.add(bot.seat);
    participants.add(bot.participantId);
  }
}

function copyDormantBot(bot: DormantBotDescriptor): DormantBotDescriptor {
  return {
    ...bot,
    ...(bot.policyRejectedKeys === undefined ? {} : { policyRejectedKeys: [...bot.policyRejectedKeys] }),
    ...(bot.policyAttemptedKeys === undefined ? {} : { policyAttemptedKeys: [...bot.policyAttemptedKeys] }),
  };
}

function isStringArray(value: readonly unknown[]): boolean {
  return value.every((entry) => typeof entry === "string");
}

export function resultEffectIdempotencyKey(gameId: string, resultId: string, kind: ResultSideEffectKind): string {
  return `${gameId}:${resultId}:${kind}`;
}

function isResultSideEffectKind(value: unknown): value is ResultSideEffectKind {
  return (
    value === "ranked-record" ||
    value === "tournament-result" ||
    value === "series-result" ||
    value === "advance-series" ||
    value === "tournament-penalty"
  );
}

function isSeat(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function isUint32(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function assertUint32(value: number, name: string): void {
  if (!isUint32(value)) throw new Error(`${name} must be an unsigned 32-bit integer`);
}

function assertOrdinal(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative safe integer`);
}

function assertTimestamp(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative safe integer`);
}

function assertNonEmpty(value: string, name: string): void {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} must not be empty`);
}

function assertIdNamespace(value: string): void {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)) throw new Error(`invalid ID namespace: ${value}`);
}
