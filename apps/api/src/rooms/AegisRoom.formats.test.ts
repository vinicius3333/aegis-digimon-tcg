import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalPresence, type Client } from "colyseus";
import { GameState, type DeckFormat } from "@aegis/shared";
import { AegisRoom } from "./AegisRoom.js";
import { CasualSeries, type SeriesRoomPort } from "./series/CasualSeries.js";
import { RED_DECK } from "../engine/testDecks.js";
import { playableBotDeck } from "../engine/botDeck.js";
import { seriesDirectory, setSeriesDirectory, createSeriesDirectory } from "./series/SeriesDirectory.js";

const rooms: AegisRoom[] = [];
function room(format: DeckFormat, options = {}) {
  const created = new AegisRoom();
  created.lock = vi.fn(async () => {});
  created.unlock = vi.fn(async () => {});
  created.setMatchmaking = vi.fn(async () => {});
  created.broadcast = vi.fn(() => true) as AegisRoom["broadcast"];
  rooms.push(created);
  created.onCreate({ seed: 1, allowFormatSelection: true, format, ...options });
  return created;
}
function client(id: string): Client {
  return { sessionId: id, send: vi.fn() } as unknown as Client;
}
afterEach(() => {
  for (const created of rooms.splice(0)) created.onDispose();
  setSeriesDirectory(createSeriesDirectory(new LocalPresence()));
});

describe("room format boundaries", () => {
  it("matches only a client that asked for the room's format", async () => {
    const historical = room("BT13");
    expect(await historical.onAuth(client("standard"), { displayName: "Standard", deck: RED_DECK })).toBe(false);
    expect(await historical.onAuth(client("pauper"), { displayName: "Pauper", deck: RED_DECK, format: "pauper" })).toBe(
      false,
    );
    expect(
      await historical.onAuth(client("historical"), { displayName: "Historical", deck: RED_DECK, format: "BT13" }),
    ).toBe(true);
  });
  it("validates a private guest against fixed host rules despite a forged format", () => {
    const historical = room("BT13", { private: true, betaBattleRoom: true });
    expect(historical.privateRoomInfo()).toMatchObject({ format: "BT13", unlimited: false });
    const deck = { mainDeck: [...RED_DECK.mainDeck], eggDeck: [...RED_DECK.eggDeck] };
    deck.mainDeck[0] = "BT14-033";
    expect(() =>
      historical.onJoin(client("guest"), { displayName: "Guest", deck, format: "unlimited", unlimited: true }),
    ).toThrow(/BT13 card pool/);
    expect(historical.state.players).toHaveLength(0);
  });
  it.each([{ rankedRoom: true }, { tournamentRoom: true }, { betaBattleRoom: true }])(
    "keeps competitive and beta queues on Standard (%j)",
    (options) => {
      expect(() => room("pauper", options)).toThrow(/requires Standard/);
    },
  );
  it("freezes the format in a best-of-three and restores it in the next room", async () => {
    const directory = createSeriesDirectory(new LocalPresence());
    setSeriesDirectory(directory);
    const nextRoom = vi.fn(async (options: { seriesId: string; seriesNonce: string }) => {
      const record = await seriesDirectory().load(options.seriesId);
      expect(record?.format).toBe("BT13");
      const continuation = new AegisRoom();
      rooms.push(continuation);
      continuation.roomName = "aegis";
      continuation.setMatchmaking = vi.fn(async () => {});
      continuation.setPrivate = vi.fn(async () => {});
      await continuation.onCreate({ ...options, format: "pauper", allowFormatSelection: true });
      expect(continuation.state.format).toBe("BT13");
      return "next-room";
    });
    const port = {
      state: new GameState(),
      roomName: "aegis",
      setTimeout: vi.fn(() => ({ clear() {} })),
      setInterval: vi.fn(() => ({ clear() {} })),
      seatSnapshot: (seat: number) => ({ displayName: `Tamer ${seat}`, deck: RED_DECK }),
      sendToSeat: vi.fn(),
      createNextRoom: nextRoom,
      logError: vi.fn(),
    } as unknown as SeriesRoomPort;
    const series = CasualSeries.begin(port, { bestOf: 3, matchTimer: false, timerStartSeconds: 300, format: "BT13" });
    series.recordGame(0, undefined);
    series.handleMessage(1, { action: "chooseTurnOrder", goFirst: true }, false);
    await vi.waitFor(() => expect(nextRoom).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(port.state.series.nextRoomId).toBe("next-room"));
    expect(port.logError).not.toHaveBeenCalled();
    series.dispose();
  });

  it("seats Pauper humans and bots with the same format gate", () => {
    const pauper = room("pauper", { botRoom: true });
    const human = client("human");
    pauper.clients.push(human);
    pauper.onJoin(human, { displayName: "Human", deck: playableBotDeck(undefined, false, "pauper"), format: "pauper" });
    expect(pauper.addBot()).toBe(true);
    expect(pauper.state.players).toHaveLength(2);
    expect(pauper.state.format).toBe("pauper");
  });
});
