import { createHash } from "node:crypto";
import type { AccountStore } from "#api/accounts/AccountStore";
type Params = { accounts: AccountStore; capability: unknown };
export async function consumePrivateSealedRoomGrant({
  accounts,
  capability,
}: Params): Promise<{ code: string; gameId: string } | null> {
  if (typeof capability !== "string" || !/^[a-f0-9]{64}$/.test(capability)) {
    return null;
  }
  const row = (
    await accounts.pool.query<{ code: string; game_id: string }>(
      "DELETE FROM private_sealed_room_grants WHERE token_hash=$1 AND expires_at>$2 RETURNING code,game_id",
      [createHash("sha256").update(capability).digest("hex"), Date.now()],
    )
  ).rows[0];
  return row ? { code: row.code, gameId: row.game_id } : null;
}
