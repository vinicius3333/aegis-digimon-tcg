import assert from "node:assert/strict";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { matchMaker } from "colyseus";
import { ROOM_TYPE } from "@aegis/shared";
import { getRankedConfig } from "../dist/ranked/getRankedConfig.js";
import { startPrivateSealedBrowserServer } from "./startPrivateSealedBrowserServer.js";

test("private sealed helper serves real startup HTTP contracts", async () => {
  const reservation = createServer();
  await new Promise<void>((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const port = (reservation.address() as AddressInfo).port;
  await new Promise<void>((resolve, reject) => reservation.close((error) => (error ? reject(error) : resolve())));
  const backend = await startPrivateSealedBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port,
  });
  const roomId = "private-browser-http-waiting-room";
  try {
    const origin = `http://127.0.0.1:${port}`;
    const me = await fetch(`${origin}/auth/me`);
    assert.equal(me.status, 200);
    assert.equal(await me.json(), null);
    const decks = await fetch(`${origin}/account/decks`);
    assert.equal(decks.status, 401);
    const config = await fetch(`${origin}/ranked/config`);
    assert.equal(config.status, 200);
    assert.deepEqual(await config.json(), getRankedConfig());
    assert.equal(getRankedConfig().enabled, false);
    const ranked = await fetch(`${origin}/ranked/queue`);
    assert.equal(ranked.status, 404);
    assert.deepEqual(await ranked.json(), { error: "ranked_unavailable" });
    assert.equal(
      await matchMaker.driver.persist(
        {
          roomId,
          processId: matchMaker.processId,
          createdAt: new Date(),
          name: ROOM_TYPE,
          clients: 1,
          maxClients: 2,
          locked: false,
          private: false,
          metadata: { format: "standard", matchTimer: true, bestOf: 3, allowRollback: false },
        },
        true,
      ),
      true,
    );
    const queues = await fetch(`${origin}/matchmaking/queues`);
    assert.equal(queues.status, 200);
    const counts = await queues.json();
    assert.ok(typeof counts === "object" && counts !== null);
    assert.ok("buckets" in counts);
    assert.ok("waiting" in counts && Array.isArray(counts.waiting));
    assert.deepEqual(counts.buckets, [
      { queue: "casual", format: "standard", matchTimer: true, bestOf: 3, allowRollback: false, searching: 1 },
    ]);
    assert.equal(counts.waiting.length, 1);
    const waiting: unknown = counts.waiting[0];
    assert.ok(typeof waiting === "object" && waiting !== null);
    assert.ok("waitingSeconds" in waiting && typeof waiting.waitingSeconds === "number");
    assert.deepEqual(waiting, {
      queue: "casual",
      format: "standard",
      matchTimer: true,
      bestOf: 3,
      allowRollback: false,
      waitingSeconds: waiting.waitingSeconds,
    });
    assert.ok(Number.isInteger(waiting.waitingSeconds));
    assert.ok(waiting.waitingSeconds >= 0);
    assert.ok(!JSON.stringify(counts).includes(roomId));
  } finally {
    await matchMaker.driver.remove(roomId);
    await backend.close();
  }
});
