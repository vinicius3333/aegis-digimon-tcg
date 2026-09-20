import type { Intent } from "@aegis/shared";
import type { DeploymentSlot } from "./deployment";
import type { LogicalGameSessionIdentity, ReconnectSession } from "./reconnectSession";

export type { LogicalGameSessionIdentity } from "./reconnectSession";

/** Current physical route returned by an authoritative owner directory. */
export interface SessionOwner {
  slot: DeploymentSlot;
  processId: string;
  ownerEpoch: number;
  physicalRoomId: string;
  reconnectEndpoint: "/matchmake/reconnect";
}

export interface OwnerResolutionRequest {
  gameId: string;
  minimumOwnerEpoch: number;
}

export type CurrentOwnerResolver = (request: OwnerResolutionRequest) => Promise<SessionOwner>;

export class CurrentOwnerResolutionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly ownerEpoch?: number,
  ) {
    super(code);
    this.name = "CurrentOwnerResolutionError";
  }
}

export interface CurrentOwnerReconnectOptions<TRoom> {
  session: ReconnectSession;
  handoffEnabled: boolean;
  resolveOwner?: CurrentOwnerResolver;
  connectAtOwner?: (input: { reconnectionToken: string; owner: SessionOwner }) => Promise<TRoom>;
  reconnectLegacy: (input: { reconnectionToken: string; slot: ReconnectSession["slot"] }) => Promise<TRoom>;
  maxAttempts?: number;
  pause?: (milliseconds: number) => Promise<void>;
}

/**
 * Resolve the owner after every failed attempt, so a reload or a lost migration
 * notification can recover from the directory's current route. This stays an
 * injected port until the server publishes the owner-resolution capability.
 */
