import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

describe("013-account-admin", () => {
  let pool: Pool;

  beforeEach(async () => {
    pool = createMemoryPool();
    await runMigrations(pool, migrations.slice(0, -1));
    await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'vini',1),($2,'Other',1)", [
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
    ]);
    await runMigrations(pool, migrations);
  });

  afterEach(async () => {
    await pool.end();
  });

  it("promotes vini and leaves every other account non-admin", async () => {
    expect((await pool.query("SELECT display_name, is_admin FROM accounts ORDER BY display_name")).rows).toEqual([
      { display_name: "Other", is_admin: false },
      { display_name: "vini", is_admin: true },
    ]);
  });

  it("defaults accounts created later to non-admin", async () => {
    await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Later',2)", [
      "10000000-0000-4000-8000-000000000003",
    ]);
    expect((await pool.query("SELECT is_admin FROM accounts WHERE display_name='Later'")).rows[0]).toEqual({
      is_admin: false,
    });
  });
});
