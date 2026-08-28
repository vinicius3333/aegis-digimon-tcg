import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendTournamentEvent, readTournamentEvents } from "../../tournaments/audit/index.js";
import { createMemoryPool } from "../memoryPool.fixture.js";
import { runMigrations } from "../migrator.js";
import { migrations } from "./index.js";

describe("010-tournament-events", () => {
  let pool: Pool;
  let tournamentId: string;

  beforeEach(async () => {
    pool = createMemoryPool();
    await runMigrations(pool, migrations);
    const accountId = randomUUID();
    await pool.query("INSERT INTO accounts (id, display_name, avatar_url, created_at) VALUES ($1,$2,null,$3)", [
      accountId,
      "Organizer",
      Date.now(),
    ]);
    tournamentId = randomUUID();
    await pool.query(
      `INSERT INTO tournaments (id, name, block, starts_at, max_players, status, created_by, created_at)
       VALUES ($1,'Regional','BT10',$2,8,'running',$3,$2)`,
      [tournamentId, Date.now(), accountId],
    );
  });

  afterEach(async () => {
    await pool.end();
  });

  it("applies in order after the migrations that precede it", async () => {
    // Re-running is the migrator's contract, and the ordering assertion is lexicographic over the
    // barrel: 010 sorting after 008 is exactly what a later 009 must not disturb.
    expect(await runMigrations(pool, migrations)).toEqual([]);
    const ids = migrations.map((migration) => migration.id);
    expect(ids).toContain("010-tournament-events");
    expect([...ids].sort()).toEqual(ids);
  });

  it("numbers a tournament's events monotonically from one", async () => {
    for (const command of ["disqualify", "cancel_tournament"] as const) {
      await appendTournamentEvent(pool, {
        tournamentId,
        actorKind: "organizer",
        actorId: "organizer",
        command,
        commandId: randomUUID(),
        reason: "documented in the match slip",
        reasonCode: command,
      });
    }
    expect((await readTournamentEvents(pool, tournamentId)).map((event) => event.sequence)).toEqual([1, 2]);
  });

  it("replays a retried command instead of appending a second row", async () => {
    const commandId = randomUUID();
    const input = {
      tournamentId,
      actorKind: "organizer" as const,
      actorId: "organizer",
      command: "decide_series" as const,
      commandId,
      reason: "opponent conceded verbally",
      reasonCode: "organizer_decision",
      before: { status: "needs_organizer_decision" },
      after: { status: "resolved" },
    };
    const first = await appendTournamentEvent(pool, input);
    const second = await appendTournamentEvent(pool, input);
    expect(first.kind).toBe("appended");
    expect(second.kind).toBe("replayed");
    expect(second.event.id).toBe(first.event.id);
    expect(await readTournamentEvents(pool, tournamentId)).toHaveLength(1);
  });

  it("round-trips the before/after snapshots", async () => {
    await appendTournamentEvent(pool, {
      tournamentId,
      actorKind: "scheduler",
      actorId: "scheduler",
      command: "deadline_resolved",
      commandId: randomUUID(),
      reason: "join deadline elapsed with one player absent",
      reasonCode: "match_loss_applied",
      before: { presence: ["alice"] },
      after: { winner: "alice" },
    });
    const [event] = await readTournamentEvents(pool, tournamentId);
    expect(event?.before).toEqual({ presence: ["alice"] });
    expect(event?.after).toEqual({ winner: "alice" });
    expect(event?.actorKind).toBe("scheduler");
  });

  it("refuses an empty reason", async () => {
    await expect(
      appendTournamentEvent(pool, {
        tournamentId,
        actorKind: "organizer",
        actorId: "organizer",
        command: "disqualify",
        commandId: randomUUID(),
        reason: "   ",
        reasonCode: "cheating",
      }),
    ).rejects.toThrow(/requires a reason/);
  });
});
