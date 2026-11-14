import { drawSealedPool } from "#api/sealed/drawSealedPool";
import type { PoolClient } from "pg";
import type { SealedConfiguration } from "@aegis/shared/sealed/SealedContracts";
import { appendTournamentEvent } from "#api/tournaments/audit/TournamentEventLog";

type Params = { client: PoolClient; tournamentId: string; configuration: SealedConfiguration; now: number };

export async function prepareSealedField({ client, tournamentId, configuration, now }: Params): Promise<void> {
  const entrants = (
    await client.query<{ id: string }>(
      "SELECT id FROM tournament_participants WHERE tournament_id=$1 AND status='checked_in' ORDER BY id FOR UPDATE",
      [tournamentId],
    )
  ).rows;
  for (const entrant of entrants) {
    const existing = await client.query("SELECT participant_id FROM tournament_sealed_pools WHERE participant_id=$1", [
      entrant.id,
    ]);
    if (existing.rowCount === 0) {
      const packs = drawSealedPool({ configuration });
      await client.query("INSERT INTO tournament_sealed_pools (participant_id,packs,allocated_at) VALUES ($1,$2,$3)", [
        entrant.id,
        JSON.stringify(packs),
        now,
      ]);
    }
    await client.query("UPDATE tournament_participants SET status='active' WHERE id=$1 AND status='checked_in'", [
      entrant.id,
    ]);
  }
  await client.query(
    "UPDATE tournament_participants SET status='dropped',dropped_at=$1 WHERE tournament_id=$2 AND status='registered'",
    [now, tournamentId],
  );
  await client.query("UPDATE tournaments SET status='check_in',sealed_build_deadline_at=$1 WHERE id=$2", [
    now + configuration.buildMinutes * 60_000,
    tournamentId,
  ]);
  await appendTournamentEvent(client, {
    tournamentId,
    actorKind: "system",
    actorId: "system",
    command: "sealed_pools_allocated",
    commandId: `sealed_pools:${tournamentId}`,
    reason: "Roster frozen for sealed deck building",
    reasonCode: "sealed_pools_allocated",
    subjectKind: "tournament",
    subjectId: tournamentId,
    after: { participants: entrants.length, configuration, deadlineAt: now + configuration.buildMinutes * 60_000 },
    now,
  });
}
