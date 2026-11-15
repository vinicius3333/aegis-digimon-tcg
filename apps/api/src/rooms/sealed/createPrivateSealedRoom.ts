import { PRIVATE_SEALED_ROOM_TYPE } from "@aegis/shared/sealed/private/privateSealedRoomType";
import { createHash, randomBytes } from "node:crypto";
import { matchMaker } from "colyseus";
import type { AccountStore } from "#api/accounts/AccountStore";
import { PrivateSealedStatus } from "@aegis/shared/sealed/private/PrivateSealedStatus";
type Params = { accounts: AccountStore; code: string; gameId: string };
export async function createPrivateSealedRoom({ accounts, code, gameId }: Params): Promise<string> {
  const capability = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(capability).digest("hex");
  const client = await accounts.pool.connect();
  try {
    await client.query("BEGIN");
    const row = (
      await client.query<{
        state: { status: string; games: { id: string; roomId: string | null; allocationPending?: boolean }[] };
      }>("SELECT state FROM private_sealed_series WHERE code=$1 AND current_game_id=$2 FOR UPDATE", [code, gameId])
    ).rows[0];
    const game = row?.state.games.at(-1);
    if (
      row?.state.status === PrivateSealedStatus.PLAYING.value &&
      game?.id === gameId &&
      game.roomId === null &&
      game.allocationPending === true
    ) {
      await client.query(
        "INSERT INTO private_sealed_room_grants(token_hash,code,game_id,expires_at) VALUES($1,$2,$3,$4)",
        [hash, code, gameId, Date.now() + 60000],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  try {
    const room = await matchMaker.createRoom(PRIVATE_SEALED_ROOM_TYPE, { privateSealedCapability: capability });
    return room.roomId;
  } finally {
    await accounts.pool.query("DELETE FROM private_sealed_room_grants WHERE token_hash=$1", [hash]);
  }
}
