import { matchMaker } from "colyseus";
import { ROOM_TYPE_PRIVATE, ROOM_TYPE_MANUAL_PRIVATE } from "@aegis/shared";
import { roomCodeDirectory } from "./AegisRoom.js";
import type { RoomCodeDirectory } from "../cluster/roomCodes.js";

type Listing = { name: string; clients: number; locked?: boolean };
/** Uses the cluster driver so invites also resolve rooms owned by sibling processes. */
export async function lookupInviteRoom(
  raw: unknown,
  directory: RoomCodeDirectory = roomCodeDirectory(),
  query: (roomId: string) => Promise<readonly Listing[]> = (roomId) => matchMaker.query({ roomId }),
) {
  if (typeof raw !== "string" || !/^[a-z0-9]{4,8}$/i.test(raw))
    return { status: 400, body: { error: "roomCode required" } };
  const code = raw.toUpperCase();
  const roomId = await directory.resolve(code);
  if (!roomId) return { status: 404, body: { error: "room not found" } };
  const [listing] = await query(roomId);
  if (!listing) {
    directory.release(code, roomId);
    return { status: 404, body: { error: "room not available" } };
  }
  if (![ROOM_TYPE_PRIVATE, ROOM_TYPE_MANUAL_PRIVATE].includes(listing.name) || listing.clients >= 2 || listing.locked)
    return { status: 404, body: { error: "room not available" } };
  return { status: 200, body: { roomId } };
}
