import type { Queryable } from "#api/db/migrator";

type Params = {
  db: Queryable;
  tournamentId: string;
  accountId: string;
  sideboardSeconds: number;
  beforeRound?: number;
};

export async function readSealedMatchPreparation({
  db,
  tournamentId,
  accountId,
  sideboardSeconds,
  beforeRound,
}: Params): Promise<{ key: string; deadlineAt: number } | null> {
  const match = (
    await db.query<{ id: string; resolved_at: string | null }>(
      `SELECT m.id,COALESCE(s.resolved_at,l.recorded_at,r.closed_at,r.published_at) resolved_at
     FROM tournament_matches m
     LEFT JOIN match_series s ON s.tournament_match_id=m.id
     JOIN tournament_rounds r ON r.id=m.round_id
     JOIN tournament_participants p ON p.tournament_id=m.tournament_id AND p.account_id=$2
     LEFT JOIN tournament_result_ledger l ON l.tournament_id=m.tournament_id AND l.participant_id=p.id AND l.round_number=m.round
     WHERE m.tournament_id=$1 AND (m.player0_account_id=$2 OR m.player1_account_id=$2)
       AND (m.status IN ('finished','bye') OR s.status='resolved') AND ($3::integer IS NULL OR m.round<$3)
     ORDER BY m.round DESC,m.id LIMIT 1`,
      [tournamentId, accountId, beforeRound ?? null],
    )
  ).rows[0];
  if (!match || match.resolved_at === null) {
    return null;
  }
  return { key: `match:${match.id}`, deadlineAt: Number(match.resolved_at) + sideboardSeconds * 1000 };
}
