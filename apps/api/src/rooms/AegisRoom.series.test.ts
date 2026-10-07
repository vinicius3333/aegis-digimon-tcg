import { describe, expect, it, vi } from "vitest";
import type { Client } from "colyseus";
import { Decoder } from "@colyseus/schema";
import { GameState, type Seat } from "@aegis/shared";
import { AegisRoom } from "./AegisRoom.js";
import { RED_DECK } from "../engine/testDecks.js";

const JOINED = 1;

interface DecodingClient {
  client: Client;
  decoder: Decoder<GameState>;
}

function decodingClient(sessionId: string): DecodingClient {
  const decoder = new Decoder(new GameState());
  const client = {
    sessionId,
    state: JOINED,
    view: undefined,
    send: vi.fn<(type: string, message: unknown) => void>(),
    raw: (bytes: Uint8Array) => {
      decoder.decode(bytes, { offset: 1 });
    },
    enqueueRaw: vi.fn<(bytes: Uint8Array) => void>(),
  } as unknown as Client;
  return { client, decoder };
}

function makeSeriesRoom(seats: Record<string, Seat>): AegisRoom {
  const room = new AegisRoom();
  room.lock = vi.fn<() => Promise<void>>(async () => {});
  room.unlock = vi.fn<() => Promise<void>>(async () => {});
  room.setMatchmaking = vi.fn<AegisRoom["setMatchmaking"]>(async () => {});
  // The matchmaker's own boot step: it installs the `state` setter that attaches the real
  // SchemaSerializer, so full-state syncs and patches go through production encoding.
  (room as unknown as Record<string, () => void>)["__init"]!.call(room);
  room.onCreate({ seed: 1 });
  const seriesSeatByClient = (room as unknown as { seriesSeatByClient: Map<string, Seat> }).seriesSeatByClient;
  for (const [sessionId, seat] of Object.entries(seats)) seriesSeatByClient.set(sessionId, seat);
  return room;
}

function join(room: AegisRoom, joiner: DecodingClient): void {
  room.clients.push(joiner.client);
  room.onJoin(joiner.client, { displayName: joiner.client.sessionId, deck: RED_DECK });
}

function syncFullState(room: AegisRoom, joiner: DecodingClient): void {
  (room as unknown as { sendFullState(client: Client): void }).sendFullState(joiner.client);
}

function sendIntent(room: AegisRoom, joiner: DecodingClient, intent: { type: string }): void {
  (room as unknown as { handleIntent(client: Client, intent: { type: string }): void }).handleIntent(
    joiner.client,
    intent,
  );
}

function viewerSeat(joiner: DecodingClient): Seat | undefined {
  const players = joiner.decoder.state.players;
  for (const seat of [0, 1] as const) if (players[seat]?.sessionId === joiner.client.sessionId) return seat;
  return undefined;
}

describe("AegisRoom casual series continuation", () => {
  it.each(["before", "after"] as const)(
    "Discord 1557352131416035499: the seat-1 player who arrives first sees their own seat and dealt hand (full state %s the other arrival)",
    (fullStateTiming) => {
      const lynx = decodingClient("lynx");
      const keybz = decodingClient("keybz");
      const room = makeSeriesRoom({ keybz: 0, lynx: 1 });

      join(room, lynx);
      if (fullStateTiming === "before") {
        syncFullState(room, lynx);
        sendIntent(room, lynx, { type: "ready" });
        room.broadcastPatch();
      }
      join(room, keybz);
      syncFullState(room, keybz);
      if (fullStateTiming === "after") {
        syncFullState(room, lynx);
        sendIntent(room, lynx, { type: "ready" });
      }
      room.broadcastPatch();
      sendIntent(room, keybz, { type: "ready" });
      room.broadcastPatch();

      expect(room.state.pendingDecision).toMatchObject({ kind: "mulligan" });
      expect(viewerSeat(keybz)).toBe(0);
      expect(viewerSeat(lynx)).toBe(1);
      expect(lynx.decoder.state.players[1]!.hand.length).toBe(5);
      expect(lynx.decoder.state.players[1]!.hand.every((card) => card.cardId !== "")).toBe(true);
    },
  );
});
