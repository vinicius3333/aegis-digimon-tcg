import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnimationQueue, type AnimationStep } from "./animationQueue";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Records the order beats happen in, so a test can read the whole timeline. */
function recorder() {
  const log: string[] = [];
  const step = (id: string, ms: number, overrides: Partial<AnimationStep> = {}): AnimationStep => ({
    id,
    async run(context) {
      log.push(`${id}:start`);
      await context.wait(ms);
      log.push(context.cancelled ? `${id}:cancelled` : `${id}:end`);
    },
    ...overrides,
  });
  return { log, step };
}

describe("animation queue", () => {
  it("runs steps on one track in order, each waiting out its own time", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue(step("first", 100));
    queue.enqueue(step("second", 100));
    await vi.advanceTimersByTimeAsync(0);

    expect(log).toEqual(["first:start"]);
    await vi.advanceTimersByTimeAsync(100);
    expect(log).toEqual(["first:start", "first:end", "second:start"]);
    await vi.advanceTimersByTimeAsync(100);
    expect(log).toEqual(["first:start", "first:end", "second:start", "second:end"]);
    expect(queue.isIdle()).toBe(true);
  });

  it("runs a parallel group together and only continues when the slowest is done", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue([step("short", 50), step("long", 200)]);
    queue.enqueue(step("after", 10));
    await vi.advanceTimersByTimeAsync(0);

    expect(log).toEqual(["short:start", "long:start"]);
    await vi.advanceTimersByTimeAsync(50);
    expect(log).toContain("short:end");
    expect(log).not.toContain("after:start");
    await vi.advanceTimersByTimeAsync(150);
    expect(log).toEqual(["short:start", "long:start", "short:end", "long:end", "after:start"]);
  });

  it("keeps separate tracks on their own clocks", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue(step("banner", 1000, { track: "banner" }));
    queue.enqueue(step("lunge", 100, { track: "lunge" }));
    await vi.advanceTimersByTimeAsync(100);

    expect(log).toEqual(["banner:start", "lunge:start", "lunge:end"]);
    await vi.advanceTimersByTimeAsync(900);
    expect(log.at(-1)).toBe("banner:end");
  });

  it("cancels the running step when a replacing step lands on its track", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue(step("old", 1000, { track: "clash" }));
    await vi.advanceTimersByTimeAsync(10);
    queue.enqueue(step("new", 1000, { track: "clash", replace: true }));
    await vi.advanceTimersByTimeAsync(0);

    expect(log).toEqual(["old:start", "old:cancelled", "new:start"]);
  });

  it("skip cuts the wait a step is sitting in and fast-forwards what follows", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue(step("running", 5000));
    queue.enqueue(step("queued", 5000));
    await vi.advanceTimersByTimeAsync(0);
    expect(log).toEqual(["running:start"]);

    queue.skip();
    await queue.idle();

    expect(log).toEqual(["running:start", "running:end", "queued:start", "queued:end"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("skip leaves an unskippable step its full time", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue(step("readable", 1000, { skippable: false }));
    await vi.advanceTimersByTimeAsync(0);
    queue.skip();
    await vi.advanceTimersByTimeAsync(0);

    expect(log).toEqual(["readable:start"]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(log).toEqual(["readable:start", "readable:end"]);
  });

  it("drain mode collapses skippable waits but keeps readable ones", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue({ mode: "drain" });

    queue.enqueue(step("motion", 900, { track: "motion" }));
    queue.enqueue(step("notice", 900, { track: "notice", skippable: false }));
    await vi.advanceTimersByTimeAsync(0);

    expect(log).toContain("motion:end");
    expect(log).not.toContain("notice:end");
    await vi.advanceTimersByTimeAsync(900);
    expect(log.at(-1)).toBe("notice:end");
  });

  it("replay mode collapses every wait, readable or not", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue({ mode: "replay" });

    queue.enqueue(step("motion", 900));
    queue.enqueue(step("notice", 900, { skippable: false }));
    await queue.idle();

    expect(log).toEqual(["motion:start", "motion:end", "notice:start", "notice:end"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lets a step replay itself while the queue stays live", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue(step("replayed", 900, { mode: "replay", skippable: false }));
    await queue.idle();
    expect(log).toEqual(["replayed:start", "replayed:end"]);

    queue.enqueue(step("live", 900));
    await vi.advanceTimersByTimeAsync(0);
    expect(log.at(-1)).toBe("live:start");
    await vi.advanceTimersByTimeAsync(900);
    expect(log.at(-1)).toBe("live:end");
  });

  it("switching to drain mid-step releases the wait already in flight", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue(step("motion", 5000));
    await vi.advanceTimersByTimeAsync(0);
    queue.setMode("drain");
    await queue.idle();

    expect(log).toEqual(["motion:start", "motion:end"]);
  });

  it("picks up a step enqueued while the track is running", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue({
      id: "opener",
      async run(context) {
        log.push("opener:start");
        queue.enqueue(step("late", 50));
        await context.wait(50);
        log.push("opener:end");
      },
    });
    await vi.advanceTimersByTimeAsync(100);

    expect(log).toEqual(["opener:start", "opener:end", "late:start", "late:end"]);
    expect(queue.isIdle()).toBe(true);
  });

  it("clear stops what is running and drops what is behind it", async () => {
    const { log, step } = recorder();
    const queue = createAnimationQueue();

    queue.enqueue(step("running", 1000));
    queue.enqueue(step("queued", 1000));
    await vi.advanceTimersByTimeAsync(0);
    queue.clear();
    await queue.idle();

    expect(log).toEqual(["running:start", "running:cancelled"]);
    expect(queue.pendingCount()).toBe(0);
  });

  it("reports a failing step and keeps the track moving", async () => {
    const { log, step } = recorder();
    const onError = vi.fn<(error: unknown, step: AnimationStep) => void>();
    const queue = createAnimationQueue({ onError });

    queue.enqueue({
      id: "broken",
      run() {
        throw new Error("cue failed");
      },
    });
    queue.enqueue(step("next", 10));
    await vi.advanceTimersByTimeAsync(10);

    expect(onError).toHaveBeenCalledOnce();
    expect(log).toEqual(["next:start", "next:end"]);
  });
});