export async function reconnectWithCurrentOwner<TRoom>({
  session,
  handoffEnabled,
  resolveOwner,
  connectAtOwner,
  reconnectLegacy,
  maxAttempts = 8,
  pause = defaultPause,
}: CurrentOwnerReconnectOptions<TRoom>): Promise<{ room: TRoom; owner?: SessionOwner }> {
  if (!handoffEnabled) {
    return { room: await reconnectLegacy({ reconnectionToken: session.reconnectionToken, slot: session.slot }) };
  }
  if (!session.logicalSession || !resolveOwner || !connectAtOwner) {
    throw new Error("Live room handoff is enabled without a resumable session resolver");
  }
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new Error("maxAttempts must be a positive integer");

  let minimumOwnerEpoch = session.logicalSession.ownerEpoch;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const owner = validateResolvedOwner(
        await resolveOwner({
          gameId: session.logicalSession.gameId,
          minimumOwnerEpoch,
        }),
      );
      if (owner.ownerEpoch < minimumOwnerEpoch) {
        throw new Error("Owner directory returned a stale owner epoch");
      }
      minimumOwnerEpoch = Math.max(minimumOwnerEpoch, owner.ownerEpoch);
      const room = await connectAtOwner({ reconnectionToken: session.reconnectionToken, owner });
      return { room, owner };
    } catch (error) {
      lastError = error;
      if (isStaleOwnerResolution(error)) minimumOwnerEpoch = Math.max(minimumOwnerEpoch, error.ownerEpoch);
      if (isTerminalOwnerResolution(error)) throw error;
      if (attempt + 1 < maxAttempts) await pause(Math.min(1_000 * 2 ** attempt, 8_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not resolve the current game owner");
}

export function supportsLiveRoomHandoff(manifest: { capabilities?: { liveRoomHandoff: boolean } }): boolean {
  return manifest.capabilities?.liveRoomHandoff === true;
}

export type HandoffCommandStatus = "received" | "applied" | "rejected" | "missing";

/** Local retry envelope; participant ordering is allocated by the durable room owner. */
export interface HandoffCommand<TIntent = Intent> {
  gameId: string;
  commandId: string;
  tabId: string;
  tabSequence: number;
  ownerEpoch: number;
  intent: TIntent;
}

interface StoredCommand<TIntent> {
  command: HandoffCommand<TIntent>;
  status: "pending" | "received";
}

interface StoredCommandQueue<TIntent> {
  version: 1;
  tabId: string;
  sequences: Record<string, number>;
  commands: StoredCommand<TIntent>[];
}

export interface HandoffCommandStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface HandoffCommandQueue<TIntent = Intent> {
  enqueue(input: { gameId: string; ownerEpoch: number; intent: TIntent }): HandoffCommand<TIntent>;
  commandsToSend(gameId: string): HandoffCommand<TIntent>[];
  commandsToReconcile(gameId: string): HandoffCommand<TIntent>[];
  rebasePendingOwnerEpoch(gameId: string, ownerEpoch: number): HandoffCommand<TIntent>[];
  rebasePendingCommandOwnerEpoch(
    gameId: string,
    commandId: string,
    ownerEpoch: number,
  ): HandoffCommand<TIntent> | undefined;
  reconcile(
    gameId: string,
    receipts: readonly { commandId: string; status: HandoffCommandStatus; sequence?: number }[],
  ): { resend: HandoffCommand<TIntent>[]; awaitingApplication: HandoffCommand<TIntent>[] };
  acknowledge(gameId: string, commandId: string): boolean;
}

const COMMAND_QUEUE_STORAGE_KEY = "aegis:liveRoomCommands";
const TAB_ID_STORAGE_KEY = "aegis:liveRoomTabId";

/**
 * A per-tab, reload-safe command queue. Local sequences aid tab ordering only; commandId is the
 * idempotency key and the durable store assigns the participant-wide sequence.
 */
export function createHandoffCommandQueue<TIntent = Intent>({
  storage,
  idFactory = randomId,
  tabIdFactory = randomId,
}: {
  storage: HandoffCommandStorage;
  idFactory?: () => string;
  tabIdFactory?: () => string;
}): HandoffCommandQueue<TIntent> {
  const load = (): StoredCommandQueue<TIntent> => {
    const raw = storage.getItem(COMMAND_QUEUE_STORAGE_KEY);
    if (!raw) {
      let tabId = storage.getItem(TAB_ID_STORAGE_KEY);
      if (!tabId) {
        tabId = tabIdFactory();
        storage.setItem(TAB_ID_STORAGE_KEY, tabId);
      }
      return { version: 1, tabId, sequences: {}, commands: [] };
    }
    const value: unknown = JSON.parse(raw);
    if (!isStoredQueue<TIntent>(value)) throw new Error("Stored handoff commands are invalid");
    return value;
  };

  const save = (state: StoredCommandQueue<TIntent>) => {
    storage.setItem(COMMAND_QUEUE_STORAGE_KEY, JSON.stringify(state));
  };

  return {
    enqueue({ gameId, ownerEpoch, intent }) {
      assertIdentity(gameId, ownerEpoch);
      const state = load();
      const tabSequence = (state.sequences[gameId] ?? 0) + 1;
      const command: HandoffCommand<TIntent> = {
        gameId,
        commandId: idFactory(),
        tabId: state.tabId,
        tabSequence,
        ownerEpoch,
        intent,
      };
      state.sequences[gameId] = tabSequence;
      state.commands.push({ command, status: "pending" });
      save(state);
      return command;
    },

    commandsToSend(gameId) {
      return load()
        .commands.filter(({ command, status }) => command.gameId === gameId && status === "pending")
        .map(({ command }) => command);
    },

    commandsToReconcile(gameId) {
      return load()
        .commands.filter(({ command }) => command.gameId === gameId)
        .map(({ command }) => command);
    },

    rebasePendingOwnerEpoch(gameId, ownerEpoch) {
      assertIdentity(gameId, ownerEpoch);
      const state = load();
      const pending: HandoffCommand<TIntent>[] = [];
      state.commands = state.commands.map((entry) => {
        if (entry.command.gameId !== gameId || entry.status !== "pending") return entry;
        const command = { ...entry.command, ownerEpoch };
        pending.push(command);
        return { ...entry, command };
      });
      save(state);
      return pending;
    },

    rebasePendingCommandOwnerEpoch(gameId, commandId, ownerEpoch) {
      assertIdentity(gameId, ownerEpoch);
      const state = load();
      let rebased: HandoffCommand<TIntent> | undefined;
      state.commands = state.commands.map((entry) => {
        if (entry.command.gameId !== gameId || entry.command.commandId !== commandId || entry.status !== "pending")
          return entry;
        rebased = { ...entry.command, ownerEpoch };
        return { ...entry, command: rebased };
      });
      if (rebased) save(state);
      return rebased;
    },

    reconcile(gameId, receipts) {
      const state = load();
      const receiptById = new Map(receipts.map((receipt) => [receipt.commandId, receipt]));
      const retained: StoredCommand<TIntent>[] = [];
      for (const entry of state.commands) {
        if (entry.command.gameId !== gameId) {
          retained.push(entry);
          continue;
        }
        const receipt = receiptById.get(entry.command.commandId);
        const status = receipt?.status;
        if (status === "applied" || status === "rejected") continue;
        if (status === "missing") {
          retained.push({ command: entry.command, status: "pending" });
          continue;
        }
        retained.push({ command: entry.command, status: status === "received" ? "received" : entry.status });
      }
      state.commands = retained;
      save(state);
      return {
        resend: retained
          .filter(({ command, status }) => command.gameId === gameId && status === "pending")
          .map(({ command }) => command),
        awaitingApplication: retained
          .filter(({ command, status }) => command.gameId === gameId && status === "received")
          .map(({ command }) => command),
      };
    },

    acknowledge(gameId, commandId) {
      const state = load();
      const before = state.commands.length;
      state.commands = state.commands.filter(
        (entry) => entry.command.gameId !== gameId || entry.command.commandId !== commandId,
      );
      if (state.commands.length === before) return false;
      save(state);
      return true;
    },
  };
}

function validateResolvedOwner(owner: SessionOwner): SessionOwner {
  if (
    typeof owner !== "object" ||
    owner === null ||
    !isSafeSlot(owner.slot) ||
    typeof owner.processId !== "string" ||
    owner.processId.length === 0 ||
    typeof owner.physicalRoomId !== "string" ||
    owner.physicalRoomId.length === 0 ||
    owner.reconnectEndpoint !== "/matchmake/reconnect" ||
    !Number.isSafeInteger(owner.ownerEpoch) ||
    owner.ownerEpoch < 0
  ) {
    throw new Error("Owner directory returned an invalid owner");
  }
  return owner;
}

function isStaleOwnerResolution(error: unknown): error is CurrentOwnerResolutionError & { ownerEpoch: number } {
  return (
    error instanceof CurrentOwnerResolutionError &&
    error.status === 409 &&
    error.code === "ROOM_OWNER_EPOCH_STALE" &&
    isNonNegativeSafeInteger(error.ownerEpoch)
  );
}

function isTerminalOwnerResolution(error: unknown): error is CurrentOwnerResolutionError {
  return (
    error instanceof CurrentOwnerResolutionError &&
    (error.status === 401 || error.status === 404) &&
    (error.code === "ROOM_RESUME_CREDENTIAL_INVALID" || error.code === "ROOM_SESSION_UNAVAILABLE")
  );
}

function isSafeSlot(value: unknown): value is DeploymentSlot {
  return typeof value === "string" && /^(?:blue|green|g-[a-f0-9]{12})$/.test(value);
}

function assertIdentity(gameId: string, ownerEpoch: number): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(gameId)) throw new Error("Invalid logical game ID");
  if (!Number.isSafeInteger(ownerEpoch) || ownerEpoch < 0) throw new Error("Invalid owner epoch");
}

function isStoredQueue<TIntent>(value: unknown): value is StoredCommandQueue<TIntent> {
  if (!isRecord(value) || value.version !== 1 || typeof value.tabId !== "string" || !isRecord(value.sequences)) {
    return false;
  }
  if (!Object.values(value.sequences).every(isNonNegativeSafeInteger)) return false;
  if (!Array.isArray(value.commands)) return false;
  return value.commands.every((entry) => {
    if (!isRecord(entry) || (entry.status !== "pending" && entry.status !== "received") || !isRecord(entry.command)) {
      return false;
    }
    const command = entry.command;
    return (
      typeof command.gameId === "string" &&
      typeof command.commandId === "string" &&
      typeof command.tabId === "string" &&
      isPositiveSafeInteger(command.tabSequence) &&
      isNonNegativeSafeInteger(command.ownerEpoch) &&
      "intent" in command
    );
  });
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function randomId(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("Secure command IDs are unavailable");
  }
  return crypto.randomUUID();
}

function defaultPause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
