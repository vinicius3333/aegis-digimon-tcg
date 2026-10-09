import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

const AUTHOR = "10000000-0000-4000-8000-000000000001";
const DECK = "20000000-0000-4000-8000-000000000001";

describe("022-public-deck-hidden-status", () => {
  let pool: Pool;

  beforeEach(async () => {
    pool = createMemoryPool();
    await runMigrations(pool, migrations);
    await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Author',1)", [AUTHOR]);
    await pool.query(
      "INSERT INTO public_decks (id,account_id,source_deck_id,name,colors,main_deck,egg_deck,main_deck_arts,egg_deck_arts,published_at,updated_at) VALUES ($1,$2,'custom-1','Deck','[]','[]','[]','[]','[]',1,1)",
      [DECK, AUTHOR],
    );
  });

  afterEach(async () => {
    await pool.end();
  });

  it("accepts hidden as a deck status", async () => {
    await pool.query("UPDATE public_decks SET status='hidden' WHERE id=$1", [DECK]);
    expect((await pool.query("SELECT status FROM public_decks")).rows).toEqual([{ status: "hidden" }]);
  });

  it("refuses statuses it does not know", async () => {
    await expect(pool.query("UPDATE public_decks SET status='gone' WHERE id=$1", [DECK])).rejects.toThrow(
      /check constraint/,
    );
  });
});
