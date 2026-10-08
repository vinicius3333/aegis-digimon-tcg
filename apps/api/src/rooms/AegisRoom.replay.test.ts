import { gunzipSync } from "node:zlib";
import { CloseCode, type Client } from "colyseus";
import { REPLAY_CHANNEL, REPLAY_SAVE_CHANNEL, type MatchReplay, type ReplayDownloadMessage } from "@aegis/shared";
import type { ReplayLibrary } from "../replays/ReplayLibrary.js";
import { ReplayLibraryError } from "../replays/ReplayLibrary.js";
import type { SeriesRecord } from "./series/SeriesDirectory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AegisRoom } from "./AegisRoom.js";
import { RED_DECK, BLUE_DECK } from "../engine/testDecks.js";

const rooms: AegisRoom[] = [];
afterEach(() => {
  for (const room of rooms.splice(0)) room.onDispose();
});
async function start(bestOf = 1) {
  const room = new AegisRoom();
  rooms.push(room);
  room.lock = vi.fn<typeof room.lock>(async () => {});
  room.unlock = vi.fn<typeof room.unlock>(async () => {});
  room.setMatchmaking = vi.fn<typeof room.setMatchmaking>(async () => {});
  room.broadcast = vi.fn<typeof room.broadcast>(() => true);
  await room.onCreate({ seed: 1, bestOf });
  const players = ["a", "b"].map((sessionId) => ({ sessionId, send: vi.fn<Client["send"]>() }) as unknown as Client);
  for (const [seat, client] of players.entries()) {
    room.clients.push(client);
    room.onJoin(client, { displayName: `Player ${seat}`, deck: seat === 0 ? RED_DECK : BLUE_DECK });
  }
  const send = (client: Client, type: string) => Reflect.get(room, "handleIntent").call(room, client, { type });
  send(players[0]!, "ready");
  send(players[1]!, "ready");
  return { room, players, send };
}
function replayOf(client: Client): MatchReplay | undefined {
  const message = vi.mocked(client.send).mock.calls.find(([channel]) => channel === REPLAY_CHANNEL)?.[1] as
    | ReplayDownloadMessage
    | undefined;
  if (message?.kind !== "ready") return undefined;
  return JSON.parse(gunzipSync(Buffer.from(message.data, "base64")).toString());
}

