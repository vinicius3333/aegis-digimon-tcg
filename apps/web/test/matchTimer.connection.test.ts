// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import { DECISION_CHANNEL, GameState, type DecisionRequest } from "@aegis/shared";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { startTestServer, type TestServer } from "./scenarioHarness/server";

let server: TestServer | undefined;
const rooms: Room<GameState>[] = [];
afterEach(async () => {
  await Promise.all(rooms.splice(0).map((room) => room.leave().catch(() => undefined)));
  await server?.close();
  server = undefined;
});

async function join(endpoint: string, matchTimer?: boolean, roomType = "aegis") {
  const room = await new Client(endpoint).joinOrCreate<GameState>(
    roomType,
    {
      displayName: `Clock tester ${rooms.length}`,
      deck: RED_DECK,
      betaBattleMode: roomType === "aegis_beta",
      ...(matchTimer === undefined ? {} : { matchTimer }),
    },
    GameState,
  );
  rooms.push(room);
  return room;
}

describe("match timer websocket contract", () => {
  it("separates timed and untimed normal and beta queues", async () => {
    server = await startTestServer();
    for (const type of ["aegis", "aegis_beta"]) {
      const off = await join(server.endpoint, false, type);
      const on = await join(server.endpoint, true, type);
      expect(on.roomId).not.toBe(off.roomId);
      const sameOff = await join(server.endpoint, false, type);
      const sameOn = await join(server.endpoint, true, type);
      expect(sameOff.roomId).toBe(off.roomId);
      expect(sameOn.roomId).toBe(on.roomId);
      await vi.waitFor(() => expect(on.state.matchTimer).toBe(true));
      expect(off.state.matchTimer).toBe(false);
    }
  }, 15_000);

  it("uses private host settings and preserves a ticking bank across a real reconnect", async () => {
    server = await startTestServer();
    const client = new Client(server.endpoint);
    const host = await client.create<GameState>(
      "aegis_private",
      { displayName: "Host", deck: RED_DECK, matchTimer: true, timerStartSeconds: 60, timerRefillSeconds: 0 },
      GameState,
    );
    rooms.push(host);
    await vi.waitFor(() => expect(host.state.roomCode.length).toBe(6));
    host.onMessage<DecisionRequest>(DECISION_CHANNEL, (request) => {
      if (request.kind === "mulligan") host.send("mulligan", { keep: true });
    });
    const guest = await new Client(server.endpoint).joinById<GameState>(
      host.roomId,
      {
        displayName: "Guest",
        deck: BLUE_DECK,
        roomCode: host.state.roomCode,
        matchTimer: false,
        timerStartSeconds: 600,
        timerRefillSeconds: 60,
      },
      GameState,
    );
    rooms.push(guest);
    guest.onMessage<DecisionRequest>(DECISION_CHANNEL, (request) => {
      if (request.kind === "mulligan") guest.send("mulligan", { keep: true });
    });
    host.send("ready", {});
    guest.send("ready", {});
    await vi.waitFor(() => expect(host.state.timerActiveSeat).not.toBe(-1), { timeout: 10_000 });
    expect(guest.state.matchTimer).toBe(true);
    expect(guest.state.timerStartSeconds).toBe(60);
    expect(guest.state.timerRefillSeconds).toBe(0);
    await vi.waitFor(() => expect(Math.min(host.state.timerRemaining0, host.state.timerRemaining1)).toBeLessThan(60), {
      timeout: 5000,
    });
    const before = [guest.state.timerRemaining0, guest.state.timerRemaining1];
    const token = host.reconnectionToken;
    const departed = new Promise<void>((resolve) => host.onLeave(() => resolve()));
    host.connection.close(4500, "timer reconnect test");
    await departed;
    rooms.splice(rooms.indexOf(host), 1);
    const resumed = await client.reconnect<GameState>(token, GameState);
    rooms.push(resumed);
    await vi.waitFor(() => expect(resumed.state.timerRemaining0).toBeLessThanOrEqual(before[0]!), { timeout: 3000 });
    expect(resumed.state.timerRemaining1).toBeLessThanOrEqual(before[1]!);
    expect(resumed.state.matchTimer).toBe(true);
    expect(resumed.state.timerRefillSeconds).toBe(0);
  }, 20_000);
});
