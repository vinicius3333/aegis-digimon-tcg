import { describe, expect, it, vi } from "vitest";
import { ROOM_TYPE, ROOM_TYPE_PRIVATE, ROOM_TYPE_MANUAL_PRIVATE } from "@aegis/shared";
import { createLocalRoomCodeDirectory } from "../cluster/roomCodes.js";
import { lookupInviteRoom } from "./roomLookup.js";

describe("production invite lookup", () => {
  it.each([ROOM_TYPE_PRIVATE, ROOM_TYPE_MANUAL_PRIVATE])(
    "resolves available %s rooms through the cluster driver",
    async (name) => {
      const directory = createLocalRoomCodeDirectory();
      directory.claim("ABCDEF", "remote-room");
      const query = vi.fn(async () => [{ name, clients: 1, locked: false }]);
      expect(await lookupInviteRoom("abcdef", directory, query)).toEqual({
        status: 200,
        body: { roomId: "remote-room" },
      });
      expect(query).toHaveBeenCalledWith("remote-room");
    },
  );
  it("rejects automatic public rooms, full rooms and malformed input without revoking live codes", async () => {
    const directory = createLocalRoomCodeDirectory();
    directory.claim("ABCDEF", "remote-room");
    for (const listing of [
      { name: ROOM_TYPE, clients: 1, locked: false },
      { name: ROOM_TYPE_MANUAL_PRIVATE, clients: 2, locked: true },
    ])
      expect((await lookupInviteRoom("ABCDEF", directory, async () => [listing])).status).toBe(404);
    expect(await directory.resolve("ABCDEF")).toBe("remote-room");
    expect((await lookupInviteRoom({ code: "ABCDEF" }, directory)).status).toBe(400);
  });
  it("releases stale directory entries", async () => {
    const directory = createLocalRoomCodeDirectory();
    directory.claim("ABCDEF", "remote-room");
    expect((await lookupInviteRoom("ABCDEF", directory, async () => [])).status).toBe(404);
    expect(await directory.resolve("ABCDEF")).toBeUndefined();
  });
});
