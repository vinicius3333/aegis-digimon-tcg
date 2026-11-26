import { createHash } from "node:crypto";
import type { AccountStore } from "#api/accounts/AccountStore";
import { PrivateSealedStatus } from "@aegis/shared/sealed/private/PrivateSealedStatus";
type Params = { accounts: AccountStore; capability: unknown };
export async function consumePrivateSealedRoomGrant({
  accounts,
  capability,
}: Params): Promise<{ code: string; gameId: string } | null> {
  if (typeof capability !== "string" || !/^[a-f0-9]{64}$/.test(capability)) {
    return null;
  }
  const hash = createHash("sha256").update(capability).digest("hex");
  const client = await accounts.pool.connect();
  try {
    await client.query("BEGIN");
    const grant = (
      await client.query<{ code: string; game_id: string }>(
        "SELECT code,game_id FROM private_sealed_room_grants WHERE token_hash=$1",
        [hash],
      )
    ).rows[0];
    if (!grant) {
      await client.query("COMMIT");
      return null;
    }
    const row = (
      await client.query<{
        state: { status: string; games: { id: string; roomId: string | null; allocationPending?: boolean }[] };
      }>("SELECT state FROM private_sealed_series WHERE code=$1 AND current_game_id=$2 FOR UPDATE", [
        grant.code,
        grant.game_id,
      ])
    ).rows[0];
    const game = row?.state.games.at(-1);
    if (
      row?.state.status !== PrivateSealedStatus.PLAYING.value ||
      game?.id !== grant.game_id ||
      game.roomId !== null ||
      game.allocationPending !== true
    ) {
      await client.query("COMMIT");
      return null;
    }
    const consumed = await client.query(
      "DELETE FROM private_sealed_room_grants WHERE token_hash=$1 AND expires_at>$2 RETURNING token_hash",
      [hash, Date.now()],
    );
    if (!consumed.rowCount) {
      await client.query("COMMIT");
      return null;
    }
    game.allocationPending = false;
    await client.query("UPDATE private_sealed_series SET state=$1 WHERE code=$2", [
      JSON.stringify(row.state),
      grant.code,
    ]);
    await client.query("COMMIT");
    return { code: grant.code, gameId: grant.game_id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
