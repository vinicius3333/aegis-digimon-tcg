import { matchMaker } from "colyseus";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountStore } from "../../accounts/AccountStore.js";
import { setRoomCreationAdmission } from "../../deployment/admission.js";
import { AegisRoom, roomRegistry } from "../../rooms/AegisRoom.js";
import { createColyseusBotRoomGateway } from "./colyseusRoomGateway.js";

vi.mock("colyseus", async (importOriginal) => {
  const actual = await importOriginal<typeof import("colyseus")>();
  return { ...actual, matchMaker: { ...actual.matchMaker, createRoom: vi.fn<typeof actual.matchMaker.createRoom>() } };
});

function accountsWithRoom(roomId: string | null): AccountStore {
  return {
    ensureReady: async () => {},
    pool: { query: async () => ({ rows: [{ room_id: roomId }] }) },
  } as unknown as AccountStore;
}

afterEach(() => {
  setRoomCreationAdmission(() => true);
  roomRegistry.delete("retiring-bot-room");
  vi.restoreAllMocks();
  vi.mocked(matchMaker.createRoom).mockClear();
});

describe("tournament room ownership during deployment", () => {
  it("continues bot seating in an existing local room while draining", async () => {
    setRoomCreationAdmission(() => false);
    const room = new AegisRoom();
    room.roomId = "retiring-bot-room";
    roomRegistry.set(room.roomId, room);
    const gateway = createColyseusBotRoomGateway(accountsWithRoom(room.roomId));
    expect(await gateway.roomForGame({ gameId: "game", tournamentId: "tournament" })).toBe(room);
  });

  it("never creates a duplicate for a game owned by another process or slot", async () => {
    const create = vi.mocked(matchMaker.createRoom);
    const gateway = createColyseusBotRoomGateway(accountsWithRoom("remote-room"));
    expect(await gateway.roomForGame({ gameId: "game", tournamentId: "tournament" })).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it("leaves unbound games for the active slot to create", async () => {
    setRoomCreationAdmission(() => false);
    const create = vi.mocked(matchMaker.createRoom);
    const gateway = createColyseusBotRoomGateway(accountsWithRoom(null));
    expect(await gateway.roomForGame({ gameId: "game", tournamentId: "tournament" })).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });
});
