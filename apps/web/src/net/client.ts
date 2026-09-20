import { Client, type Room, type SeatReservation } from "colyseus.js";
import {
  GameState,
  ROOM_TYPE,
  ROOM_TYPE_BOT,
  ROOM_TYPE_PRIVATE,
  ROOM_TYPE_RANKED,
  ROOM_TYPE_BETA,
  ROOM_TYPE_BETA_BOT,
  type Intent,
} from "@aegis/shared";
import {
  deploymentEndpoint,
  loadCurrentDeploymentManifest,
  type DeploymentManifest,
  type DeploymentSlot,
  usesSlotDeploymentRouter,
} from "./deployment";
import type { AegisJoinOptions } from "./types";
import {
  CurrentOwnerResolutionError,
  createHandoffCommandQueue,
  reconnectWithCurrentOwner,
  supportsLiveRoomHandoff,
  type HandoffCommandQueue,
  type HandoffCommandStatus,
  type SessionOwner,
} from "./liveRoomHandoffClient";
import type { LogicalGameSessionIdentity, ReconnectSession } from "./reconnectSession";

export type AegisRoom = Room<GameState>;
export type RoomSlot = DeploymentSlot | "legacy";

export interface ColyseusClientPort {
  join: (roomName: string, options: AegisJoinOptions) => Promise<AegisRoom>;
  joinOrCreate: (roomName: string, options: AegisJoinOptions) => Promise<AegisRoom>;
  create: (roomName: string, options: AegisJoinOptions & { private?: boolean }) => Promise<AegisRoom>;
  joinById: (roomId: string, options: AegisJoinOptions & { roomCode?: string }) => Promise<AegisRoom>;
  reconnect: (reconnectionToken: string) => Promise<AegisRoom>;
  consumeSeatReservation: (reservation: SeatReservation) => Promise<AegisRoom>;
}

interface RouterDependencies {
  loadManifest: () => Promise<DeploymentManifest>;
  endpointForSlot: (slot: DeploymentSlot) => { http: string; websocket: string };
  createClient: (endpoint: string, slot: DeploymentSlot) => ColyseusClientPort;
  fetcher: typeof fetch;
}

const roomSlots = new WeakMap<AegisRoom, RoomSlot>();
interface RoomHandoffMetadata {
  enabled: boolean;
  identity?: LogicalGameSessionIdentity;
}
const roomHandoffMetadata = new WeakMap<AegisRoom, RoomHandoffMetadata>();

export function roomHandoffIdentity(room: AegisRoom): LogicalGameSessionIdentity | undefined {
  return roomHandoffMetadata.get(room)?.identity;
}

export function roomHandoffEnabled(room: AegisRoom): boolean {
  return roomHandoffMetadata.get(room)?.enabled === true;
}

export function updateRoomHandoffIdentity(
  room: AegisRoom,
  update: { gameId?: string; ownerEpoch?: number },
): LogicalGameSessionIdentity | undefined {
  const metadata = roomHandoffMetadata.get(room);
  if (!metadata?.enabled) return undefined;
  const gameId = update.gameId ?? metadata.identity?.gameId;
  if (!gameId || !/^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(gameId)) return metadata.identity;
  if (metadata.identity && metadata.identity.gameId !== gameId) return metadata.identity;
  const ownerEpoch = Math.max(metadata.identity?.ownerEpoch ?? 0, update.ownerEpoch ?? 1);
  metadata.identity = { gameId, ownerEpoch };
  return metadata.identity;
}

export interface HandoffCommandReceipt {
  commandId: string;
  sequence: number;
  status: "admitted" | "applied" | "rejected";
  ownerEpoch: number;
  error?: string;
}

function publicRoomType(options: AegisJoinOptions): string {
  if (options.betaBattleMode && options.ranked) throw new Error("Beta battles cannot be ranked");
  return options.betaBattleMode ? ROOM_TYPE_BETA : options.ranked ? ROOM_TYPE_RANKED : ROOM_TYPE;
}

export function connectionSlot(room: AegisRoom): RoomSlot {
  return roomSlots.get(room) ?? "legacy";
}

export class AegisConnectionRouter {
  private readonly clients = new Map<DeploymentSlot, ColyseusClientPort>();
  private readonly slotByRoomId = new Map<string, DeploymentSlot>();

  constructor(private readonly dependencies: RouterDependencies) {}

