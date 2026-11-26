import type { PoolClient } from "pg";
import type { SealedConfiguration } from "@aegis/shared/sealed/SealedContracts";

type Input = { client: PoolClient; tournamentId: string };

export async function lockSealedTournament({ client, tournamentId }: Input) {
  return (
    await client.query<{ sealed_configuration: SealedConfiguration }>(
      "SELECT sealed_configuration FROM tournaments WHERE id=$1 AND sealed_configuration IS NOT NULL AND sealed_configuration <> 'null'::jsonb FOR UPDATE",
      [tournamentId],
    )
  ).rows[0]?.sealed_configuration;
}
