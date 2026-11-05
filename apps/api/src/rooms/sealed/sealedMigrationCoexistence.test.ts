import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, it } from "vitest";
import { migrations } from "#api/db/migrations/index";
import { runMigrations } from "#api/db/migrator";

const connectionString = process.env.SEALED_TEST_DATABASE_URL;
if (!connectionString?.startsWith("postgres://postgres@127.0.0.1:55439/")) {
  throw new Error("Migration coexistence tests require isolated loopback Postgres 55439");
}

for (const upgrade of [false, true]) {
  it(`preserves both full 053 identities on ${upgrade ? "deployed sealed upgrade" : "fresh installation"}`, async () => {
    const schema = `sealed_migrations_${randomUUID().replaceAll("-", "")}`;
    const admin = new Pool({ connectionString });
    const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    try {
      await admin.query(`CREATE SCHEMA ${schema}`);
      const existing = migrations.filter(
        (migration) => migration.id <= "053-sealed-tournaments" && migration.id !== "053-public-replay-listing",
      );
      const priorApplied = upgrade ? await runMigrations(pool, existing) : [];
      expect(priorApplied).toEqual(upgrade ? existing.map((migration) => migration.id) : []);
      const before = await pool.query("SELECT count(*) FROM information_schema.tables WHERE table_schema=$1", [schema]);
      expect(Number(before.rows[0].count)).toBe(upgrade ? 80 : 0);
      if (upgrade) {
        await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1, 'Retained', 1)", [
          "00000000-0000-0000-0000-0000000000aa",
        ]);
        await pool.query(
          "INSERT INTO tournaments (id, name, block, status, starts_at, max_players, created_by, created_at, sealed_configuration) VALUES ($1, 'Retained sealed', 'BT4', 'registration', 1, 8, $2, 1, $3)",
          [
            "00000000-0000-0000-0000-0000000000bb",
            "00000000-0000-0000-0000-0000000000aa",
            JSON.stringify({ setId: "BT4" }),
          ],
        );
      }
      const applied = await runMigrations(pool, migrations);
      expect(applied).toEqual(
        upgrade
          ? [
              "053-public-replay-listing",
              "054-private-sealed",
              "054-tournament-tiebreak-values",
              "055-private-sealed-results",
              "055-replay-markers",
              "056-replay-notes",
              "057-deck-matchup-results",
            ]
          : migrations.map((migration) => migration.id),
      );
      const ids = (await pool.query("SELECT id FROM schema_migrations WHERE id LIKE '053-%' ORDER BY id")).rows;
      expect(ids).toEqual([{ id: "053-public-replay-listing" }, { id: "053-sealed-tournaments" }]);
      expect(await runMigrations(pool, migrations)).toEqual([]);
      expect(
        Number(
          (await pool.query("SELECT count(*) FROM information_schema.tables WHERE table_schema=$1", [schema])).rows[0]
            .count,
        ),
      ).toBe(86);
      const columns = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='account_replays'",
        [schema],
      );
      expect(columns.rows.map((row) => row.column_name)).toEqual(
        expect.arrayContaining(["published_at", "identities_recorded"]),
      );
      expect((await pool.query("SELECT count(*) FROM private_sealed_results")).rows[0].count).toBe("0");
      expect((await pool.query("SELECT name, sealed_configuration FROM tournaments")).rows).toEqual(
        upgrade ? [{ name: "Retained sealed", sealed_configuration: { setId: "BT4" } }] : [],
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  });
}

it("upgrades an applied private sealed registry without rerunning either 054 identity", async () => {
  const schema = `sealed_migrations_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString });
  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    const previous = migrations.filter(
      (migration) => migration.id <= "055-private-sealed-results" && migration.id !== "054-tournament-tiebreak-values",
    );
    await runMigrations(pool, previous);
    expect(await runMigrations(pool, migrations)).toEqual([
      "054-tournament-tiebreak-values",
      "055-replay-markers",
      "056-replay-notes",
      "057-deck-matchup-results",
    ]);
    expect((await pool.query("SELECT id FROM schema_migrations WHERE id LIKE '054-%' ORDER BY id")).rows).toEqual([
      { id: "054-private-sealed" },
      { id: "054-tournament-tiebreak-values" },
    ]);
    const columns = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='tournament_result_ledger'",
      [schema],
    );
    expect(columns.rows.map((row) => row.column_name)).toEqual(expect.arrayContaining(["games_won", "games_lost"]));
    expect((await pool.query("SELECT id FROM schema_migrations WHERE id LIKE '055-%' ORDER BY id")).rows).toEqual([
      { id: "055-private-sealed-results" },
      { id: "055-replay-markers" },
    ]);
    expect(
      (
        await pool.query(
          "SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename IN ('replay_markers', 'replay_notes', 'deck_matchup_results') ORDER BY tablename",
          [schema],
        )
      ).rows,
    ).toEqual([{ tablename: "deck_matchup_results" }, { tablename: "replay_markers" }, { tablename: "replay_notes" }]);
    expect(await runMigrations(pool, migrations)).toEqual([]);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
