import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

const ALICE = "00000000-0000-4000-8000-0000000000a1";
const deck = (mainDeck: string[]) => ({ deckId: null, deckName: "Deck", mainDeck, eggDeck: [], format: "standard" });

describe("061-replay-featured-deck-icons", () => {
  let pool: Pool;
  beforeEach(async () => {
    pool = createMemoryPool();
    await runMigrations(
      pool,
      migrations.filter((migration) => migration.id < "061"),
    );
    await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,'Alice',1)", [ALICE]);
  });
  afterEach(async () => {
    await pool.end();
  });

  async function seed(replayId: string, matchId: string, seat: number, deckIcons: unknown, record: object) {
    await pool.query(
      "INSERT INTO account_recent_matches (account_id,room_id,match_id,finished_at,record) VALUES ($1,$2,$3,1,$4)",
      [ALICE, `room-${matchId}`, matchId, JSON.stringify({ id: matchId, ...record })],
    );
    await pool.query(
      "INSERT INTO account_replays (id,account_id,match_id,viewer_seat,summary,byte_size,created_at) VALUES ($1,$2,$3,$4,$5,1,1)",
      [replayId, ALICE, matchId, seat, JSON.stringify({ id: matchId, deckIcons })],
    );
  }

  const icons = async (replayId: string) =>
    (
      await pool.query<{ summary: { deckIcons?: unknown } }>("SELECT summary FROM account_replays WHERE id=$1", [
        replayId,
      ])
    ).rows[0]?.summary.deckIcons;

  it("replaces last-listed deck icons with each deck's featured Digimon", async () => {
    await seed("00000000-0000-4000-8000-000000000001", "m1", 1, ["BT1-090", "BT1-085"], {
      ownDeck: deck(["BT1-010", "ST1-11", "BT1-085"]),
      opponentDeck: deck(["ST1-07", "BT1-084", "BT1-090"]),
    });
    await seed("00000000-0000-4000-8000-000000000002", "m2", 0, ["BT1-085", null], {
      ownDeck: deck(["BT1-010", "ST1-11", "BT1-085"]),
      opponentDeck: deck(["ST1-07", "BT1-084", "BT1-090"]),
    });
    await seed("00000000-0000-4000-8000-000000000003", "m3", 0, ["BT1-085", "BT1-090"], {});
    await runMigrations(pool, migrations);

    expect(await icons("00000000-0000-4000-8000-000000000001")).toEqual(["BT1-084", "ST1-11"]);
    expect(await icons("00000000-0000-4000-8000-000000000002")).toEqual(["ST1-11", null]);
    expect(await icons("00000000-0000-4000-8000-000000000003")).toEqual(["BT1-085", "BT1-090"]);
  });

  it("updates the replays of every account when there are more accounts than one batch", async () => {
    const accountIds = Array.from(
      { length: 61 },
      (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );
    for (const [index, accountId] of accountIds.entries()) {
      if (accountId !== ALICE) {
        await pool.query("INSERT INTO accounts (id, display_name, created_at) VALUES ($1,$2,1)", [
          accountId,
          `Player ${index}`,
        ]);
      }
      await pool.query(
        "INSERT INTO account_recent_matches (account_id,room_id,match_id,finished_at,record) VALUES ($1,$2,$3,1,$4)",
        [
          accountId,
          `room-${index}`,
          `match-${index}`,
          JSON.stringify({ id: `match-${index}`, ownDeck: deck(["BT1-010", "ST1-11", "BT1-085"]) }),
        ],
      );
      await pool.query(
        "INSERT INTO account_replays (id,account_id,match_id,viewer_seat,summary,byte_size,created_at) VALUES ($1,$2,$3,0,$4,1,1)",
        [
          `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          accountId,
          `match-${index}`,
          JSON.stringify({ id: `match-${index}`, deckIcons: ["BT1-085", null] }),
        ],
      );
    }

    await runMigrations(pool, migrations);

    const { rows } = await pool.query<{ summary: { deckIcons: unknown } }>("SELECT summary FROM account_replays");
    expect(rows).toHaveLength(accountIds.length);
    expect(rows.every((row) => JSON.stringify(row.summary.deckIcons) === JSON.stringify(["ST1-11", null]))).toBe(true);
  });

  it("applies on an empty database", async () => {
    expect(await runMigrations(pool, migrations)).toContain("061-replay-featured-deck-icons");
  });
});