  async joinOrCreate(options: AegisJoinOptions): Promise<AegisRoom> {
    return this.joinOrCreateWithFreshManifest(options, false);
  }

  private async joinOrCreateWithFreshManifest(
    options: AegisJoinOptions,
    retriedAfterDrain: boolean,
  ): Promise<AegisRoom> {
    const manifest = await this.dependencies.loadManifest();
    const roomName = publicRoomType(options);

    for (const deployment of manifest.draining) {
      const slotOptions = await this.withRoomTicket(options, deployment.slot);
      try {
        const joined = await this.client(deployment.slot).join(roomName, slotOptions);
        return this.remember(joined, deployment.slot, supportsLiveRoomHandoff(manifest));
      } catch {
        // A draining slot may have no compatible waiting room. It is forbidden
        // from creating one, so new matchmaking continues on the active slot.
      }
    }

    const activeOptions = await this.withRoomTicket(options, manifest.active.slot);
    try {
      const joined = await this.client(manifest.active.slot).joinOrCreate(roomName, activeOptions);
      return this.remember(joined, manifest.active.slot, supportsLiveRoomHandoff(manifest));
    } catch (error) {
      if (!retriedAfterDrain && isDrainingResponse(error)) {
        return this.joinOrCreateWithFreshManifest(options, true);
      }
      throw error;
    }
  }

  async createPrivate(options: AegisJoinOptions): Promise<AegisRoom> {
    const manifest = await this.dependencies.loadManifest();
    const created = await this.client(manifest.active.slot).create(ROOM_TYPE_PRIVATE, {
      ...options,
      private: true,
    });
    return this.remember(created, manifest.active.slot, supportsLiveRoomHandoff(manifest));
  }

  async createBot(options: AegisJoinOptions): Promise<AegisRoom> {
    return this.createBotWithFreshManifest(options, false);
  }

  private async createBotWithFreshManifest(options: AegisJoinOptions, retriedAfterDrain: boolean): Promise<AegisRoom> {
    const manifest = await this.dependencies.loadManifest();
    try {
      const roomType = options.betaBattleMode ? ROOM_TYPE_BETA_BOT : ROOM_TYPE_BOT;
      const created = await this.client(manifest.active.slot).create(roomType, options);
      return this.remember(created, manifest.active.slot, supportsLiveRoomHandoff(manifest));
    } catch (error) {
      if (!retriedAfterDrain && isDrainingResponse(error)) {
        return this.createBotWithFreshManifest(options, true);
      }
      throw error;
    }
  }

  async joinPrivateByCode(code: string, options: AegisJoinOptions): Promise<AegisRoom> {
    const manifest = await this.dependencies.loadManifest();
    const deployments = [manifest.active, ...manifest.draining];
    for (const { slot } of deployments) {
      const roomId = await this.resolveRoomCode(code, slot);
      if (!roomId) continue;
      const joined = await this.client(slot).joinById(roomId, {
        ...options,
        roomCode: code.toUpperCase(),
      });
      return this.remember(joined, slot, supportsLiveRoomHandoff(manifest));
    }
    throw new Error("room not found");
  }

  async reconnect(reconnectionToken: string, slot: DeploymentSlot): Promise<AegisRoom> {
    const reconnected = await this.client(slot).reconnect(reconnectionToken);
    return this.remember(reconnected, slot);
  }

  async resumeSession(session: ReconnectSession): Promise<AegisRoom> {
    const manifest = await this.dependencies.loadManifest();
    if (
      !supportsLiveRoomHandoff(manifest) ||
      !session.logicalSession ||
      !session.resumeCredential ||
      session.resumeCredentialExpiresAt === undefined ||
      session.resumeCredentialExpiresAt <= Date.now()
    ) {
      return this.reconnect(session.reconnectionToken, session.slot === "legacy" ? manifest.active.slot : session.slot);
    }
    const result = await reconnectWithCurrentOwner({
      session,
      handoffEnabled: true,
      resolveOwner: async ({ gameId, minimumOwnerEpoch }) => {
        // Resolve through the current active deployment on every attempt. A
        // migration may have completed since the page was loaded or retried.
        const currentManifest = await this.dependencies.loadManifest();
        return this.resolveOwner(session.resumeCredential!, currentManifest.active.slot, { gameId, minimumOwnerEpoch });
      },
      connectAtOwner: async ({ owner }) => this.connectAtOwner(session, owner),
      reconnectLegacy: async ({ reconnectionToken, slot }) =>
        this.reconnect(reconnectionToken, slot === "legacy" ? manifest.active.slot : slot),
    });
    if (result.owner) {
      const room = this.remember(result.room, result.owner.slot, true);
      updateRoomHandoffIdentity(room, {
        gameId: session.logicalSession.gameId,
        ownerEpoch: result.owner.ownerEpoch,
      });
      return room;
    }
    return result.room;
  }

