import { randomUUID } from "node:crypto";
import type { Migration, Queryable } from "../migrator.js";

// The participant record for the tournament program. `tournament_registrations` is the legacy
// table the single-elimination bracket still reads; it is left intact and copied forward, so both
// can be true at once until the bracket moves over in a later slice.
//
// Shapes driven by pg-mem (the in-memory Postgres the tests run on) rather than by Postgres:
//  - statements run one per query, because pg-mem plans a multi-statement batch against the
//    schema as it stood before the batch (see migration 002);
//  - the backfill allocates its ids in JavaScript instead of `gen_random_uuid()`, which pg-mem
//    does not implement, and skips rows already copied by comparing two plain SELECTs rather than
//    with a correlated `NOT EXISTS`, which pg-mem cannot plan (it does not resolve the outer
//    alias). Either way the copy is idempotent, so a re-run — or a database where part of it
//    already happened — adds nothing twice.
//
// `account_id` is nullable because bot participants have no account, so the uniqueness rule is a
// partial index rather than a table constraint: one row per human per tournament, unlimited bots.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tournament_participants (
     id uuid PRIMARY KEY,
     tournament_id uuid NOT NULL REFERENCES tournaments(id),
     kind text NOT NULL CHECK (kind IN ('human','bot')),
     account_id uuid REFERENCES accounts(id),
     display_name text NOT NULL,
     seed integer,
     status text NOT NULL CHECK (status IN ('registered','checked_in','active','dropped','disqualified')),
     saved_deck_id text,
     deck_snapshot jsonb,
     deck_version text,
     created_at bigint NOT NULL,
     checked_in_at bigint,
     dropped_at bigint
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS tournament_participants_account_unique
     ON tournament_participants(tournament_id, account_id) WHERE account_id IS NOT NULL`,
  "CREATE INDEX IF NOT EXISTS tournament_participants_tournament ON tournament_participants(tournament_id, created_at)",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_closes_at bigint",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS check_in_opens_at bigint",
  "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS check_in_closes_at bigint",
];

const EXISTING_ROWS = `SELECT r.tournament_id, r.account_id, r.seed, r.created_at, a.display_name
   FROM tournament_registrations r
   JOIN accounts a ON a.id = r.account_id`;

const ALREADY_COPIED = "SELECT tournament_id, account_id FROM tournament_participants WHERE account_id IS NOT NULL";

type ExistingRow = {
  tournament_id: string;
  account_id: string;
  seed: number | null;
  created_at: string | number;
  display_name: string;
};

export const tournamentParticipants: Migration = {
  id: "004-tournament-participants",
  up: async (db) => {
    for (const statement of STATEMENTS) await db.query(statement);
    await backfillExistingRegistrations(db);
  },
};

async function backfillExistingRegistrations(db: Queryable): Promise<void> {
  const copied = new Set(
    (await db.query<{ tournament_id: string; account_id: string }>(ALREADY_COPIED)).rows.map(
      (row) => `${row.tournament_id}|${row.account_id}`,
    ),
  );
  const existing = await db.query<ExistingRow>(EXISTING_ROWS);
  for (const row of existing.rows) {
    if (copied.has(`${row.tournament_id}|${row.account_id}`)) continue;
    await db.query(
      `INSERT INTO tournament_participants
         (id, tournament_id, kind, account_id, display_name, seed, status, created_at)
       VALUES ($1,$2,'human',$3,$4,$5,'registered',$6)`,
      [randomUUID(), row.tournament_id, row.account_id, row.display_name, row.seed, Number(row.created_at)],
    );
  }
}
