import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, it } from "vitest";
import { migrations } from "#api/db/migrations/index";
import { runMigrations } from "#api/db/migrator";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Sealed migration tests require isolated loopback Postgres 55439");
}

it("fills the Swiss migration gap without rewriting an installed private BO3 ledger or data", async () => {
  const schema = `sealed_gap_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString });
  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
  const privateTables = ["private_sealed_series", "private_sealed_results", "private_sealed_room_grants"];
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    const privateRegistry = migrations.filter((migration) => migration.id !== "058-sealed-tournaments");
    expect(await runMigrations(pool, privateRegistry)).toEqual(privateRegistry.map((migration) => migration.id));
    const seriesId = randomUUID();
    const gameId = randomUUID();
    await pool.query(
      "INSERT INTO private_sealed_series (id, code, host_hash, request_id, state, current_game_id) VALUES ($1, 'gap-sentinel', 'owner-hash', $2, $3, $4)",
      [seriesId, randomUUID(), JSON.stringify({ sentinel: ["immutable-pool", 7], score: [1, 0] }), gameId],
    );
    await pool.query(
      "INSERT INTO private_sealed_results (game_id, series_id, room_id, winner, finished_at) VALUES ($1, $2, 'gap-room', 0, 123456)",
      [gameId, seriesId],
    );
    await pool.query(
      "INSERT INTO private_sealed_room_grants (token_hash, code, game_id, expires_at) VALUES ('gap-token', 'gap-sentinel', $1, 654321)",
      [gameId],
    );
    const ledger = (await pool.query("SELECT * FROM schema_migrations ORDER BY id")).rows;
    const relations = (
      await pool.query(
        "SELECT c.relname, c.oid, c.relfilenode FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2::text[]) ORDER BY c.relname",
        [schema, privateTables],
      )
    ).rows;
    expect(relations).toHaveLength(3);
    const before = await Promise.all(
      privateTables.map(async (table) => ({
        rows: (await pool.query(`SELECT * FROM ${table}`)).rows,
        count: (await pool.query(`SELECT count(*) FROM ${table}`)).rows,
      })),
    );
    for (const table of before) {
      expect(table.rows).toHaveLength(1);
      expect(table.count).toEqual([{ count: "1" }]);
    }
    expect(await runMigrations(pool, migrations)).toEqual(["058-sealed-tournaments"]);
    expect(
      (await pool.query("SELECT * FROM schema_migrations WHERE id <> '058-sealed-tournaments' ORDER BY id")).rows,
    ).toEqual(ledger);
    expect((await pool.query("SELECT id FROM schema_migrations ORDER BY id")).rows.map((row) => row.id)).toEqual(
      migrations.map((migration) => migration.id),
    );
    expect(
      (
        await pool.query(
          "SELECT c.relname, c.oid, c.relfilenode FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2::text[]) ORDER BY c.relname",
          [schema, privateTables],
        )
      ).rows,
    ).toEqual(relations);
    const after = await Promise.all(
      privateTables.map(async (table) => ({
        rows: (await pool.query(`SELECT * FROM ${table}`)).rows,
        count: (await pool.query(`SELECT count(*) FROM ${table}`)).rows,
      })),
    );
    expect(after).toEqual(before);
    expect((await pool.query("SELECT count(*) FROM tournament_sealed_pools")).rows).toEqual([{ count: "0" }]);
    expect((await pool.query("SELECT count(*) FROM tournament_sealed_decks")).rows).toEqual([{ count: "0" }]);
    expect((await pool.query("SELECT sealed_configuration, sealed_build_deadline_at FROM tournaments")).rows).toEqual(
      [],
    );
    const finalLedger = (await pool.query("SELECT * FROM schema_migrations ORDER BY id")).rows;
    expect(await runMigrations(pool, migrations)).toEqual([]);
    expect((await pool.query("SELECT * FROM schema_migrations ORDER BY id")).rows).toEqual(finalLedger);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
