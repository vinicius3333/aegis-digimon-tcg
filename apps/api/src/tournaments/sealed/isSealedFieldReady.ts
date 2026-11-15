import type { Queryable } from "#api/db/migrator";
import type { ParticipantDeckSnapshot } from "#api/tournaments/participants/ParticipantStore";
import type { SealedPull } from "@aegis/shared/sealed/SealedContracts";
import { validateSealedDeck } from "@aegis/shared/sealed/validateSealedDeck";

type Params = { db: Queryable; tournamentId: string };

export async function isSealedFieldReady({ db, tournamentId }: Params): Promise<boolean> {
  const event = (
    await db.query<{ sealed_configuration: unknown; sealed_build_deadline_at: string | null }>(
      "SELECT sealed_configuration,sealed_build_deadline_at FROM tournaments WHERE id=$1",
      [tournamentId],
    )
  ).rows[0];
  if (!event?.sealed_configuration) {
    return true;
  }
  if (event.sealed_build_deadline_at === null) {
    return false;
  }
  const entrants = (
    await db.query<{
      deck_snapshot: ParticipantDeckSnapshot | null;
      packs: SealedPull[][] | null;
      ready_window: string | null;
    }>(
      "SELECT p.deck_snapshot,sp.packs,sp.ready_window FROM tournament_participants p LEFT JOIN tournament_sealed_pools sp ON sp.participant_id=p.id WHERE p.tournament_id=$1 AND p.status='active'",
      [tournamentId],
    )
  ).rows;
  return (
    entrants.length >= 2 &&
    entrants.every(
      (entrant) =>
        entrant.deck_snapshot !== null &&
        entrant.packs !== null &&
        entrant.ready_window === "initial" &&
        validateSealedDeck({
          pool: entrant.packs.flat(),
          mainDeck: entrant.deck_snapshot.mainDeckArts ?? entrant.deck_snapshot.mainDeck,
          eggDeck: entrant.deck_snapshot.eggDeckArts ?? entrant.deck_snapshot.eggDeck,
        }).ok,
    )
  );
}
