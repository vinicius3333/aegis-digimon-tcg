import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "colyseus";
import { EVENT_CHANNEL } from "@aegis/shared";
import { AegisRoom } from "./AegisRoom.js";

const EMPTY_DECK = { mainDeck: [], eggDeck: [] };

function fakeClient(sessionId: string): Client {
  return { sessionId, send: vi.fn<() => void>(), leave: vi.fn<() => void>(), view: undefined } as unknown as Client;
}

function makeRoom(): { room: AegisRoom; client: Client } {
  const room = new AegisRoom();
  room.lock = vi.fn<() => Promise<void>>(async () => {});
  room.unlock = vi.fn<() => Promise<void>>(async () => {});
  room.setMatchmaking = vi.fn<() => Promise<void>>(async () => {});
  room.broadcast = vi.fn<() => boolean>(() => true) as unknown as AegisRoom["broadcast"];
  room.onCreate({ seed: 1 });
  const client = fakeClient("session-a");
  room.clients.push(client);
  room.onJoin(client, { displayName: "A", deck: EMPTY_DECK });
  const other = fakeClient("session-b");
  room.clients.push(other);
  room.onJoin(other, { displayName: "B", deck: EMPTY_DECK });
  return { room, client };
}

function sendIntent(room: AegisRoom, client: Client, intent: Record<string, unknown>): void {
  (room as unknown as { handleIntent: (c: Client, i: unknown) => void }).handleIntent(client, intent);
}

function rejectionReasons(client: Client): unknown[] {
  return (client.send as ReturnType<typeof vi.fn>).mock.calls
    .filter(([channel, event]) => channel === EVENT_CHANNEL && (event as { kind?: string }).kind === "actionRejected")
    .map(([, event]) => (event as { reason: unknown }).reason);
}

describe("AegisRoom intent safety", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects a malformed intent before it reaches the engine", () => {
    const { room, client } = makeRoom();
    try {
      const applyIntent = vi.spyOn(
        (room as unknown as { engine: { applyIntent: (...args: unknown[]) => unknown } }).engine,
        "applyIntent",
      );
      expect(() =>
        sendIntent(room, client, { type: "playCard", instanceId: "card", digiXros: ["material-a", "material-b"] }),
      ).not.toThrow();
      expect(() => sendIntent(room, client, { type: "respondCounter", effectKey: 7 })).not.toThrow();
      expect(applyIntent).not.toHaveBeenCalled();
      expect(rejectionReasons(client)).toEqual(["malformed-intent", "malformed-intent"]);
    } finally {
      room.onDispose();
    }
  });

  it("turns an engine failure into a rejection instead of an uncaught exception", () => {
    const { room, client } = makeRoom();
    try {
      vi.spyOn(
        (room as unknown as { engine: { applyIntent: (...args: unknown[]) => unknown } }).engine,
        "applyIntent",
      ).mockImplementation(() => {
        throw new TypeError("engine bug");
      });
      expect(() => sendIntent(room, client, { type: "endPhase" })).not.toThrow();
      expect(rejectionReasons(client)).toEqual(["internal-error"]);
    } finally {
      room.onDispose();
    }
  });
});
