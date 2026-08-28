import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

describe("012-account-avatar", () => {
  let pool: Pool;

  beforeEach(async () => {
    pool = createMemoryPool();
    await runMigrations(pool, migrations);
  });

  afterEach(async () => {
    await pool.end();
  });

  it("adds a nullable avatar choice without changing the provider avatar", async () => {
    await pool.query(
      "INSERT INTO accounts (id, display_name, avatar_url, avatar_id, created_at) VALUES ($1,$2,$3,$4,$5)",
      ["10000000-0000-4000-8000-000000000001", "Tamer", "https://example.com/provider.png", "tyrannomon", 1],
    );

    const row = (
      await pool.query<{ avatar_url: string; avatar_id: string }>("SELECT avatar_url, avatar_id FROM accounts")
    ).rows[0];
    expect(row).toEqual({ avatar_url: "https://example.com/provider.png", avatar_id: "tyrannomon" });
  });
});
