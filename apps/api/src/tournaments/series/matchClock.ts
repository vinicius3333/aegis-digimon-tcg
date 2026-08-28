import type { PhaseKind } from "@aegis/shared";
import type { Queryable } from "../../db/migrator.js";
import type { MatchClockContext } from "../rules/clocks.js";

type ClockRow = {
  structure: string;
  phase_kind: PhaseKind | null;
  planned_rounds: string | number | null;
  round_offset: string | number | null;
  round: string | number | null;
};

/**
 * Everything {@link seriesDurationFor} needs about ONE match, read in a single query.
 *
 * `isFinal` is derived from the bracket's own shape rather than stored: a bracket phase's
 * `planned_rounds` is its round count, so the match in the last round is the deciding one. Reading
 * it this way means a cut of any size gets the right answer without anybody having to remember to
 * flag the final when the bracket is drawn.
 *
 * A match with no phase — the legacy single-elimination bracket, which predates phases — reports
 * `phaseKind: null`, and the caller's structure fallback decides for it, exactly as before.
 */
export async function matchClockContext(db: Queryable, matchId: string): Promise<MatchClockContext | undefined> {
  const row = (
    await db.query<ClockRow>(
      `SELECT t.structure, p.kind phase_kind, p.planned_rounds, p.round_offset, m.round
       FROM tournament_matches m
       JOIN tournaments t ON t.id = m.tournament_id
       LEFT JOIN tournament_phases p ON p.id = m.phase_id
       WHERE m.id=$1`,
      [matchId],
    )
  ).rows[0];
  if (!row) return undefined;
  const plannedRounds = row.planned_rounds === null ? null : Number(row.planned_rounds);
  // The stored round is tournament-wide; `planned_rounds` is the phase's own count. Subtracting the
  // offset is what makes "round 7 of a Top 8 that followed four Swiss rounds" read as round 3 of 3.
  const round = row.round === null ? null : Number(row.round) - Number(row.round_offset ?? 0);
  return {
    structure: row.structure,
    phaseKind: row.phase_kind,
    isFinal:
      row.phase_kind !== "swiss" &&
      plannedRounds !== null &&
      round !== null &&
      plannedRounds > 0 &&
      round >= plannedRounds,
  };
}
