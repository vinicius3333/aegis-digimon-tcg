import { readSealedMatchPreparation } from "#api/tournaments/sealed/readSealedMatchPreparation";
import type { Queryable } from "#api/db/migrator";
import type { ParticipantDeckSnapshot } from "#api/tournaments/participants/ParticipantStore";
import type { SeriesRecord } from "#api/tournaments/series/SeriesStore";
import type { SealedConfiguration, SealedPull } from "@aegis/shared/sealed/SealedContracts";
import { validateSealedDeck } from "@aegis/shared/sealed/validateSealedDeck";

type Params = { db: Queryable; series: SeriesRecord; now: number };
type Result =
  | { ok: true; decks: [ParticipantDeckSnapshot, ParticipantDeckSnapshot] | null }
  | { ok: false; reason: "sealed_not_ready" | "sealed_sideboarding" };

export async function resolveSealedGameDecks({ db, series, now }: Params): Promise<Result> {
  const event = (
    await db.query<{ sealed_configuration: SealedConfiguration | null }>(
      "SELECT sealed_configuration FROM tournaments WHERE id=$1",
      [series.tournamentId],
    )
  ).rows[0];
  if (!event?.sealed_configuration) {
    return { ok: true, decks: null };
  }
  const open = series.games.find((game) => ["allocated", "room_claimed", "playing"].includes(game.status));
  if (open?.deckSnapshots[0] && open.deckSnapshots[1]) {
    return { ok: true, decks: [open.deckSnapshots[0], open.deckSnapshots[1]] };
  }
  const last = series.games.at(-1);
  const window = `${series.id}:${series.games.length + 1}`;
  const deadline =
    last?.finishedAt === null || last?.finishedAt === undefined
      ? null
      : Math.min(
          last.finishedAt + event.sealed_configuration.sideboardSeconds * 1000,
          series.seriesDeadlineAt ?? Infinity,
        );
  const decks: ParticipantDeckSnapshot[] = [];
  for (const accountId of series.participantAccountIds) {
    if (accountId === null) {
      return { ok: false, reason: "sealed_not_ready" };
    }
    const participant = (
      await db.query<{
        deck_snapshot: ParticipantDeckSnapshot | null;
        packs: SealedPull[][];
        ready_window: string | null;
      }>(
        "SELECT p.deck_snapshot,sp.packs,sp.ready_window FROM tournament_participants p JOIN tournament_sealed_pools sp ON sp.participant_id=p.id WHERE p.tournament_id=$1 AND p.account_id=$2 AND p.status='active'",
        [series.tournamentId, accountId],
      )
    ).rows[0];
    if (!participant?.deck_snapshot) {
      return { ok: false, reason: "sealed_not_ready" };
    }
    const currentMatch = (
      await db.query<{ round: number }>("SELECT round FROM tournament_matches WHERE id=$1", [series.matchId])
    ).rows[0];
    const preparation = last
      ? null
      : await readSealedMatchPreparation({
          db,
          tournamentId: series.tournamentId,
          accountId,
          sideboardSeconds: event.sealed_configuration.sideboardSeconds,
          beforeRound: currentMatch?.round,
        });
    const effectiveDeadline =
      deadline ?? (preparation ? Math.min(preparation.deadlineAt, series.seriesDeadlineAt ?? Infinity) : null);
    const effectiveWindow = preparation?.key ?? window;
    if (effectiveDeadline !== null && now < effectiveDeadline && participant.ready_window !== effectiveWindow) {
      return { ok: false, reason: "sealed_sideboarding" };
    }
    const snapshot = participant.deck_snapshot;
    const legality = validateSealedDeck({
      pool: participant.packs.flat(),
      mainDeck: snapshot.mainDeckArts ?? snapshot.mainDeck,
      eggDeck: snapshot.eggDeckArts ?? snapshot.eggDeck,
    });
    if (
      !legality.ok ||
      JSON.stringify(legality.mainDeck) !== JSON.stringify(snapshot.mainDeck) ||
      JSON.stringify(legality.eggDeck) !== JSON.stringify(snapshot.eggDeck)
    ) {
      return { ok: false, reason: "sealed_not_ready" };
    }
    decks.push(snapshot);
  }
  return { ok: true, decks: [decks[0]!, decks[1]!] };
}
