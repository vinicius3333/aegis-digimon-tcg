import type {
  RoomCheckpointRecord,
  RoomHandoffStore,
  RoomSessionRecord,
  RoomTransferRecord,
} from "../db/roomHandoff/RoomHandoffStore.js";
import {
  importStoppedMainBoundary,
  roomHandoffExperimentEnabled,
  ROOM_HANDOFF_SNAPSHOT_VERSION,
  type StoppedMainBoundarySnapshot,
} from "./handoff/experiment.js";

export const ROOM_HANDOFF_SERVER_ENV = "AEGIS_ROOM_HANDOFF_SERVER";

export type RoomHandoffMode = "disabled" | "active" | "prepared" | "frozen" | "migrated";

/**
 * Room-local half of the owner fence. This deliberately defaults to `disabled`, preserving the
 * existing room contract unless both the server control and the stopped-Main experiment are
 * explicitly enabled. Durable epoch validation is performed by AegisRoom before accepting work.
 */
export class RoomHandoffLifecycle {
  private currentMode: RoomHandoffMode;

  private readonly enabled: boolean;
  private currentOwnerEpoch: number;

  constructor(input: { enabled: boolean; ownerEpoch?: number; mode?: "active" | "prepared" }) {
    this.enabled = input.enabled;
    this.currentOwnerEpoch = input.ownerEpoch ?? 1;
    const initialMode = input.mode ?? "active";
    this.currentMode = input.enabled ? initialMode : "disabled";
  }

  get mode(): RoomHandoffMode {
    return this.currentMode;
  }

  get ownerEpoch(): number {
    return this.currentOwnerEpoch;
  }

  acceptsAuthority(ownerEpoch: number): boolean {
    if (!this.enabled) return true;
    return this.currentMode === "active" && ownerEpoch === this.currentOwnerEpoch;
  }

  activate(ownerEpoch: number): boolean {
    if (!this.enabled || this.currentMode !== "prepared" || ownerEpoch !== this.currentOwnerEpoch) return false;
    this.currentMode = "active";
    return true;
  }

  freeze(ownerEpoch: number): boolean {
    if (!this.enabled || this.currentMode !== "active" || ownerEpoch !== this.currentOwnerEpoch) return false;
    this.currentMode = "frozen";
    return true;
  }

  unfreeze(ownerEpoch: number): boolean {
    if (!this.enabled || this.currentMode !== "frozen" || ownerEpoch !== this.currentOwnerEpoch) return false;
    this.currentMode = "active";
    return true;
  }

  migrate(ownerEpoch: number, nextOwnerEpoch: number): boolean {
    if (
      !this.enabled ||
      this.currentMode !== "frozen" ||
      ownerEpoch !== this.currentOwnerEpoch ||
      nextOwnerEpoch !== ownerEpoch + 1
    )
      return false;
    this.currentOwnerEpoch = nextOwnerEpoch;
    this.currentMode = "migrated";
    return true;
  }
}

export function roomHandoffServerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[ROOM_HANDOFF_SERVER_ENV] === "1" && roomHandoffExperimentEnabled(env);
}

export type PreparedRoomCheckpoint = {
  session: RoomSessionRecord;
  checkpoint: RoomCheckpointRecord;
  transfer: RoomTransferRecord;
  state: ReturnType<typeof importStoppedMainBoundary>;
};

/**
 * Load and validate the narrow stopped-Main snapshot into an inert destination. Before the
 * ownership switch, the transfer must be snapshot_saved/destination_validated and target this room;
 * after a process restart it may also be reloaded from owner_switched/destination_active. Callers
 * still have to explicitly activate the room after their transfer coordinator confirms the switch.
 */
export async function loadPreparedMainCheckpoint(
  store: Pick<RoomHandoffStore, "getSession" | "getCheckpoint" | "getTransfer">,
  input: {
    sessionId: string;
    transferId: string;
    expectedOwnerEpoch: number;
    expectedRoomId: string;
    expectedExecutionVersion?: string;
    expectedRulesVersion?: string;
    expectedSourceRevision?: string;
  },
): Promise<PreparedRoomCheckpoint | undefined> {
  const session = await store.getSession(input.sessionId);
  const transfer = await store.getTransfer(input.transferId);
  if (!session || !transfer || session.status !== "active") return undefined;
  const destinationValidated = transfer.status === "snapshot_saved" || transfer.status === "destination_validated";
  const ownerAlreadySwitched = transfer.status === "owner_switched" || transfer.status === "destination_active";
  if (
    transfer.sessionId !== input.sessionId ||
    transfer.to.roomId !== input.expectedRoomId ||
    transfer.toOwnerEpoch !== input.expectedOwnerEpoch ||
    (!destinationValidated && !ownerAlreadySwitched) ||
    session.activeTransferId !== input.transferId
  )
    return undefined;
  const expectedSessionOwner = ownerAlreadySwitched ? transfer.to : transfer.from;
  const expectedSessionEpoch = ownerAlreadySwitched ? transfer.toOwnerEpoch : transfer.fromOwnerEpoch;
  if (
    session.ownerEpoch !== expectedSessionEpoch ||
    session.owner.generationId !== expectedSessionOwner.generationId ||
    session.owner.processId !== expectedSessionOwner.processId ||
    session.owner.roomId !== expectedSessionOwner.roomId
  )
    return undefined;

  const checkpoint = await store.getCheckpoint(input.sessionId);
  if (
    !checkpoint ||
    checkpoint.checkpointId !== transfer.checkpointId ||
    checkpoint.snapshotSchemaVersion !== ROOM_HANDOFF_SNAPSHOT_VERSION ||
    (input.expectedExecutionVersion !== undefined && checkpoint.executionVersion !== input.expectedExecutionVersion) ||
    (input.expectedRulesVersion !== undefined && checkpoint.rulesVersion !== input.expectedRulesVersion) ||
    (input.expectedSourceRevision !== undefined && checkpoint.sourceRevision !== input.expectedSourceRevision)
  )
    return undefined;

  try {
    const snapshot = checkpoint.snapshot as unknown as StoppedMainBoundarySnapshot;
    const state = importStoppedMainBoundary(snapshot);
    if (state.matchId !== input.sessionId) return undefined;
    return { session, checkpoint, transfer, state };
  } catch {
    return undefined;
  }
}
