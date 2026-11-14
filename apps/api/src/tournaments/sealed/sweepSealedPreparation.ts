import type { AccountStore } from "#api/accounts/AccountStore";
import type { SwissProgram } from "#api/tournaments/swiss/SwissProgram";
import { expireSealedBuilding } from "#api/tournaments/sealed/expireSealedBuilding";

type Params = { accounts: AccountStore; swiss: SwissProgram; now: number };

export async function sweepSealedPreparation({ accounts, swiss, now }: Params): Promise<number> {
  await accounts.ensureReady();
  let started = 0;
  let cursor: string | null = null;
  for (;;) {
    const events: { id: string }[] = (
      await accounts.pool.query<{ id: string }>(
        "SELECT id FROM tournaments WHERE status='check_in' AND sealed_build_deadline_at IS NOT NULL AND ($1::uuid IS NULL OR id>$1::uuid) ORDER BY id LIMIT 20",
        [cursor],
      )
    ).rows;
    for (const event of events) {
      await expireSealedBuilding({ accounts, tournamentId: event.id, now });
      if (
        (await accounts.tournament(event.id))?.status === "check_in" &&
        (await swiss.startTournamentProgram(event.id, now)).ok
      ) {
        started += 1;
      }
    }
    if (events.length < 20) {
      break;
    }
    cursor = events.at(-1)!.id;
  }
  return started;
}
