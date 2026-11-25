import { describe, expect, it, vi } from "vitest";
import type { ReplayRecord } from "#api/replays/inputs/types";
import { createForumReplayCache } from "#api/bugs/createForumReplayCache";

const record = { matchId: "m" } as ReplayRecord;

describe("createForumReplayCache", () => {
  it("renders each report once, one at a time, and serves repeats from the cache", async () => {
    let active = 0;
    let peak = 0;
    const render = vi.fn<(record: ReplayRecord) => Promise<Uint8Array>>(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return new Uint8Array([1]);
    });
    const cache = createForumReplayCache(render);

    await Promise.all([cache(1, record), cache(1, record), cache(2, record)]);
    await cache(1, record);

    expect(render).toHaveBeenCalledTimes(2);
    expect(peak).toBe(1);
  });

  it("refuses a new report while three renders are already waiting", async () => {
    const render = vi.fn<(record: ReplayRecord) => Promise<Uint8Array>>(() => new Promise(() => {}));
    const cache = createForumReplayCache(render);
    for (const id of [1, 2, 3]) void cache(id, record);

    await expect(cache(4, record)).rejects.toThrow(/busy/);
    expect(cache(2, record)).toBeInstanceOf(Promise);
  });

  it("retries a report whose render failed", async () => {
    const render = vi
      .fn<(record: ReplayRecord) => Promise<Uint8Array>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(new Uint8Array([2]));
    const cache = createForumReplayCache(render);
    await expect(cache(3, record)).rejects.toThrow("boom");
    await expect(cache(3, record)).resolves.toEqual(new Uint8Array([2]));
  });
});
