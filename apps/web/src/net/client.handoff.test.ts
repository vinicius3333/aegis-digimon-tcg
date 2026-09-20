// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AegisConnectionRouter,
  reconcileHandoffCommandReceipt,
  sendIntent,
  updateRoomHandoffIdentity,
  flushIntents,
  type AegisRoom,
  type ColyseusClientPort,
} from "./client";

function makeRoom(): AegisRoom {
  return {
    roomId: "physical-room",
    sessionId: "session",
    reconnectionToken: "physical-room:token",
    connection: { isOpen: true },
    send: vi.fn(),
  } as unknown as AegisRoom;
}

function port(joined: AegisRoom): ColyseusClientPort {
  const unavailable = async () => {
    throw new Error("unused client operation");
  };
  return {
    join: unavailable,
    joinOrCreate: async () => joined,
    create: unavailable,
    joinById: unavailable,
    reconnect: unavailable,
    consumeSeatReservation: unavailable,
  };
}

describe("capability-gated live room commands", () => {
  beforeEach(() => sessionStorage.clear());

  it("sends stable command envelopes and stops replaying after an admitted receipt", async () => {
    const joined = makeRoom();
    const client = new AegisConnectionRouter({
      loadManifest: async () => ({
        version: 1,
        capabilities: { liveRoomHandoff: true },
        active: { slot: "green", revision: "current" },
        draining: [],
      }),
      endpointForSlot: (slot) => ({
        http: `https://example.test/api/${slot}`,
        websocket: `wss://example.test/api/${slot}`,
      }),
      createClient: () => port(joined),
      fetcher: fetch,
    });
    await client.joinOrCreate({ displayName: "Tamer", deck: { mainDeck: [], eggDeck: [] } });
    updateRoomHandoffIdentity(joined, { gameId: "logical-game-1", ownerEpoch: 4 });

    sendIntent(joined, { type: "playCard", instanceId: "card-1" });

    expect(joined.send).toHaveBeenCalledTimes(1);
    expect(joined.send).toHaveBeenCalledWith(
      "command",
      expect.objectContaining({
        gameId: "logical-game-1",
        ownerEpoch: 4,
        sequence: 1,
        kind: "playCard",
        payload: { instanceId: "card-1" },
      }),
    );
    const commandId = (joined.send as ReturnType<typeof vi.fn>).mock.calls[0]![1].commandId as string;
    expect(
      reconcileHandoffCommandReceipt(joined, {
        commandId,
        sequence: 1,
        status: "admitted",
        ownerEpoch: 5,
      }),
    ).toBe(true);
    expect(joined.send).toHaveBeenCalledTimes(1);

    updateRoomHandoffIdentity(joined, { ownerEpoch: 5 });
    flushIntents(joined);
    expect(joined.send).toHaveBeenCalledTimes(1);

    sendIntent(joined, { type: "endPhase" });
    expect(joined.send).toHaveBeenNthCalledWith(
      2,
      "command",
      expect.objectContaining({
        gameId: "logical-game-1",
        ownerEpoch: 5,
        sequence: 2,
        kind: "endPhase",
        payload: {},
      }),
    );
  });

  it("leaves legacy rooms on the original intent message channel", () => {
    const room = makeRoom();
    sendIntent(room, { type: "endPhase" });
    expect(room.send).toHaveBeenCalledWith("endPhase", {});
  });
});