  async joinWithBot(roomId: string, botDeckId?: string): Promise<void> {
    const knownSlot = this.slotByRoomId.get(roomId);
    const slot = knownSlot ?? (await this.dependencies.loadManifest()).active.slot;
    const { http } = this.dependencies.endpointForSlot(slot);
    console.info("[BOT_JOIN_CLIENT] requesting bot", { roomId, slot, botDeckId });
    const response = await this.fetch(`${http}/bot/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, botDeckId }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Bot join failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }
    console.info("[BOT_JOIN_CLIENT] bot joined", { roomId, slot });
  }

  private client(slot: DeploymentSlot): ColyseusClientPort {
    let client = this.clients.get(slot);
    if (!client) {
      client = this.dependencies.createClient(this.dependencies.endpointForSlot(slot).websocket, slot);
      this.clients.set(slot, client);
    }
    return client;
  }

  private remember(room: AegisRoom, slot: DeploymentSlot, handoffEnabled = false): AegisRoom {
    roomSlots.set(room, slot);
    roomHandoffMetadata.set(room, { enabled: handoffEnabled });
    this.slotByRoomId.set(room.roomId, slot);
    return room;
  }

  private async resolveOwner(
    resumeCredential: string,
    slot: DeploymentSlot,
    request: { gameId: string; minimumOwnerEpoch: number },
  ): Promise<SessionOwner> {
    const { http } = this.dependencies.endpointForSlot(slot);
    const response = await this.fetch(`${http}/room/resolve-owner`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        gameId: request.gameId,
        resumeCredential,
        minimumOwnerEpoch: request.minimumOwnerEpoch,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw currentOwnerError(response.status, body);
    if (!isRecord(body) || body.gameId !== request.gameId)
      throw new Error("Owner directory returned an invalid response");
    const owner = body as unknown as SessionOwner;
    return owner;
  }

  private async connectAtOwner(session: ReconnectSession, owner: SessionOwner): Promise<AegisRoom> {
    const { http } = this.dependencies.endpointForSlot(owner.slot);
    const response = await this.fetch(`${http}${owner.reconnectEndpoint}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        gameId: session.logicalSession!.gameId,
        resumeCredential: session.resumeCredential,
        physicalRoomId: owner.physicalRoomId,
        ownerEpoch: owner.ownerEpoch,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw currentOwnerError(response.status, body);
    return this.client(owner.slot).consumeSeatReservation(body as SeatReservation);
  }

  private fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const { fetcher } = this.dependencies;
    return fetcher(input, init);
  }

