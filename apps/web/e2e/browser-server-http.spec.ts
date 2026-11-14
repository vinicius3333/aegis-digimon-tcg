import { expect, test } from "@playwright/test";
import { matchMaker } from "colyseus";
import { ROOM_TYPE } from "@aegis/shared";
import { getRankedConfig } from "../../api/dist/ranked/getRankedConfig.js";
import { startBrowserServer } from "./server";

test("browser server exposes live public queue counts and disabled ranked configuration", async () => {
  const server = await startBrowserServer();
  const listing = {
    processId: matchMaker.processId,
    createdAt: new Date(),
    roomId: "browser-http-waiting-room",
    name: ROOM_TYPE,
    clients: 1,
    locked: false,
    private: false,
    maxClients: 2,
    metadata: { format: "standard", matchTimer: true, bestOf: 3, allowRollback: false },
  };
  try {
    expect(await matchMaker.driver.persist(listing, true)).toBe(true);
    const origin = server.directEndpoint.replace(/^ws/, "http");
    const response = await fetch(`${origin}/matchmaking/queues`);
    expect(response.status).toBe(200);
    const counts = await response.json();
    expect(counts.buckets).toEqual([
      { queue: "casual", format: "standard", matchTimer: true, bestOf: 3, allowRollback: false, searching: 1 },
    ]);
    expect(counts.waiting).toEqual([
      expect.objectContaining({ queue: "casual", format: "standard", bestOf: 3, waitingSeconds: expect.any(Number) }),
    ]);
    expect(JSON.stringify(counts)).not.toContain(listing.roomId);
    const config = await fetch(`${origin}/ranked/config`);
    expect(config.status).toBe(200);
    expect(await config.json()).toEqual(getRankedConfig());
    expect(getRankedConfig().enabled).toBe(false);
    const ranked = await fetch(`${origin}/ranked/queue`);
    expect(ranked.status).toBe(404);
    expect(await matchMaker.driver.remove(listing.roomId)).toBe(true);
    await expect
      .poll(async () => {
        const empty = await fetch(`${origin}/matchmaking/queues`);
        expect(empty.status).toBe(200);
        return empty.json();
      })
      .toEqual({ buckets: [], waiting: [] });
  } finally {
    await matchMaker.driver.remove(listing.roomId);
    await server.close();
  }
});
