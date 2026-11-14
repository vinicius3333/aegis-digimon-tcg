import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, it } from "vitest";
import { migrations } from "#api/db/migrations/index";
import { runMigrations } from "#api/db/migrator";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Sealed migration tests require isolated loopback Postgres 55439");
}

const sealedIds = ["058-sealed-tournaments", "059-private-sealed", "060-private-sealed-results"];

it("inserts canonical sealed migrations after the complete upstream registry", () => {
  expect(migrations.slice(-5).map((migration) => migration.id)).toEqual([
    "057-deck-matchup-results",
    "058-optional-ranked-region",
    ...sealedIds,
  ]);
  const ids = migrations.map((migration) => migration.id);
  expect(new Set(ids).size).toBe(migrations.length);
  expect(ids).toEqual([...ids].sort());
});

for (const through of [null, "056", "057"]) {
  const upgrade = through !== null;
  it(`applies canonical sealed migrations on ${upgrade ? `an upstream ${through} upgrade` : "a fresh installation"}`, async () => {
    const schema = `sealed_migrations_${randomUUID().replaceAll("-", "")}`;
    const admin = new Pool({ connectionString });
    const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    try {
      await admin.query(`CREATE SCHEMA ${schema}`);
      const existing = migrations.filter((migration) => migration.id.slice(0, 3) <= (through ?? "057"));
      if (upgrade) {
        expect(await runMigrations(pool, existing)).toEqual(existing.map((migration) => migration.id));
        await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1, 'Retained', 1)", [
          "00000000-0000-0000-0000-0000000000aa",
        ]);
        await pool.query(
          "INSERT INTO tournaments (id, name, block, status, starts_at, max_players, created_by, created_at) VALUES ($1, 'Retained tournament', 'BT4', 'registration', 1, 8, $2, 1)",
          ["00000000-0000-0000-0000-0000000000bb", "00000000-0000-0000-0000-0000000000aa"],
        );
      }
      expect(await runMigrations(pool, migrations)).toEqual(
        upgrade
          ? migrations.filter((migration) => !existing.includes(migration)).map((migration) => migration.id)
          : migrations.map((migration) => migration.id),
      );
      expect((await pool.query("SELECT id FROM schema_migrations ORDER BY id")).rows.map((row) => row.id)).toEqual(
        migrations.map((migration) => migration.id),
      );
      expect(await runMigrations(pool, migrations)).toEqual([]);
      expect((await pool.query("SELECT count(*) FROM private_sealed_results")).rows[0].count).toBe("0");
      expect((await pool.query("SELECT name FROM tournaments")).rows).toEqual(
        upgrade ? [{ name: "Retained tournament" }] : [],
      );
      await pool.query(
        "INSERT INTO private_sealed_series (id,code,host_hash,request_id,state) VALUES ($1,'retained','hash',$2,'{}')",
        [randomUUID(), randomUUID()],
      );
      expect(await runMigrations(pool, migrations)).toEqual([]);
      expect((await pool.query("SELECT code,state FROM private_sealed_series")).rows).toEqual([
        { code: "retained", state: {} },
      ]);
      const tables = await pool.query(
        "SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename IN ('tournament_sealed_pools','tournament_sealed_decks','private_sealed_series','private_sealed_room_grants','private_sealed_results') ORDER BY tablename",
        [schema],
      );
      expect(tables.rows.map((row) => row.tablename)).toEqual([
        "private_sealed_results",
        "private_sealed_room_grants",
        "private_sealed_series",
        "tournament_sealed_decks",
        "tournament_sealed_pools",
      ]);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  });
}
