import { randomUUID } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { AccountStore, type MatchRecord } from "./AccountStore.js";
import { createMemoryPool } from "../db/memoryPool.fixture.js";

let store: AccountStore;
afterEach(async () => {
  await store?.close();
});
it("retains only the ten newest matches, deduplicates rooms and isolates owners", async () => {
  store = new AccountStore(createMemoryPool());
  const owner = await store.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Owner");
  const other = await store.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Other");
  const record = (index: number): MatchRecord => ({
    id: `replay-${index}`,
    mode: index % 2 ? "bot" : "casual",
    opponentName: "Opponent",
    opponentKind: index % 2 ? "bot" : "human",
    result: "win",
    reason: "surrender",
    finishedAt: index,
  });
  for (let index = 0; index < 14; index++) await store.recordRecentMatch(owner.id, `room-${index}`, record(index));
  await store.recordRecentMatch(owner.id, "room-13", record(99));
  await store.recordRecentMatch(owner.id, "old-arrived-late", record(1));
  const profile = await store.profile(owner.id);
  expect(profile.matches.map((match) => match.id)).toEqual(
    Array.from({ length: 10 }, (_, index) => `replay-${13 - index}`),
  );
  expect(
    (await store.pool.query("SELECT * FROM account_recent_matches WHERE account_id=$1", [owner.id])).rows,
  ).toHaveLength(10);
  expect((await store.profile(other.id)).matches).toEqual([]);
  expect(profile.stats.rankedWins).toBe(0);
});
it("merges legacy competitive history without duplicating newly recorded rooms", async () => {
  store = new AccountStore(createMemoryPool());
  const owner = await store.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Owner");
  const other = await store.accountForIdentity("email", `${randomUUID()}@test.invalid`, "Other");
  await store.recordMatch({
    roomId: "ranked-room",
    mode: "ranked",
    playerAccountIds: [owner.id, other.id],
    winnerAccountId: owner.id,
    reason: "surrender",
  });
  await store.recordRecentMatch(owner.id, "ranked-room", {
    id: "recording-id",
    mode: "ranked",
    opponentName: other.displayName,
    opponentKind: "human",
    result: "win",
    reason: "surrender",
    finishedAt: Date.now(),
  });
  const profile = await store.profile(owner.id);
  expect(profile.matches).toHaveLength(1);
  expect(profile.matches[0]?.id).toBe("recording-id");
  expect(profile.stats.rankedWins).toBe(1);
  expect((await store.profile(other.id)).matches).toHaveLength(1);
});
