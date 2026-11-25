import type { StoredMatchRecord } from "#api/accounts/AccountStore";
import { getDeckFeaturedCardId } from "#api/accounts/getDeckFeaturedCardId";
import { getStoredMatchOwnDeck } from "#api/accounts/getStoredMatchOwnDeck";
import type { Migration, Queryable } from "#api/db/migrator";

type DeckIcons = [string | null, string | null];

type ReplayRow = {
  id: string;
  account_id: string;
  match_id: string;
  viewer_seat: number;
  summary: { deckIcons?: DeckIcons };
};

type MatchRow = { account_id: string; match_id: string; record: StoredMatchRecord };

type SummaryUpdate = { id: string; summary: string };

const ACCOUNT_BATCH = 50;
const UPDATE_CHUNK = 500;

function featuredIcons(row: ReplayRow, record: StoredMatchRecord): DeckIcons | undefined {
  const current = row.summary.deckIcons;
  if (!current) return undefined;
  const seat = row.viewer_seat as 0 | 1;
  const icons: DeckIcons = [...current];
  const ownDeck = getStoredMatchOwnDeck({ record });
  if (ownDeck && icons[seat] !== null) icons[seat] = getDeckFeaturedCardId(ownDeck) ?? icons[seat];
  const opponentSeat = seat === 0 ? 1 : 0;
  if (record.opponentDeck && icons[opponentSeat] !== null)
    icons[opponentSeat] = getDeckFeaturedCardId(record.opponentDeck) ?? icons[opponentSeat];
  return icons[0] === current[0] && icons[1] === current[1] ? undefined : icons;
}

async function writeSummaries(db: Queryable, updates: SummaryUpdate[]): Promise<void> {
  for (let start = 0; start < updates.length; start += UPDATE_CHUNK) {
    const chunk = updates.slice(start, start + UPDATE_CHUNK);
    const values = chunk.map((_, index) => `($${index * 2 + 1}::uuid, $${index * 2 + 2}::jsonb)`).join(",");
    await db.query(
      `UPDATE account_replays SET summary = v.summary FROM (VALUES ${values}) AS v(id, summary) WHERE account_replays.id = v.id`,
      chunk.flatMap((update) => [update.id, update.summary]),
    );
  }
}

async function backfill(db: Queryable): Promise<void> {
  let after = "00000000-0000-0000-0000-000000000000";
  for (;;) {
    const { rows: accounts } = await db.query<{ account_id: string }>(
      `SELECT DISTINCT account_id FROM account_replays WHERE account_id > $1 ORDER BY account_id LIMIT ${ACCOUNT_BATCH}`,
      [after],
    );
    const last = accounts.at(-1)?.account_id;
    if (!last) return;
    const { rows: replays } = await db.query<ReplayRow>(
      `SELECT id, account_id, match_id, viewer_seat, summary FROM account_replays
        WHERE account_id > $1 AND account_id <= $2 AND viewer_seat IN (0,1)`,
      [after, last],
    );
    const { rows: matches } = await db.query<MatchRow>(
      `SELECT account_id, match_id, record FROM account_recent_matches
        WHERE account_id > $1 AND account_id <= $2 AND match_id = ANY($3::text[])`,
      [after, last, [...new Set(replays.map((replay) => replay.match_id))]],
    );
    const records = new Map(matches.map((match) => [`${match.account_id}:${match.match_id}`, match.record]));
    const updates: SummaryUpdate[] = [];
    for (const replay of replays) {
      const record = records.get(`${replay.account_id}:${replay.match_id}`);
      const icons = record && featuredIcons(replay, record);
      if (icons) updates.push({ id: replay.id, summary: JSON.stringify({ ...replay.summary, deckIcons: icons }) });
    }
    await writeSummaries(db, updates);
    if (accounts.length < ACCOUNT_BATCH) return;
    after = last;
  }
}

export const replayFeaturedDeckIcons: Migration = {
  id: "061-replay-featured-deck-icons",
  up: backfill,
};
