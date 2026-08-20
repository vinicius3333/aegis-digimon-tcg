import type { Presence } from "colyseus";

/**
 * Where a private room's join code is resolved to its Colyseus room id.
 *
 * The code is typed by a person into a client that may reach any process in the slot, while the
 * room lives on exactly one of them, so the mapping cannot be a local Map once there is more than
 * one process.
 */
export interface RoomCodeDirectory {
  claim(code: string, roomId: string): void;
  resolve(code: string): Promise<string | undefined>;
  release(code: string): void;
}

/** Single-process directory: the room and the lookup are always in the same memory. */
export function createLocalRoomCodeDirectory(): RoomCodeDirectory {
  const codes = new Map<string, string>();
  return {
    claim: (code, roomId) => void codes.set(code, roomId),
    resolve: (code) => Promise.resolve(codes.get(code)),
    release: (code) => void codes.delete(code),
  };
}

/**
 * Cluster directory backed by the shared presence.
 *
 * Writes are fire-and-forget on purpose: `claim` runs inside the room's constructor and `release`
 * inside its disposal, neither of which can await. A lost write costs one unreachable code, not a
 * corrupted match — and a stale entry resolves to a room the matchmaker then reports as gone.
 */
export function createSharedRoomCodeDirectory(presence: Presence, keyPrefix: string): RoomCodeDirectory {
  const key = `${keyPrefix}room-codes`;
  const onFailure = (action: string) => (error: unknown) =>
    console.error(`[cluster] room code ${action} failed`, error);
  return {
    claim: (code, roomId) => void Promise.resolve(presence.hset(key, code, roomId)).catch(onFailure("claim")),
    resolve: async (code) => (await presence.hget(key, code)) ?? undefined,
    release: (code) => void Promise.resolve(presence.hdel(key, code)).catch(onFailure("release")),
  };
}
