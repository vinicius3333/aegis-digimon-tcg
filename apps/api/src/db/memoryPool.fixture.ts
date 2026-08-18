import type { Pool } from "pg";
import { newDb } from "pg-mem";

/**
 * Test-only in-memory Postgres.
 *
 * `noAstCoverageCheck` works around a pg-mem limitation, not a defect in our SQL: when
 * `CREATE TABLE IF NOT EXISTS x` hits an existing `x`, pg-mem skips the statement without
 * consuming the column-constraint nodes of the parsed AST and then throws "parts have not been
 * read by the query planner". Real Postgres treats that statement as a no-op. Re-running the
 * DDL is the whole point of the migrator (its own `schema_migrations` table, and migration 001
 * against a legacy database), so the check has to be off to exercise those paths.
 */
export function createMemoryPool(): Pool {
  return new (newDb({ noAstCoverageCheck: true }).adapters.createPg().Pool)() as Pool;
}