  private async withRoomTicket(options: AegisJoinOptions, slot: DeploymentSlot): Promise<AegisJoinOptions> {
    if (!options.ranked) return options;
    try {
      const { http } = this.dependencies.endpointForSlot(slot);
      const response = await this.fetch(`${http}/auth/room-ticket`, {
        method: "POST",
        credentials: "include",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return options;
      const { ticket } = (await response.json()) as { ticket: string };
      return { ...options, authTicket: ticket };
    } catch {
      return options;
    }
  }

  private async resolveRoomCode(code: string, slot: DeploymentSlot): Promise<string | undefined> {
    const { http } = this.dependencies.endpointForSlot(slot);
    const response = await this.fetch(`${http}/room/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: code.toUpperCase() }),
    });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Room lookup failed (${response.status})`);
    const { roomId } = (await response.json()) as { roomId: string };
    return roomId;
  }
}

function isDrainingResponse(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 503;
}

function currentOwnerError(status: number, body: unknown): CurrentOwnerResolutionError {
  const errorBody = isRecord(body) ? body : {};
  const code = typeof errorBody.error === "string" ? errorBody.error : "ROOM_OWNER_UNAVAILABLE";
  const ownerEpoch = Number.isSafeInteger(errorBody.ownerEpoch) ? (errorBody.ownerEpoch as number) : undefined;
  return new CurrentOwnerResolutionError(status, code, ownerEpoch);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

let productionRouter: AegisConnectionRouter | undefined;
let legacyClient: Client | undefined;

function useProductionRouter(): boolean {
  return usesSlotDeploymentRouter({
    production: import.meta.env.PROD,
    deploymentMode: import.meta.env.VITE_AEGIS_DEPLOYMENT_MODE,
  });
}

function getProductionRouter(): AegisConnectionRouter {
  productionRouter ??= new AegisConnectionRouter({
    loadManifest: () =>
      loadCurrentDeploymentManifest({
        bundleRevision: import.meta.env.VITE_AEGIS_REVISION,
        navigation: window.location,
      }),
    endpointForSlot: (slot) => deploymentEndpoint(window.location, slot),
    createClient: (endpoint) => {
      const client = new Client(endpoint);
      return {
        join: (name, options) => client.join<GameState>(name, options, GameState),
        joinOrCreate: (name, options) => client.joinOrCreate<GameState>(name, options, GameState),
        create: (name, options) => client.create<GameState>(name, options, GameState),
        joinById: (roomId, options) => client.joinById<GameState>(roomId, options, GameState),
        reconnect: (token) => client.reconnect<GameState>(token, GameState),
        consumeSeatReservation: (reservation) => client.consumeSeatReservation<GameState>(reservation, GameState),
      };
    },
    fetcher: fetch,
  });
  return productionRouter;
}

function legacyEndpoint(): string {
  return import.meta.env.VITE_AEGIS_API_URL ?? `ws://${window.location.hostname}:2567`;
}

function getLegacyClient(): Client {
  legacyClient ??= new Client(legacyEndpoint());
  return legacyClient;
}

function rememberLegacy(room: AegisRoom): AegisRoom {
  roomSlots.set(room, "legacy");
  roomHandoffMetadata.set(room, { enabled: false });
  return room;
}

/** Join an existing public/ranked match or create one on the active deployment. */
export async function joinOrCreate(options: AegisJoinOptions): Promise<AegisRoom> {
  if (useProductionRouter()) return getProductionRouter().joinOrCreate(options);
  const authenticatedOptions = await withLegacyRoomTicket(options);
  const joined = await getLegacyClient().joinOrCreate<GameState>(publicRoomType(options), authenticatedOptions);
  return rememberLegacy(joined);
}

/** Re-establish a dropped room through the slot that still owns it. */
export async function reconnect(reconnectionToken: string, slot: RoomSlot): Promise<AegisRoom> {
  if (slot !== "legacy") return getProductionRouter().reconnect(reconnectionToken, slot);
  return rememberLegacy(await getLegacyClient().reconnect<GameState>(reconnectionToken));
}

/** Resume a persisted seat using the owner directory only when the manifest opts in. */
export async function resumeReconnectSession(session: ReconnectSession): Promise<AegisRoom> {
  if (session.slot === "legacy") {
    return rememberLegacy(await getLegacyClient().reconnect<GameState>(session.reconnectionToken));
  }
  return getProductionRouter().resumeSession(session);
}

/** Ask the owning server to seat a bot as the second player. */
export async function joinWithBot(roomId: string, botDeckId?: string): Promise<void> {
  if (useProductionRouter()) return getProductionRouter().joinWithBot(roomId, botDeckId);
  const response = await fetch(`${legacyEndpoint().replace(/^ws/, "http")}/bot/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, botDeckId }),
  });
  if (!response.ok) throw new Error(`Bot join failed (${response.status})`);
}

/** Create an isolated one-human room for a match against the server bot. */
export async function createBot(options: AegisJoinOptions): Promise<AegisRoom> {
  if (useProductionRouter()) return getProductionRouter().createBot(options);
  const roomType = options.betaBattleMode ? ROOM_TYPE_BETA_BOT : ROOM_TYPE_BOT;
  const created = await getLegacyClient().create<GameState>(roomType, options);
  return rememberLegacy(created);
}

/** Create a private room on the active deployment. */
export async function createPrivate(options: AegisJoinOptions): Promise<AegisRoom> {
  if (useProductionRouter()) return getProductionRouter().createPrivate(options);
  const created = await getLegacyClient().create<GameState>(ROOM_TYPE_PRIVATE, { ...options, private: true });
  return rememberLegacy(created);
}

/** Resolve and join a private room on either the active or draining deployment. */
export async function joinPrivateByCode(code: string, options: AegisJoinOptions): Promise<AegisRoom> {
  if (useProductionRouter()) return getProductionRouter().joinPrivateByCode(code, options);
  const httpBase = legacyEndpoint().replace(/^ws/, "http");
  const response = await fetch(`${httpBase}/room/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode: code.toUpperCase() }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "room not found");
  }
  const { roomId } = (await response.json()) as { roomId: string };
  const joined = await getLegacyClient().joinById<GameState>(roomId, {
    ...options,
    roomCode: code.toUpperCase(),
  });
  return rememberLegacy(joined);
}

async function withLegacyRoomTicket(options: AegisJoinOptions): Promise<AegisJoinOptions> {
  if (!options.ranked) return options;
  try {
    const response = await fetch(`${legacyEndpoint().replace(/^ws/, "http")}/auth/room-ticket`, {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return options;
    const { ticket } = (await response.json()) as { ticket: string };
    return { ...options, authTicket: ticket };
  } catch {
    return options;
  }
}

/** Intents queued while disconnected are replayed after a successful reconnect. */
const pendingIntents: { type: string; payload: Record<string, unknown> }[] = [];
let handoffCommandQueue: HandoffCommandQueue<Intent> | undefined;

function getHandoffCommandQueue(): HandoffCommandQueue<Intent> {
  if (handoffCommandQueue) return handoffCommandQueue;
  if (typeof sessionStorage === "undefined") throw new Error("Session storage is unavailable for handoff commands");
  handoffCommandQueue = createHandoffCommandQueue<Intent>({
    storage: sessionStorage,
  });
  return handoffCommandQueue;
}

function sendHandoffCommand(room: AegisRoom, command: ReturnType<HandoffCommandQueue<Intent>["enqueue"]>): void {
  if (!room.connection?.isOpen) return;
  const { type: kind, ...payload } = command.intent;
  room.send("command", {
    gameId: command.gameId,
    ownerEpoch: command.ownerEpoch,
    commandId: command.commandId,
    sequence: command.tabSequence,
    kind,
    payload,
  });
}

export function sendIntent(room: AegisRoom, intent: Intent): void {
  const metadata = roomHandoffMetadata.get(room);
  if (metadata?.enabled) {
    const identity = metadata.identity;
    if (!identity) return;
    const command = getHandoffCommandQueue().enqueue({
      gameId: identity.gameId,
      ownerEpoch: identity.ownerEpoch,
      intent,
    });
    sendHandoffCommand(room, command);
    return;
  }
  const { type, ...payload } = intent;
  if (room.connection?.isOpen) room.send(type, payload);
  else pendingIntents.push({ type, payload });
}

export function flushIntents(room: AegisRoom): void {
  const metadata = roomHandoffMetadata.get(room);
  if (metadata?.enabled) {
    const identity = metadata.identity;
    if (!identity) return;
    const queue = getHandoffCommandQueue();
    for (const command of queue.rebasePendingOwnerEpoch(identity.gameId, identity.ownerEpoch)) {
      sendHandoffCommand(room, command);
    }
    return;
  }
  const queued = pendingIntents.splice(0);
  for (const { type, payload } of queued) {
    if (room.connection?.isOpen) room.send(type, payload);
    else pendingIntents.push({ type, payload });
  }
}

export function clearPendingIntents(): void {
  pendingIntents.length = 0;
}

export function reconcileHandoffCommandReceipt(room: AegisRoom, message: unknown): boolean {
  const metadata = roomHandoffMetadata.get(room);
  if (!metadata?.enabled || !metadata.identity || !isRecord(message)) return false;
  const receipt = message as Partial<HandoffCommandReceipt>;
  if (
    typeof receipt.commandId !== "string" ||
    !Number.isSafeInteger(receipt.sequence) ||
    !Number.isSafeInteger(receipt.ownerEpoch) ||
    !["admitted", "applied", "rejected"].includes(String(receipt.status))
  )
    return false;
  const status: HandoffCommandStatus = receipt.status === "admitted" ? "received" : receipt.status!;
  getHandoffCommandQueue().reconcile(metadata.identity.gameId, [{ commandId: receipt.commandId, status }]);
  updateRoomHandoffIdentity(room, { ownerEpoch: receipt.ownerEpoch });
  return true;
}
