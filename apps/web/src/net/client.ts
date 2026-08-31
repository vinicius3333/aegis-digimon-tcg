import { Client, type Room } from "colyseus.js";
import { GameState, ROOM_TYPE, ROOM_TYPE_BOT, ROOM_TYPE_PRIVATE, ROOM_TYPE_RANKED, type Intent } from "@aegis/shared";
import {
  deploymentEndpoint,
  loadCurrentDeploymentManifest,
  type DeploymentManifest,
  type DeploymentSlot,
  usesSlotDeploymentRouter,
} from "./deployment";
import type { AegisJoinOptions } from "./types";

export type AegisRoom = Room<GameState>;
export type RoomSlot = DeploymentSlot | "legacy";

export interface ColyseusClientPort {
  join: (roomName: string, options: AegisJoinOptions) => Promise<AegisRoom>;
  joinOrCreate: (roomName: string, options: AegisJoinOptions) => Promise<AegisRoom>;
  create: (roomName: string, options: AegisJoinOptions & { private?: boolean }) => Promise<AegisRoom>;
  joinById: (roomId: string, options: AegisJoinOptions & { roomCode?: string }) => Promise<AegisRoom>;
  reconnect: (reconnectionToken: string) => Promise<AegisRoom>;
}

interface RouterDependencies {
  loadManifest: () => Promise<DeploymentManifest>;
  endpointForSlot: (slot: DeploymentSlot) => { http: string; websocket: string };
  createClient: (endpoint: string, slot: DeploymentSlot) => ColyseusClientPort;
  fetcher: typeof fetch;
}

const roomSlots = new WeakMap<AegisRoom, RoomSlot>();

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
    const roomName = options.ranked ? ROOM_TYPE_RANKED : ROOM_TYPE;

    for (const deployment of manifest.draining) {
      const slotOptions = await this.withRoomTicket(options, deployment.slot);
      try {
        const joined = await this.client(deployment.slot).join(roomName, slotOptions);
        return this.remember(joined, deployment.slot);
      } catch {
        // A draining slot may have no compatible waiting room. It is forbidden
        // from creating one, so new matchmaking continues on the active slot.
      }
    }

    const activeOptions = await this.withRoomTicket(options, manifest.active.slot);
    try {
      const joined = await this.client(manifest.active.slot).joinOrCreate(roomName, activeOptions);
      return this.remember(joined, manifest.active.slot);
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
    return this.remember(created, manifest.active.slot);
  }

  async createBot(options: AegisJoinOptions): Promise<AegisRoom> {
    return this.createBotWithFreshManifest(options, false);
  }

  private async createBotWithFreshManifest(options: AegisJoinOptions, retriedAfterDrain: boolean): Promise<AegisRoom> {
    const manifest = await this.dependencies.loadManifest();
    try {
      const created = await this.client(manifest.active.slot).create(ROOM_TYPE_BOT, options);
      return this.remember(created, manifest.active.slot);
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
      return this.remember(joined, slot);
    }
    throw new Error("room not found");
  }

  async reconnect(reconnectionToken: string, slot: DeploymentSlot): Promise<AegisRoom> {
    const reconnected = await this.client(slot).reconnect(reconnectionToken);
    return this.remember(reconnected, slot);
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

  private remember(room: AegisRoom, slot: DeploymentSlot): AegisRoom {
    roomSlots.set(room, slot);
    this.slotByRoomId.set(room.roomId, slot);
    return room;
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
    createClient: (endpoint) => new Client(endpoint),
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
  return room;
}

/** Join an existing public/ranked match or create one on the active deployment. */
export async function joinOrCreate(options: AegisJoinOptions): Promise<AegisRoom> {
  if (useProductionRouter()) return getProductionRouter().joinOrCreate(options);
  const authenticatedOptions = await withLegacyRoomTicket(options);
  const joined = await getLegacyClient().joinOrCreate<GameState>(
    options.ranked ? ROOM_TYPE_RANKED : ROOM_TYPE,
    authenticatedOptions,
  );
  return rememberLegacy(joined);
}

/** Re-establish a dropped room through the slot that still owns it. */
export async function reconnect(reconnectionToken: string, slot: RoomSlot): Promise<AegisRoom> {
  if (slot !== "legacy") return getProductionRouter().reconnect(reconnectionToken, slot);
  return rememberLegacy(await getLegacyClient().reconnect<GameState>(reconnectionToken));
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
  const created = await getLegacyClient().create<GameState>(ROOM_TYPE_BOT, options);
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

export function sendIntent(room: AegisRoom, intent: Intent): void {
  const { type, ...payload } = intent;
  if (room.connection?.isOpen) room.send(type, payload);
  else pendingIntents.push({ type, payload });
}

export function flushIntents(room: AegisRoom): void {
  const queued = pendingIntents.splice(0);
  for (const { type, payload } of queued) {
    if (room.connection?.isOpen) room.send(type, payload);
    else pendingIntents.push({ type, payload });
  }
}

export function clearPendingIntents(): void {
  pendingIntents.length = 0;
}
