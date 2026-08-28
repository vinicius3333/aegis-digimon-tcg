import type { PhaseKind, TournamentRules } from "@aegis/shared";
import type { AccountStore } from "../../accounts/AccountStore.js";
import { logError } from "../../logger.js";
import { type MatchClockContext, seriesDurationFor } from "../rules/clocks.js";
import type { BotMatchDriver } from "./BotMatchDriver.js";

/**
 * One match a bot is waiting to play, with the clock its confrontation runs under.
 *
 * `winsRequired` and `seriesDurationMs` come from the tournament's FROZEN ruleset — the same
 * snapshot a person's presence request reads — so a bot and a person marking themselves present for
 * the same confrontation can never start it under two different sets of rules.
 */
type PendingBotMatch = {
  tournamentId: string;
  matchId: string;
  winsRequired: number;
  seriesDurationMs: number | null;
};

type PendingRow = {
  match_id: string;
  tournament_id: string;
  structure: string;
  best_of: string | number;
  rules_snapshot: string | TournamentRules | null;
  phase_kind: PhaseKind | null;
  planned_rounds: string | number | null;
  round_offset: string | number | null;
  round: string | number | null;
};

/**
 * Every open confrontation with a bot in it, in a tournament that is actually running.
 *
 * Scoped by `status='pending'`, which is the bracket's word for "both seats are filled and this has
 * not been played yet". A `waiting` match has nobody to seat, a `finished` one is over, and a `bye`
 * is not played at all.
 */
const PENDING_BOT_MATCHES = `
  SELECT m.id match_id, m.tournament_id, t.structure, t.best_of, t.rules_snapshot,
         m.round, ph.kind phase_kind, ph.planned_rounds, ph.round_offset
  FROM tournament_matches m
  JOIN tournaments t ON t.id = m.tournament_id
  LEFT JOIN tournament_phases ph ON ph.id = m.phase_id
  JOIN tournament_participants p
    ON p.id = m.player0_participant_id OR p.id = m.player1_participant_id
  WHERE m.status = 'pending' AND p.kind = 'bot' AND t.status = 'in_progress'`;

/**
 * Nudges every bot-involved confrontation forward by one step.
 *
 * This is what makes the whole slice reachable without anybody watching: composed into the deadline
 * worker's sweep, it is the thing that notices a bot is due in a room and puts it there. One step
 * per match per pass, never a game played inside the pass — a best-of-three between two bots is
 * minutes of play, and a worker tick that waited for it would stop applying deadlines for every
 * other tournament in the system.
 *
 * Each match is isolated: a failure on one is logged and the sweep carries on, because the reason
 * one confrontation is stuck is never a reason to stop the rest.
 *
 * Returns how many matches were advanced, which is what the worker logs.
 */
export function createBotMatchSweep(input: {
  accounts: AccountStore;
  driver: () => Promise<BotMatchDriver>;
}): (now: number) => Promise<number> {
  return async () => {
    await input.accounts.ensureReady();
    const pending = await pendingBotMatches(input.accounts);
    if (pending.length === 0) return 0;

    const driver = await input.driver();
    let advanced = 0;
    for (const match of pending) {
      try {
        const outcome = await driver.advanceMatch(match);
        if (outcome.kind === "seated" || outcome.kind === "resolved") advanced += 1;
      } catch (error) {
        logError(`[TOURNAMENT_BOT] advancing match ${match.matchId} of ${match.tournamentId} failed`, error);
      }
    }
    return advanced;
  };
}

async function pendingBotMatches(accounts: AccountStore): Promise<PendingBotMatch[]> {
  const rows = (await accounts.pool.query<PendingRow>(PENDING_BOT_MATCHES)).rows;
  const seen = new Set<string>();
  const pending: PendingBotMatch[] = [];
  for (const row of rows) {
    // Two bots in one match join the participant table twice; the match is still one match.
    if (seen.has(row.match_id)) continue;
    seen.add(row.match_id);
    const rules = parseRules(row.rules_snapshot);
    pending.push({
      tournamentId: row.tournament_id,
      matchId: row.match_id,
      winsRequired: rules?.match.winsRequired ?? (Number(row.best_of) === 3 ? 2 : 1),
      // The same choice `POST /tournaments/:id/matches/:matchId/present` makes, from the same
      // function — a bot and a person marking themselves present for one confrontation must never
      // start it under two different clocks.
      seriesDurationMs: seriesDurationFor(rules, clockContext(row)),
    });
  }
  return pending;
}

function parseRules(snapshot: PendingRow["rules_snapshot"]): TournamentRules | null {
  if (snapshot === null) return null;
  return typeof snapshot === "string" ? (JSON.parse(snapshot) as TournamentRules) : snapshot;
}

function clockContext(row: PendingRow): MatchClockContext {
  const plannedRounds = row.planned_rounds === null ? null : Number(row.planned_rounds);
  // The stored round is tournament-wide; `planned_rounds` is the phase's own count.
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
