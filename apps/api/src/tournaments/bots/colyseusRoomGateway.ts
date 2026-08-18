import { ROOM_TYPE_TOURNAMENT } from "@aegis/shared";
import { matchMaker } from "colyseus";
import type { AccountStore } from "../../accounts/AccountStore.js";
import { roomRegistry } from "../../rooms/AegisRoom.js";
import type { BotRoomGateway, BotSeatableRoom } from "./BotMatchDriver.js";

/**
 * The production {@link BotRoomGateway}: real Colyseus rooms, in this process.
 *
 * Two cases, in this order, and the order is the point:
 *
 *  1. **The game already has a room.** A human who joined first created it, and the game's UNIQUE
 *     `room_id` means that room is the only one this game can ever be played in. Handing back
 *     anything else would seat the bot somewhere the person is not.
 *  2. **The game has no room yet.** Make one, filtered on this game id, so a person joining later
 *     with `joinOrCreate(ROOM_TYPE_TOURNAMENT, { tournamentGameId })` discovers this room rather
 *     than creating a second one the game could never bind to.
 *
 * A room that exists in the database but not in this process's registry is a room on another
 * container. Reporting `undefined` is correct there: the driver retries, and the bot is seated by
 * whichever container actually holds the room.
 */
export function createColyseusBotRoomGateway(accounts: AccountStore): BotRoomGateway {
  const boundRoom = async (gameId: string): Promise<BotSeatableRoom | undefined> => {
    const row = (
      await accounts.pool.query<{ room_id: string | null }>("SELECT room_id FROM tournament_games WHERE id=$1", [
        gameId,
      ])
    ).rows[0];
    return row?.room_id ? roomRegistry.get(row.room_id) : undefined;
  };
  return {
    async roomForGame({ gameId }): Promise<BotSeatableRoom | undefined> {
      await accounts.ensureReady();
      const existing = await boundRoom(gameId);
      if (existing) return existing;
      // Re-read under no lock is still worth doing twice: a person joining creates the room and
      // binds the game in the time it takes to get here, and creating a second room for a game
      // that has one leaves an empty room behind that nobody will ever enter or dispose. Cheap
      // query, avoided churn.
      const raced = await boundRoom(gameId);
      if (raced) return raced;
      const created = await matchMaker.createRoom(ROOM_TYPE_TOURNAMENT, { tournamentGameId: gameId });
      return roomRegistry.get(created.roomId);
    },
  };
}
