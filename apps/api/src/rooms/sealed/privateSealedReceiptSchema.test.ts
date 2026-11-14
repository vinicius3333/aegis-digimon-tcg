import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, it } from "vitest";
import { migrations } from "#api/db/migrations/index";
import { runMigrations } from "#api/db/migrator";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Isolated Postgres 55439 required");
}
for (const baseline of ["fresh", "058", "060"]) {
  it(`preserves compact receipts across parent deletion and idempotent migration from ${baseline}`, async () => {
    const schema = `receipt_schema_${randomUUID().replaceAll("-", "")}`;
    const admin = new Pool({ connectionString });
    const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    try {
      await admin.query(`CREATE SCHEMA ${schema}`);
      const earlier = baseline === "fresh" ? [] : migrations.filter((migration) => migration.id < baseline);
      await runMigrations(pool, earlier);
      const ledger = (await pool.query("SELECT id,applied_at FROM schema_migrations ORDER BY id")).rows;
      expect(await runMigrations(pool, migrations)).toEqual(
        migrations.filter((migration) => !earlier.includes(migration)).map((migration) => migration.id),
      );
      expect(
        (
          await pool.query("SELECT id,applied_at FROM schema_migrations WHERE id=ANY($1) ORDER BY id", [
            earlier.map((migration) => migration.id),
          ])
        ).rows,
      ).toEqual(ledger);
      const seriesId = randomUUID();
      const gameId = randomUUID();
      await pool.query(
        "INSERT INTO private_sealed_series(id,code,host_hash,request_id,state) VALUES($1,'receipt-parent','hash',$2,'{}')",
        [seriesId, randomUUID()],
      );
      await pool.query(
        "INSERT INTO private_sealed_results(game_id,series_id,room_id,winner,finished_at) VALUES($1,$2,'authoritative-room',NULL,123)",
        [gameId, seriesId],
      );
      const before = (
        await pool.query("SELECT tableoid::oid::text AS table_oid,ctid::text AS tuple_id,* FROM private_sealed_results")
      ).rows;
      expect(await runMigrations(pool, migrations)).toEqual([]);
      expect(
        (
          await pool.query(
            "SELECT tableoid::oid::text AS table_oid,ctid::text AS tuple_id,* FROM private_sealed_results",
          )
        ).rows,
      ).toEqual(before);
      await expect(
        pool.query(
          "INSERT INTO private_sealed_results(game_id,series_id,room_id,winner,finished_at) VALUES($1,$2,'bad',0,1)",
          [randomUUID(), randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "23503" });
      expect(
        (
          await pool.query(
            "SELECT is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name='private_sealed_results' AND column_name='series_id'",
            [schema],
          )
        ).rows,
      ).toEqual([{ is_nullable: "YES" }]);
      expect(
        (
          await pool.query(
            "SELECT indexdef FROM pg_indexes WHERE schemaname=$1 AND tablename='private_sealed_results'",
            [schema],
          )
        ).rows.some((row) => /\(series_id\)/.test(row.indexdef)),
      ).toBe(true);
      await pool.query("DELETE FROM private_sealed_series WHERE id=$1", [seriesId]);
      expect(
        (await pool.query("SELECT game_id,series_id,room_id,winner,finished_at FROM private_sealed_results")).rows,
      ).toEqual([
        { game_id: gameId, series_id: null, room_id: "authoritative-room", winner: null, finished_at: "123" },
      ]);
      expect(await runMigrations(pool, migrations)).toEqual([]);
      expect((await pool.query("SELECT count(*) FROM private_sealed_results")).rows[0].count).toBe("1");
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  });
}
