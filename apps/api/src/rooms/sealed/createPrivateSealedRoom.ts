import { PRIVATE_SEALED_ROOM_TYPE } from "@aegis/shared/sealed/private/privateSealedRoomType";
import { createHash, randomBytes } from "node:crypto";
import { matchMaker } from "colyseus";
import type { AccountStore } from "#api/accounts/AccountStore";
type Params = { accounts: AccountStore; code: string; gameId: string };
export async function createPrivateSealedRoom({ accounts, code, gameId }: Params): Promise<string> {
  const capability = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(capability).digest("hex");
  await accounts.pool.query(
    "INSERT INTO private_sealed_room_grants(token_hash,code,game_id,expires_at) VALUES($1,$2,$3,$4)",
    [hash, code, gameId, Date.now() + 60000],
  );
  try {
    const room = await matchMaker.createRoom(PRIVATE_SEALED_ROOM_TYPE, { privateSealedCapability: capability });
    return room.roomId;
  } finally {
    await accounts.pool.query("DELETE FROM private_sealed_room_grants WHERE token_hash=$1", [hash]);
  }
}
