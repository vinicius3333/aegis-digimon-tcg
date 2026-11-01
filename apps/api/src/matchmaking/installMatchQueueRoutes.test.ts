import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { matchMaker } from "colyseus";
import type { MatchQueueCounts } from "@aegis/shared/matchmaking/MatchQueueCounts";
import { installMatchQueueRoutes } from "#api/matchmaking/installMatchQueueRoutes";
import type { RankedSearcherCount } from "#api/ranked/countRankedSearchers";

vi.mock("colyseus", async (importOriginal) => ({
  ...(await importOriginal<typeof import("colyseus")>()),
  matchMaker: { query: vi.fn<typeof import("colyseus").matchMaker.query>() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

type Options = Omit<Parameters<typeof installMatchQueueRoutes>[0], "app">;

async function withServer<T>(options: Options, run: (get: () => Promise<Response>) => Promise<T>): Promise<T> {
  const app = express();
  installMatchQueueRoutes({ app, ...options });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/matchmaking/queues`;
  try {
    return await run(() => fetch(url));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function readCounts(options: Options = {}): Promise<MatchQueueCounts> {
  return withServer(options, async (get) => (await get()).json() as Promise<MatchQueueCounts>);
}

function waitingRoom(overrides: Record<string, unknown> = {}) {
  return {
    roomId: crypto.randomUUID(),
    name: "aegis",
    locked: false,
    private: false,
    clients: 1,
    format: "standard",
    matchTimer: true,
    bestOf: 1,
    allowRollback: false,
    metadata: { format: "standard", unlimited: false },
    ...overrides,
  };
}

describe("matchmaking queue counts", () => {
  it("counts each waiting public room as one searching player in its queue settings", async () => {
    vi.mocked(matchMaker.query).mockResolvedValue([
      waitingRoom(),
      waitingRoom(),
      waitingRoom({ matchTimer: false }),
      waitingRoom({ bestOf: 3 }),
      waitingRoom({ name: "aegis_unlimited", format: "unlimited", metadata: { format: "unlimited", unlimited: true } }),
      waitingRoom({ name: "aegis_beta", format: undefined }),
      waitingRoom({ name: "aegis_manual", matchTimer: undefined, bestOf: undefined, allowRollback: undefined }),
    ] as never);

    const { buckets } = await readCounts();

    expect(buckets).toEqual(
      expect.arrayContaining([
        { queue: "casual", format: "standard", matchTimer: true, bestOf: 1, allowRollback: false, searching: 2 },
        { queue: "casual", format: "standard", matchTimer: false, bestOf: 1, allowRollback: false, searching: 1 },
        { queue: "casual", format: "standard", matchTimer: true, bestOf: 3, allowRollback: false, searching: 1 },
        { queue: "unlimited", format: "unlimited", matchTimer: true, bestOf: 1, allowRollback: false, searching: 1 },
        { queue: "beta", format: "standard", matchTimer: true, bestOf: 1, allowRollback: false, searching: 1 },
        { queue: "manual", format: "standard", matchTimer: false, bestOf: 1, allowRollback: false, searching: 1 },
      ]),
    );
    expect(buckets).toHaveLength(6);
  });

  it("ignores started, private, empty and non-queue rooms", async () => {
    vi.mocked(matchMaker.query).mockResolvedValue([
      waitingRoom({ locked: true, clients: 2 }),
      waitingRoom({ locked: true, clients: 1 }),
      waitingRoom({ private: true }),
      waitingRoom({ clients: 0 }),
      waitingRoom({ name: "aegis_bot" }),
      waitingRoom({ name: "aegis_private" }),
      waitingRoom({ name: "aegis_ranked" }),
      waitingRoom({ name: "aegis_tournament" }),
    ] as never);

    expect((await readCounts()).buckets).toEqual([]);
  });

  it("publishes only aggregate numbers, never room or player identity", async () => {
    vi.mocked(matchMaker.query).mockResolvedValue([
      waitingRoom({ roomId: "secret-room", metadata: { format: "standard", players: ["Tai"] } }),
    ] as never);

    const body = JSON.stringify(await readCounts());

    expect(body).not.toContain("secret-room");
    expect(body).not.toContain("Tai");
  });

  it("adds ranked searchers per format", async () => {
    vi.mocked(matchMaker.query).mockResolvedValue([]);

    const { buckets } = await readCounts({
      countRankedSearchers: async () => [
        { format: "standard", searching: 3 },
        { format: "pauper", searching: 0 },
      ],
    });

    expect(buckets).toEqual([
      { queue: "ranked", format: "standard", matchTimer: true, bestOf: 1, allowRollback: false, searching: 3 },
    ]);
  });

  it("keeps the public queue counts when the ranked count fails", async () => {
    vi.mocked(matchMaker.query).mockResolvedValue([waitingRoom()] as never);

    const { buckets } = await readCounts({
      countRankedSearchers: async () => {
        throw new Error("database unavailable");
      },
    });

    expect(buckets).toEqual([
      { queue: "casual", format: "standard", matchTimer: true, bestOf: 1, allowRollback: false, searching: 1 },
    ]);
  });

  it("reuses one room query for every request inside the cache window", async () => {
    let time = 1_000;
    vi.mocked(matchMaker.query).mockResolvedValue([waitingRoom()] as never);
    const countRankedSearchers = vi.fn<() => Promise<RankedSearcherCount[]>>(async () => []);

    await withServer({ now: () => time, countRankedSearchers }, async (get) => {
      await get();
      await get();
      time += 4_999;
      await get();
      expect(matchMaker.query).toHaveBeenCalledTimes(1);
      expect(countRankedSearchers).toHaveBeenCalledTimes(1);
      time += 1;
      await get();
      expect(matchMaker.query).toHaveBeenCalledTimes(2);
    });
  });

  it("answers 503 when the room listing is unavailable", async () => {
    vi.mocked(matchMaker.query).mockRejectedValue(new Error("presence down"));

    await withServer({}, async (get) => {
      expect((await get()).status).toBe(503);
    });
  });
});
