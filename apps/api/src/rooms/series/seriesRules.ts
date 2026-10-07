import { SERIES_MAX_GAMES, seriesWinsRequired, type MatchBestOf, type Seat } from "@aegis/shared";

/** A finished game: the winning seat, or -1 for a draw. */
export type GameResult = Seat | -1;

export type SeriesVerdict = { kind: "continue" } | { kind: "won"; winnerSeat: Seat } | { kind: "draw" };

export function winsOf(results: readonly GameResult[], seat: Seat): number {
  return results.filter((result) => result === seat).length;
}

/**
 * Whether the series goes on after `results`. Draws count for nobody, so a series that reaches
 * {@link SERIES_MAX_GAMES} without a seat reaching the required wins goes to whoever leads, and
 * is drawn when nobody does.
 */
export function seriesVerdict(bestOf: MatchBestOf, results: readonly GameResult[]): SeriesVerdict {
  const required = seriesWinsRequired(bestOf);
  const wins = [winsOf(results, 0), winsOf(results, 1)] as const;
  if (wins[0] >= required) return { kind: "won", winnerSeat: 0 };
  if (wins[1] >= required) return { kind: "won", winnerSeat: 1 };
  if (results.length < SERIES_MAX_GAMES) return { kind: "continue" };
  if (wins[0] === wins[1]) return { kind: "draw" };
  return { kind: "won", winnerSeat: wins[0] > wins[1] ? 0 : 1 };
}

/** The loser picks the next turn order. After a draw, the seat that went second picks. */
export function turnOrderChooser(lastResult: GameResult, lastFirstSeat: Seat): Seat {
  if (lastResult === -1) return (1 - lastFirstSeat) as Seat;
  return (1 - lastResult) as Seat;
}
