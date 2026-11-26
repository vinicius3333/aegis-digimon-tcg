import type { RankedCounter, RankedMetaCounters } from "@aegis/shared/ranked/RankedContracts";
import type { Queryable } from "#api/db/migrator";
import { wilsonScoreInterval } from "#api/deckSimulation/wilsonScoreInterval";
import { UNIDENTIFIED_ARCHETYPE } from "#api/ranked/archetypes/UNIDENTIFIED_ARCHETYPE";

type Params = {
  db: Queryable;
  origin: string;
  format: string;
  region?: string;
  from: number;
  until: number;
};
type Row = {
  archetype: string;
  opponent_archetype: string;
  games: string;
  pilots: string;
  wins: string;
  losses: string;
  draws: string;
  cover_card_id: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};
type MetaDeck = Omit<RankedMetaCounters, "share" | "counters">;
type BuildCountersParams = { metaDeck: string; rows: readonly Row[] };

const META_DECK_LIMIT = 8;
const COUNTER_LIMIT = 3;
const MINIMUM_GAMES = 30;
const MINIMUM_PILOTS = 10;

export async function getRankedMetaCounters({
  db,
  origin,
  format,
  region,
  from,
  until,
}: Params): Promise<RankedMetaCounters[]> {
  const { rows } = await db.query<Row>(
    `SELECT f.archetype,f.opponent_archetype,COUNT(*) AS games,COUNT(DISTINCT f.account_id) AS pilots,
     SUM(CASE WHEN f.result='win' THEN 1 ELSE 0 END) AS wins,
     SUM(CASE WHEN f.result='loss' THEN 1 ELSE 0 END) AS losses,
     SUM(CASE WHEN f.result='draw' THEN 1 ELSE 0 END) AS draws,
     a.cover_card_id,a.primary_color,a.secondary_color
     FROM competitive_match_facts f LEFT JOIN competitive_archetypes a ON a.archetype=f.archetype
     WHERE f.origin=$1 AND f.format=$2 AND ($3::text IS NULL OR f.region=$3) AND f.finished_at>=$4 AND f.finished_at<$5
     GROUP BY f.archetype,f.opponent_archetype,a.cover_card_id,a.primary_color,a.secondary_color`,
    [origin, format, region ?? null, from, until],
  );
  const decks = new Map<string, MetaDeck>();
  let appearances = 0;
  for (const row of rows) {
    const games = Number(row.games);
    appearances += games;
    const deck = decks.get(row.archetype) ?? { ...getPresentation(row), games: 0 };
    decks.set(row.archetype, { ...deck, games: deck.games + games });
  }
  return [...decks.values()]
    .filter((deck) => deck.archetype !== UNIDENTIFIED_ARCHETYPE)
    .sort((first, second) => second.games - first.games || first.archetype.localeCompare(second.archetype))
    .slice(0, META_DECK_LIMIT)
    .map((deck) => ({
      ...deck,
      share: deck.games / appearances,
      counters: buildCounters({ metaDeck: deck.archetype, rows }),
    }));
}

function getPresentation(row: Row): Omit<MetaDeck, "games"> {
  return {
    archetype: row.archetype,
    coverCardId: row.cover_card_id,
    colors: [row.primary_color, row.secondary_color].filter((color): color is string => color !== null),
  };
}

function buildCounters({ metaDeck, rows }: BuildCountersParams): RankedCounter[] {
  const counters: RankedCounter[] = [];
  for (const row of rows) {
    const games = Number(row.games);
    const pilots = Number(row.pilots);
    const wins = Number(row.wins);
    const interval = wilsonScoreInterval({ points: wins, games });
    if (
      row.opponent_archetype !== metaDeck ||
      row.archetype === metaDeck ||
      row.archetype === UNIDENTIFIED_ARCHETYPE ||
      games < MINIMUM_GAMES ||
      pilots < MINIMUM_PILOTS ||
      wins * 2 <= games ||
      interval === null
    ) {
      continue;
    }
    counters.push({
      ...getPresentation(row),
      games,
      pilots,
      wins,
      losses: Number(row.losses),
      draws: Number(row.draws),
      winrate: wins / games,
      interval,
    });
  }
  return counters
    .sort((first, second) => second.interval[0] - first.interval[0] || second.games - first.games)
    .slice(0, COUNTER_LIMIT);
}
