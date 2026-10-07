import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "colyseus";
import { CHAT_CHANNEL, CHAT_COOLDOWN_MS, type ChatBroadcast } from "@aegis/shared";
import { AegisRoom } from "./AegisRoom.js";

const EMPTY_DECK = { mainDeck: [], eggDeck: [] };

function fakeClient(sessionId: string): Client {
  return { sessionId, send: vi.fn<() => void>(), view: undefined } as unknown as Client;
}

function makeRoom(): { room: AegisRoom; chats: ChatBroadcast[] } {
  const room = new AegisRoom();
  room.lock = vi.fn<() => Promise<void>>(async () => {});
  room.unlock = vi.fn<() => Promise<void>>(async () => {});
  room.setMatchmaking = vi.fn<() => Promise<void>>(async () => {});
  const chats: ChatBroadcast[] = [];
  room.broadcast = vi.fn<(type: string, message: unknown) => boolean>((type, message) => {
    if (type === CHAT_CHANNEL) chats.push(message as ChatBroadcast);
    return true;
  }) as AegisRoom["broadcast"];
  room.onCreate({ seed: 1 });
  return { room, chats };
}

function joinBothSeats(room: AegisRoom): [Client, Client] {
  const a = fakeClient("session-a");
  const b = fakeClient("session-b");
  room.clients.push(a);
  room.onJoin(a, { displayName: "A", deck: EMPTY_DECK });
  room.clients.push(b);
  room.onJoin(b, { displayName: "B", deck: EMPTY_DECK });
  return [a, b];
}

function chatSender(room: AegisRoom): (client: Client, payload: unknown) => void {
  return (room as unknown as { handleChat: (c: Client, p: unknown) => void }).handleChat.bind(room);
}

describe("AegisRoom chat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("broadcasts a seated player's emote and text with the sender's seat", () => {
    const { room, chats } = makeRoom();
    try {
      const [a, b] = joinBothSeats(room);
      const send = chatSender(room);
      const now = vi.spyOn(Date, "now").mockReturnValue(10_000);
      send(a, { kind: "emote", emote: "offense" });
      now.mockReturnValue(10_000 + CHAT_COOLDOWN_MS);
      send(a, { kind: "text", text: "  good   luck " });
      send(b, { kind: "emote", emote: "praise" });
      expect(chats).toEqual([
        { sender: { kind: "player", seat: 0 }, message: { kind: "emote", emote: "offense" } },
        { sender: { kind: "player", seat: 0 }, message: { kind: "text", text: "good luck" } },
        { sender: { kind: "player", seat: 1 }, message: { kind: "emote", emote: "praise" } },
      ]);
    } finally {
      room.onDispose();
    }
  });

  it("masks blocked words before broadcasting text", () => {
    const { room, chats } = makeRoom();
    try {
      const [a] = joinBothSeats(room);
      chatSender(room)(a, { kind: "text", text: "what the fuck" });
      expect(chats.map((chat) => chat.message)).toEqual([{ kind: "text", text: "what the ****" }]);
    } finally {
      room.onDispose();
    }
  });

  it("drops a second message from the same seat inside the cooldown", () => {
    const { room, chats } = makeRoom();
    try {
      const [a] = joinBothSeats(room);
      const send = chatSender(room);
      const now = vi.spyOn(Date, "now").mockReturnValue(10_000);
      send(a, { kind: "emote", emote: "offense" });
      now.mockReturnValue(10_000 + CHAT_COOLDOWN_MS - 1);
      send(a, { kind: "emote", emote: "defense" });
      expect(chats.map((chat) => chat.message)).toEqual([{ kind: "emote", emote: "offense" }]);
    } finally {
      room.onDispose();
    }
  });

  it("numbers spectators in the order they first write and gives each its own cooldown", () => {
    const { room, chats } = makeRoom();
    try {
      joinBothSeats(room);
      const watching = (room as unknown as { spectatorClients: Set<string> }).spectatorClients;
      watching.add("watcher-a");
      watching.add("watcher-b");
      const send = chatSender(room);
      vi.spyOn(Date, "now").mockReturnValue(10_000);
      send(fakeClient("watcher-b"), { kind: "text", text: "nice play" });
      send(fakeClient("watcher-a"), { kind: "emote", emote: "praise" });
      send(fakeClient("watcher-b"), { kind: "text", text: "too soon" });
      expect(chats).toEqual([
        {
          sender: { kind: "spectator", sessionId: "watcher-b", number: 1 },
          message: { kind: "text", text: "nice play" },
        },
        {
          sender: { kind: "spectator", sessionId: "watcher-a", number: 2 },
          message: { kind: "emote", emote: "praise" },
        },
      ]);
    } finally {
      room.onDispose();
    }
  });

  it("silently ignores clients that are neither seated nor watching, and invalid payloads", () => {
    const { room, chats } = makeRoom();
    try {
      const [a] = joinBothSeats(room);
      const send = chatSender(room);
      send(fakeClient("stranger"), { kind: "emote", emote: "scold" });
      send(a, { kind: "emote", emote: "digivolve" });
      send(a, { kind: "text", text: "   " });
      expect(chats).toEqual([]);
      expect(a.send).not.toHaveBeenCalled();
    } finally {
      room.onDispose();
    }
  });
});
