import type { StoredMatchRecord } from "#api/accounts/AccountStore";
import { getDeckFeaturedCardId } from "#api/accounts/getDeckFeaturedCardId";
import { getStoredMatchOwnDeck } from "#api/accounts/getStoredMatchOwnDeck";
import type { Migration, Queryable } from "#api/db/migrator";

type DeckIcons = [string | null, string | null];

type ReplayRow = {
  id: string;
  viewer_seat: number;
  summary: { deckIcons?: DeckIcons };
  record: StoredMatchRecord;
};

const BATCH = 200;

function featuredIcons(row: ReplayRow): DeckIcons | undefined {
  const current = row.summary.deckIcons;
  if (!current) return undefined;
  const seat = row.viewer_seat as 0 | 1;
  const icons: DeckIcons = [...current];
  const ownDeck = getStoredMatchOwnDeck({ record: row.record });
  if (ownDeck && icons[seat] !== null) icons[seat] = getDeckFeaturedCardId(ownDeck) ?? icons[seat];
  const opponentSeat = seat === 0 ? 1 : 0;
  if (row.record.opponentDeck && icons[opponentSeat] !== null)
    icons[opponentSeat] = getDeckFeaturedCardId(row.record.opponentDeck) ?? icons[opponentSeat];
  return icons[0] === current[0] && icons[1] === current[1] ? undefined : icons;
}

async function backfill(db: Queryable): Promise<void> {
  let after = "00000000-0000-0000-0000-000000000000";
  for (;;) {
    const { rows } = await db.query<ReplayRow>(
      `SELECT r.id, r.viewer_seat, r.summary, m.record
         FROM account_replays r
         JOIN account_recent_matches m ON m.account_id = r.account_id AND m.match_id = r.match_id
        WHERE r.viewer_seat IN (0,1) AND r.id > $1
        ORDER BY r.id
        LIMIT ${BATCH}`,
      [after],
    );
    for (const row of rows) {
      const icons = featuredIcons(row);
      if (icons)
        await db.query("UPDATE account_replays SET summary=$2 WHERE id=$1", [
          row.id,
          JSON.stringify({ ...row.summary, deckIcons: icons }),
        ]);
    }
    if (rows.length < BATCH) return;
    after = rows.at(-1)!.id;
  }
}

export const replayFeaturedDeckIcons: Migration = {
  id: "061-replay-featured-deck-icons",
  up: backfill,
};
