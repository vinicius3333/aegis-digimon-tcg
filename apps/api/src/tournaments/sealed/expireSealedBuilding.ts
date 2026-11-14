import type { AccountStore } from "#api/accounts/AccountStore";
import { appendTournamentEvent } from "#api/tournaments/audit/TournamentEventLog";

type Params = { accounts: AccountStore; tournamentId: string; now: number };

export async function expireSealedBuilding({ accounts, tournamentId, now }: Params): Promise<void> {
  await accounts.ensureReady();
  const client = await accounts.pool.connect();
  try {
    await client.query("BEGIN");
    const event = (
      await client.query<{ status: string; sealed_build_deadline_at: string | null }>(
        "SELECT status,sealed_build_deadline_at FROM tournaments WHERE id=$1 FOR UPDATE",
        [tournamentId],
      )
    ).rows[0];
    if (
      event?.status === "check_in" &&
      event.sealed_build_deadline_at !== null &&
      now >= Number(event.sealed_build_deadline_at)
    ) {
      const dropped = await client.query<{ id: string }>(
        "UPDATE tournament_participants SET status='dropped',dropped_at=$1 WHERE tournament_id=$2 AND status='active' AND deck_snapshot IS NULL RETURNING id",
        [now, tournamentId],
      );
      if ((dropped.rowCount ?? 0) > 0) {
        await appendTournamentEvent(client, {
          tournamentId,
          actorKind: "system",
          actorId: "system",
          command: "sealed_build_expired",
          commandId: `sealed_build_expired:${tournamentId}`,
          reason: "Build deadline expired without a legal ready deck",
          reasonCode: "sealed_build_expired",
          subjectKind: "tournament",
          subjectId: tournamentId,
          after: { dropped: dropped.rows.map((row) => row.id) },
          now,
        });
      }
      const count = Number(
        (
          await client.query<{ count: string }>(
            "SELECT COUNT(*) count FROM tournament_participants WHERE tournament_id=$1 AND status='active'",
            [tournamentId],
          )
        ).rows[0]!.count,
      );
      if (count < 2) {
        await client.query("UPDATE tournaments SET status='cancelled' WHERE id=$1", [tournamentId]);
        await appendTournamentEvent(client, {
          tournamentId,
          actorKind: "system",
          actorId: "system",
          command: "cancel_tournament",
          commandId: `sealed_below_minimum:${tournamentId}`,
          reason: "Fewer than two legal ready entrants at the build deadline",
          reasonCode: "below_minimum",
          subjectKind: "tournament",
          subjectId: tournamentId,
          now,
        });
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
