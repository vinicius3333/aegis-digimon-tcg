import { describe, expect, it } from "vitest";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

const noLock = async () => async () => undefined;

describe("028-reset-feedback-baseline", () => {
  it("clears feedback, its history and notifications, and keeps accounts", async () => {
    const pool = createMemoryPool();
    const before = migrations.findIndex((migration) => migration.id === "028-reset-feedback-baseline");
    await runMigrations(pool, migrations.slice(0, before), noLock);

    const account = "00000000-0000-4000-8000-000000000001";
    await pool.query(
      "INSERT INTO accounts (id, display_name, created_at, confirmed_bug_reports) VALUES ($1, 'Kai', 0, 3)",
      [account],
    );
    await pool.query(
      `INSERT INTO feedback_reports (reporter_account_id, report, created_at, github_status)
       VALUES ($1, '{"kind":"bug","summary":"old","description":"old","cardIds":[]}', 0, 'sent')`,
      [account],
    );
    await pool.query(
      "INSERT INTO feedback_status_events (feedback_id, from_status, to_status, created_at) VALUES (1, 'new', 'triaged', 0)",
    );
    await pool.query(
      "INSERT INTO notifications (account_id, kind, subject, payload, created_at) VALUES ($1, 'feedback_update', 'feedback:1', '{}', 0)",
      [account],
    );

    expect(await runMigrations(pool, migrations, noLock)).toEqual(["028-reset-feedback-baseline"]);

    for (const table of ["feedback_reports", "feedback_status_events", "notifications"]) {
      const { rows } = await pool.query(`SELECT count(*) AS count FROM ${table}`);
      expect([table, Number(rows[0].count)]).toEqual([table, 0]);
    }
    const { rows } = await pool.query("SELECT display_name, confirmed_bug_reports FROM accounts");
    expect(rows).toEqual([{ display_name: "Kai", confirmed_bug_reports: 0 }]);
  });
});
