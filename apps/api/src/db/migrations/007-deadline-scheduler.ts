import type { Migration } from "../migrator.js";

// The persisted work queue the deadline scheduler drains.
//
// Deadlines are rows, not timers. A timer lives in one process's heap: it dies with a deploy, a
// crash or a drain, and it cannot be shared between the two API containers a blue/green rollout
// runs at once. A row survives all three, so "this confrontation is late" is a fact the database
// owns and any instance can act on. In-memory timers may still exist later to cut latency, but
// they are a cache of this table, never the source of truth.
//
//  - `kind` names the command to run. The attendance ladder is two separate rows rather than one
//    row that re-fires: executing the game-loss rung enqueues the match-loss rung, so each step
//    re-reads presence and a player arriving between them leaves the remainder unenqueued. There
//    is no scheduled row for the manual's warning: a warning is what a player who DID arrive
//    inside the grace receives, which is a fact about an arrival, not an event on a clock.
//  - `subject_id` is the match (attendance ladder) or the series (shared-clock timeout). It is not
//    a foreign key precisely because it points at one of two tables; `tournament_id` carries the
//    referential integrity and the logging scope.
//  - `UNIQUE (kind, subject_id)` is the idempotency of ENQUEUE: a rung fires at most once per
//    subject for the lifetime of the event, so a retried enqueue — two workers executing the same
//    rung during a blue/green overlap, a round republished — inserts nothing. It is deliberately
//    not partial on `executed_at IS NULL`: an executed rung must stay in the way of a duplicate,
//    not be superseded by one.
//  - `lease_expires_at` / `leased_by` are the idempotency of EXECUTION: a worker takes a short
//    lease, and a worker that dies mid-command leaves a lease that simply expires. Short leases are
//    what let the process exit during a drain without stranding work — nothing depends on a lease
//    outliving the process that took it, because every command is idempotent.
//  - `executed_at` / `result` are the record. `result` is a reason code from
//    `DeadlineScheduler.DeadlineResultCode` — `game_loss_applied`, `match_loss_applied`,
//    `cancelled_both_present`, `skipped_subject_missing`, … — which is also what makes a no-op
//    execution auditable instead of invisible.
//
//    The ladder those codes come from has TWO rungs, not three: a game loss at
//    `attendance.gameLossAtMs` and a match loss at `attendance.matchLossAtMs`. There is no warning
//    rung and no code for one. A warning would have to be delivered to a player who is by
//    definition not at the table, so it would be a queue row that changed nothing and told nobody;
//    the two rungs that carry a penalty are the whole ladder. A ruleset with a null
//    `gameLossAtMs` runs the lower rung only and goes straight to the match loss.
//
// The index is `(executed_at, due_at)`: the scan is always "unexecuted rows that are due", so the
// nullable-executed column leads and the due instant orders within it.
//
// pg-mem caveats, same as migrations 002/004/005: one statement per query, no `gen_random_uuid()`,
// and every CHECK over a nullable column is written `col IS NULL OR col IN (...)` because pg-mem
// reads a NULL check result as a violation where Postgres reads it as satisfied.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tournament_deadlines (
     id uuid PRIMARY KEY,
     kind text NOT NULL CHECK (kind IN ('join_game_loss','join_match_loss','series_deadline')),
     tournament_id uuid NOT NULL REFERENCES tournaments(id),
     subject_id uuid NOT NULL,
     due_at bigint NOT NULL,
     lease_expires_at bigint,
     leased_by text,
     executed_at bigint,
     result text,
     created_at bigint NOT NULL,
     UNIQUE (kind, subject_id)
   )`,
  "CREATE INDEX IF NOT EXISTS tournament_deadlines_due ON tournament_deadlines(executed_at, due_at)",
];

export const deadlineScheduler: Migration = {
  id: "007-deadline-scheduler",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
  },
};
