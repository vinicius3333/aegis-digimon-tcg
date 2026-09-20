import { createHash } from "node:crypto";
import { ArraySchema, Schema, type Metadata } from "@colyseus/schema";
import { GameState, Phase } from "@aegis/shared";

/**
 * Private, server-to-server proof format for the first live-room handoff experiment.
 * This module is deliberately not wired to the room or deployment controller.
 */
export const ROOM_HANDOFF_EXPERIMENT_ENV = "AEGIS_ROOM_HANDOFF_EXPERIMENT";
export const ROOM_HANDOFF_SNAPSHOT_VERSION = 1;

const SNAPSHOT_FORMAT = "aegis-game-state-json-v1";

export interface StoppedMainBoundarySnapshot {
  readonly protocol: "aegis-room-handoff-experiment";
  readonly snapshotVersion: 1;
  readonly format: typeof SNAPSHOT_FORMAT;
  readonly boundary: "main-action";
  readonly matchId: string;
  readonly payloadSha256: string;
  /** JSON-encoded GameState schema data. Includes all server-private data. */
  readonly payload: string;
}

/** The proof remains unavailable in production even if the environment flag is set. */
export function roomHandoffExperimentEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env[ROOM_HANDOFF_EXPERIMENT_ENV] === "1";
}

/**
 * Export a complete internal snapshot at a settled Main-phase action boundary.
 * Callers must stop the source engine before invoking this seam. Open choices and combat
 * windows are rejected because this proof does not serialize their suspended execution.
 *
 * The payload contains both players' hands, security, deck order, and all other state. Keep
 * it on trusted server-to-server channels and never log or send it to a client.
 */
export function exportStoppedMainBoundary(state: GameState): StoppedMainBoundarySnapshot {
  assertStoppedMainBoundary(state);

  const encoded = JSON.stringify(state.toJSON());
  return {
    protocol: "aegis-room-handoff-experiment",
    snapshotVersion: ROOM_HANDOFF_SNAPSHOT_VERSION,
    format: SNAPSHOT_FORMAT,
    boundary: "main-action",
    matchId: state.matchId,
    payloadSha256: sha256(encoded),
    payload: encoded,
  };
}

/** Restore a snapshot into a fresh schema tree, validating version, digest, and boundary. */
export function importStoppedMainBoundary(snapshot: StoppedMainBoundarySnapshot): GameState {
  if (
    snapshot.protocol !== "aegis-room-handoff-experiment" ||
    snapshot.snapshotVersion !== ROOM_HANDOFF_SNAPSHOT_VERSION ||
    snapshot.format !== SNAPSHOT_FORMAT ||
    snapshot.boundary !== "main-action" ||
    typeof snapshot.matchId !== "string" ||
    typeof snapshot.payload !== "string" ||
    typeof snapshot.payloadSha256 !== "string"
  ) {
    throw new Error("unsupported room handoff snapshot format");
  }
  if (sha256(snapshot.payload) !== snapshot.payloadSha256) {
    throw new Error("room handoff snapshot checksum mismatch");
  }

  const data = JSON.parse(snapshot.payload) as unknown;
  const restored = restoreSchema(GameState, data);
  assertStoppedMainBoundary(restored);
  if (restored.matchId !== snapshot.matchId) {
    throw new Error("room handoff snapshot match identity mismatch");
  }
  return restored;
}

function assertStoppedMainBoundary(state: GameState): void {
  if (state.phase !== Phase.Main || state.gameOver) {
    throw new Error("room handoff experiment supports only a live Main-phase boundary");
  }
  if (state.pendingDecision !== undefined || state.combatWindow !== undefined) {
    throw new Error("room handoff experiment does not support pending decisions or combat windows");
  }
  if (state.players[0]?.seat !== 0 || state.players[1]?.seat !== 1) {
    throw new Error("room handoff snapshot requires both player seats");
  }
}

/**
 * Rehydrate the schema tree using only fields declared by each Schema class. This keeps
 * ArraySchema and nested Schema parent links valid after JSON crosses the process boundary,
 * while avoiding a client StateView (which intentionally omits private fields).
 */
function restoreSchema<T extends Schema>(constructor: SchemaConstructor<T>, value: unknown): T {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid room handoff schema payload");
  }
  const raw = value as Record<string, unknown>;
  const instance = new constructor();
  const metadata = constructor[Symbol.metadata] as Metadata | undefined;
  for (const candidate of Object.values(metadata ?? {})) {
    if (typeof candidate !== "object" || candidate === null || !("name" in candidate) || !("index" in candidate)) {
      continue;
    }
    const field = candidate as { name: string; index: number; tag?: number; type: unknown };
    const fieldValue = raw[field.name];
    if (fieldValue === undefined) continue;

    if (isSchemaConstructor(field.type)) {
      (instance as unknown as Record<string, unknown>)[field.name] = restoreSchema(field.type, fieldValue);
      continue;
    }

    if (isArrayDefinition(field.type)) {
      if (!Array.isArray(fieldValue)) throw new Error(`invalid array in room handoff field ${field.name}`);
      const restoredArray = new ArraySchema<unknown>();
      for (const item of fieldValue) {
        restoredArray.push(isSchemaConstructor(field.type.array) ? restoreSchema(field.type.array, item) : item);
      }
      (instance as unknown as Record<string, unknown>)[field.name] = restoredArray;
      continue;
    }

    (instance as unknown as Record<string, unknown>)[field.name] = fieldValue;
  }
  return instance;
}

function isSchemaConstructor(value: unknown): value is SchemaConstructor {
  return typeof value === "function" && (value as SchemaConstructor)[Symbol.metadata] !== undefined;
}

function isArrayDefinition(value: unknown): value is { array: unknown } {
  return typeof value === "object" && value !== null && "array" in value;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

type SchemaConstructor<T extends Schema = Schema> = (new () => T) & { [Symbol.metadata]?: Metadata };
