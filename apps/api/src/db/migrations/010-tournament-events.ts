import type { Migration } from "../migrator.js";

// The audit ledger: every organizer command and every automatic decision that changed a
// tournament, in the order it happened, with the state on both sides of the change.
//
// `tournament_result_ledger` (migration 006) says what a match MEANT for the standings. This says
// WHY that meaning exists — who decided, under which command, for what stated reason, and what the
// subject looked like before and after.
//
// The acceptance criterion the implementation plan states is that every automatic or organizer
// action is reconstructible from the ledger, so the trail is not limited to the exceptional ones. It
// carries the organizer's arbitration commands, the machine's exceptional decisions (administrative
// losses, deadline rungs, cancellations, bot fills), AND the ordinary transitions an event goes
// through: rounds published and closed, confrontations resolved, bracket seats advanced, and the
// tournament finishing with a champion. A trail holding only the exceptions can explain an odd
// result but cannot rebuild the tournament, because the rounds nobody disputed are most of it —
// which makes a reconstruction from it a narration rather than a replay.
//
//  - Append-only. There is no UPDATE and no DELETE path in the writer. A mistaken decision is
//    corrected by appending a compensating event, never by rewriting the one that happened —
//    a rewritten trail cannot be replayed, which is the only property that makes it worth having.
//  - `sequence` is monotonic PER TOURNAMENT starting at 1, allocated inside the same transaction as
//    the change it records, so replaying a tournament's events in sequence order reconstructs its
//    outcome. `UNIQUE (tournament_id, sequence)` is what makes that ordering a fact rather than a
//    hope, and `tournament_event_sequences` below is what allocates it without a race.
//  - `command_id` is the idempotency key. `UNIQUE (tournament_id, command_id)` means a retried
//    command — a client that resent, a worker that re-executed a rung after a lease expired —
//    appends nothing the second time, and the writer can detect the replay and return the original
//    outcome instead of applying the change twice.
//  - `actor_kind` separates a human decision from a machine one. `actor_id` is an account id for
//    `organizer`/`participant`, and the literal 'system' or 'scheduler' otherwise; it is not a
//    foreign key because those two values are not accounts.
//  - `reason` is MANDATORY and non-empty, checked in the schema and not only in the code. An
//    unexplained override is what makes a trail undefendable months later, and the plan requires a
//    reason on every restricted command. `reason_code` is the machine-readable half — a stable
//    enum-ish token the client and the structured logs share — while `reason` is the organizer's
//    own words.
//  - The subject columns (`subject_kind`/`subject_id` plus the denormalised `phase_id`,
//    `round_id`, `match_id`, `series_id`, `participant_id`) are what makes the trail queryable
//    without parsing jsonb. They are plain nullable columns without foreign keys, for the same
//    reason migration 006 gave `tournament_matches.phase_id` none: a cancelled tournament's events
//    must survive independently of what still exists, and an audit row that a cascade could delete
//    is not an audit row.
//  - `before_state`/`after_state` are jsonb snapshots of just the subject, not of the tournament.
//    Never decklists and never tokens — the plan's logging rule applies to the ledger too.
//
// The index is `(tournament_id, sequence)`: every read is one tournament's trail in order.
//
// pg-mem caveats, same as migrations 002/004/005/006/007: one statement per query, no
// `gen_random_uuid()`, and every CHECK over a nullable column is written `col IS NULL OR col IN
// (...)` because pg-mem reads a NULL check result as a violation where Postgres reads it as
// satisfied.
const STATEMENTS = [
  // The sequence allocator: one row per tournament, locked `FOR UPDATE` for the length of the
  // writer's transaction.
  //
  // The obvious alternative — `SELECT MAX(sequence)+1` and retry on the unique violation — cannot
  // work inside the caller's transaction on real Postgres. A 23505 aborts the whole transaction, so
  // the re-read that follows dies with 25P02 and takes the command down with it. There is no retry
  // to be had without a SAVEPOINT around every insert, and a lock is both cheaper and simpler.
  //
  // Locking THIS row rather than the `tournaments` row is deliberate. Two writers already establish
  // an order — the Swiss program locks `tournaments` then matches, the series module locks a match
  // then writes its event — so taking `tournaments` here would close a lock cycle and deadlock.
  // This row is only ever touched by the audit writer, and always last, so it can join no cycle.
  `CREATE TABLE IF NOT EXISTS tournament_event_sequences (
     tournament_id uuid PRIMARY KEY REFERENCES tournaments(id),
     next_sequence integer NOT NULL CHECK (next_sequence >= 1)
   )`,
  `CREATE TABLE IF NOT EXISTS tournament_events (
     id uuid PRIMARY KEY,
     tournament_id uuid NOT NULL REFERENCES tournaments(id),
     sequence integer NOT NULL CHECK (sequence >= 1),
     actor_kind text NOT NULL CHECK (actor_kind IN ('organizer','participant','system','scheduler')),
     actor_id text NOT NULL,
     command text NOT NULL,
     command_id text NOT NULL,
     subject_kind text CHECK (subject_kind IS NULL OR subject_kind IN ('tournament','phase','round','match','series','participant')),
     subject_id uuid,
     phase_id uuid,
     round_id uuid,
     match_id uuid,
     series_id uuid,
     participant_id uuid,
     reason text NOT NULL CHECK (reason <> ''),
     reason_code text NOT NULL CHECK (reason_code <> ''),
     before_state jsonb,
     after_state jsonb,
     created_at bigint NOT NULL,
     UNIQUE (tournament_id, sequence),
     UNIQUE (tournament_id, command_id)
   )`,
  "CREATE INDEX IF NOT EXISTS tournament_events_trail ON tournament_events(tournament_id, sequence)",
  "CREATE INDEX IF NOT EXISTS tournament_events_subject ON tournament_events(subject_id)",
];

export const tournamentEvents: Migration = {
  id: "010-tournament-events",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