describe("room replay delivery", () => {
  it("saves only the seated account's authoritative completed export and reports the limit", async () => {
    const { room, players, send } = await start();
    const client = players[0]!;
    (Reflect.get(room, "accountByClient") as Map<string, string>).set(client.sessionId, "trusted-owner");
    const save = vi.fn<ReplayLibrary["save"]>(async () => {
      throw new ReplayLibraryError("limit");
    });
    Reflect.set(room, "replays", () => ({ enabled: true, save }));
    const request = () => Reflect.get(room, "saveParticipantReplay").call(room, client) as Promise<void>;
    await request();
    expect(save).not.toHaveBeenCalled();
    send(players[1]!, "surrender");
    await vi.waitFor(() => expect(replayOf(client)).toBeDefined());
    await request();
    expect(save).toHaveBeenCalledWith("trusted-owner", expect.objectContaining({ kind: "ready", viewerSeat: 0 }));
    const exported = save.mock.calls[0]![1];
    expect(JSON.parse(gunzipSync(Buffer.from(exported.data, "base64")).toString())).toEqual(replayOf(client));
    expect(
      vi
        .mocked(client.send)
        .mock.calls.filter(([channel]) => channel === REPLAY_SAVE_CHANNEL)
        .at(-1)?.[1],
    ).toEqual({ kind: "failed", reason: "limit" });
  });
  it("refuses guest and spectator saves and coalesces concurrent save requests", async () => {
    const { room, players, send } = await start();
    send(players[1]!, "surrender");
    await vi.waitFor(() => expect(replayOf(players[0]!)).toBeDefined());
    const save = vi.fn<ReplayLibrary["save"]>(async () => ({
      id: "saved-id",
      summary: { ...replayOf(players[0]!)!, frames: undefined } as never,
      viewerSeat: 0,
      bytes: 1,
      savedAt: 1,
      status: "ready",
    }));
    Reflect.set(room, "replays", () => ({ enabled: true, save }));
    const request = (client: Client) => Reflect.get(room, "saveParticipantReplay").call(room, client) as Promise<void>;
    await request(players[0]!);
    expect(save).not.toHaveBeenCalled();
    const spectator = { sessionId: "observer", send: vi.fn<Client["send"]>() } as unknown as Client;
    room.clients.push(spectator);
    (Reflect.get(room, "spectatorClients") as Set<string>).add(spectator.sessionId);
    (Reflect.get(room, "accountByClient") as Map<string, string>).set(spectator.sessionId, "observer-owner");
    await request(spectator);
    expect(save).not.toHaveBeenCalled();
    (Reflect.get(room, "accountByClient") as Map<string, string>).set(players[0]!.sessionId, "trusted-owner");
    await Promise.all([request(players[0]!), request(players[0]!), request(players[0]!)]);
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("restores the server-owned account identity for continuation games before saving", async () => {
    const { room, players, send } = await start(3);
    const client = players[0]!;
    const series = Reflect.get(room, "casualSeries");
    const original = series.seatForToken.bind(series);
    series.seatForToken = (token: unknown) => (token === "trusted-series-token" ? 0 : undefined);
    const record = {
      seats: [
        { token: "trusted-series-token", accountId: "original-account", displayName: "Original", deck: RED_DECK },
        { token: "other", displayName: "Other", deck: BLUE_DECK },
      ],
    } as SeriesRecord;
    const options = { seriesToken: "trusted-series-token", accountId: "forged-client-account" };
    expect(Reflect.get(room, "authorizeSeriesSeat").call(room, client, options, record)).toBe(true);
    series.seatForToken = original;
    expect((Reflect.get(room, "accountByClient") as Map<string, string>).get(client.sessionId)).toBe(
      "original-account",
    );
    const save = vi.fn<ReplayLibrary["save"]>(async () => {
      throw new ReplayLibraryError("limit");
    });
    Reflect.set(room, "replays", () => ({ enabled: true, save }));
    send(players[1]!, "surrender");
    await vi.waitFor(() => expect(replayOf(client)).toBeDefined());
    await Reflect.get(room, "saveParticipantReplay").call(room, client);
    expect(save).toHaveBeenCalledWith("original-account", expect.objectContaining({ kind: "ready" }));
  });
  it("starts at the ready-gated match, captures surrender, and sends each player a different file, never the observer", async () => {
    const { room, players, send } = await start();
    expect(replayOf(players[0]!)).toBeUndefined();
    const spectator = { sessionId: "observer", send: vi.fn<Client["send"]>() } as unknown as Client;
    room.clients.push(spectator);
    (Reflect.get(room, "spectatorClients") as Set<string>).add(spectator.sessionId);
    const hands = room.state.players.map((player) => player.hand.map((card) => card.cardId));
    send(players[0]!, "surrender");
    await vi.waitFor(() => expect(replayOf(players[0]!)).toBeDefined());
    for (const [seat, client] of players.entries()) {
      const replay = replayOf(client)!;
      expect(replay.viewerSeat).toBe(seat);
      expect(replay.frames[0]!.events.some((entry) => entry.kind === "matchStarted")).toBe(true);
      expect(replay.frames[0]!.state.players[seat]!.hand.map((card) => card.cardId)).toEqual(hands[seat]);
      expect(replay.frames[0]!.state.players[1 - seat]!.hand.map((card) => card.cardId)).toEqual(hands[1 - seat]);
      expect(replay.frames.at(-1)!.state.gameOver).toBe(true);
      expect(replay.frames.at(-1)!.events.some((entry) => entry.kind === "gameOver")).toBe(true);
      expect(
        replay.frames.every(
          (frame, index) => index === 0 || frame.state.stateVersion > replay.frames[index - 1]!.state.stateVersion,
        ),
      ).toBe(true);
    }
    expect(spectator.send).not.toHaveBeenCalled();
  });
  it("captures a consenting departure without requiring account persistence", async () => {
    const { room, players } = await start();
    await room.onLeave(players[0]!, CloseCode.CONSENTED);
    await vi.waitFor(() => expect(replayOf(players[1]!)).toBeDefined());
    expect(replayOf(players[1]!)!.winnerSeat).toBe(1);
  });
  it("re-delivers the completed file to a new socket carrying the returning player's session", async () => {
    const { room, players, send } = await start();
    send(players[1]!, "surrender");
    await vi.waitFor(() => expect(replayOf(players[0]!)).toBeDefined());
    const original = replayOf(players[0]!)!;
    const returning = { sessionId: players[0]!.sessionId, send: vi.fn<Client["send"]>() } as unknown as Client;
    room.clients.splice(room.clients.indexOf(players[0]!), 1, returning);
    room.allowReconnection = vi.fn<() => Promise<Client>>(
      async () => returning,
    ) as unknown as AegisRoom["allowReconnection"];
    await room.onLeave(players[0]!, CloseCode.WITH_ERROR);
    await vi.waitFor(() => expect(replayOf(returning)).toBeDefined());
    expect(replayOf(returning)).toEqual(original);
    expect(replayOf(returning)!.frames.at(-1)!.state.gameOver).toBe(true);
  });
});
