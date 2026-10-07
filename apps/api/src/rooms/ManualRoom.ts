import { liveRooms } from "./liveRooms.js";
import { randomBytes } from "node:crypto";
import { Room, ServerError, type Client } from "colyseus";
import {
  GameState,
  MANUAL_COMMAND,
  MANUAL_SNAPSHOT,
  MANUAL_ERROR,
  MANUAL_SYNC,
  MANUAL_RECONNECT_GRACE_SECONDS,
  type Seat,
} from "@aegis/shared";
import { canCreateRoom } from "../deployment/admission.js";
import { roomCodeDirectory } from "./AegisRoom.js";
import { ManualTable } from "../manual/ManualTable.js";

interface JoinOptions {
  manualMode?: boolean;
  roomCode?: string;
  displayName: string;
  deck: Parameters<ManualTable["join"]>[1];
}

/** Filtered snapshots are sent per seat; no private table state enters Schema. */
export class ManualRoom extends Room<{ state: GameState }> {
  private table = new ManualTable();
  private seats = new Map<string, Seat>();
  private privateRoom = false;
  private code = "";
  private rate = new Map<string, { at: number; count: number }>();

  override async onCreate(options: { manualPrivate?: boolean }): Promise<void> {
    if (!canCreateRoom()) throw new ServerError(503, "This game server is draining; retry on the active slot.");
    this.maxClients = 2;
    this.privateRoom = options.manualPrivate === true;
    this.setState(new GameState());
    await this.setPrivate(this.privateRoom);
    if (this.privateRoom) {
      const directory = roomCodeDirectory();
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
        if (!(await directory.resolve(candidate))) {
          this.code = candidate;
          break;
        }
      }
      if (!this.code) throw new ServerError(503, "Could not allocate room code");
      directory.claim(this.code, this.roomId);
    }
    await this.setMetadata({ manual: true, private: this.privateRoom, roomCode: this.code });
    liveRooms.set(this.roomId, this);
    this.onMessage(MANUAL_SYNC, (client) => this.sendSnapshot(client));
    this.onMessage(MANUAL_COMMAND, (client, command: unknown) => this.command(client, command));
  }

  override onAuth(_client: Client, options: JoinOptions): boolean {
    return (
      options.manualMode === true &&
      this.table.state.players.length < 2 &&
      this.table.state.players.every((player) => player.connected) &&
      (!this.privateRoom || this.table.state.players.length === 0 || options.roomCode === this.code)
    );
  }

  override onJoin(client: Client, options: JoinOptions): void {
    const seat = this.table.join(options.displayName, options.deck);
    this.seats.set(client.sessionId, seat);
    if (this.table.state.players.length === 2) void this.lock();
    this.sendAll();
  }

  private command(client: Client, payload: unknown): void {
    const seat = this.seats.get(client.sessionId);
    if (seat === undefined) return;
    const now = Date.now();
    const rate = this.rate.get(client.sessionId);
    if (rate && now - rate.at < 1000 && rate.count >= 20) {
      client.send(MANUAL_ERROR, "Too many actions. Try again.");
      return;
    }
    this.rate.set(
      client.sessionId,
      rate && now - rate.at < 1000 ? { ...rate, count: rate.count + 1 } : { at: now, count: 1 },
    );
    try {
      this.table.apply(seat, payload);
      this.sendAll();
    } catch (error) {
      client.send(MANUAL_ERROR, error instanceof Error ? error.message : "Invalid action");
      this.sendSnapshot(client);
    }
  }

  private sendSnapshot(client: Client): void {
    const seat = this.seats.get(client.sessionId);
    if (seat !== undefined) client.send(MANUAL_SNAPSHOT, this.table.snapshot(seat, this.code));
  }
  private sendAll(): void {
    for (const client of this.clients) this.sendSnapshot(client);
  }

  override async onLeave(client: Client, code: number): Promise<void> {
    const seat = this.seats.get(client.sessionId);
    if (seat === undefined) return;
    this.table.setConnected(seat, false);
    await this.lock();
    this.sendAll();
    try {
      if (code === 1000 || code === 4000) throw new Error("Left table");
      const reconnected = await this.allowReconnection(client, MANUAL_RECONNECT_GRACE_SECONDS);
      this.seats.delete(client.sessionId);
      this.seats.set(reconnected.sessionId, seat);
      this.table.setConnected(seat, true);
      if (this.table.state.players.length === 1) await this.unlock();
      this.sendAll();
    } catch {
      this.seats.delete(client.sessionId);
      if (this.table.state.players.length === 2 && this.table.state.phase !== "over") {
        this.table.setConnected(seat, true);
        this.table.apply(seat, { revision: this.table.state.revision, action: { type: "concede" } });
        this.table.setConnected(seat, false);
      } else if (this.table.state.players.length === 1) {
        void this.disconnect();
      }
      this.sendAll();
    } finally {
      this.rate.delete(client.sessionId);
    }
  }

  override onDispose(): void {
    liveRooms.delete(this.roomId);
    if (this.code) roomCodeDirectory().release(this.code, this.roomId);
  }
}
