import { describe, expect, it, vi } from "vitest";
import { drainForShutdown } from "./drain.js";

describe("the deployment drain ordering", () => {
  it("stops the deadline worker and waits for it before the rooms shut down", async () => {
    const order: string[] = [];
    let workerStopped = false;
    await drainForShutdown({
      stopDeadlineWorker: async () => {
        order.push("worker:stop");
        // A pass in flight: the room shutdown must not begin while this is still running.
        await Promise.resolve();
        await Promise.resolve();
        workerStopped = true;
        order.push("worker:stopped");
      },
      shutdownRooms: () => {
        expect(workerStopped).toBe(true);
        order.push("rooms");
      },
    });
    expect(order).toEqual(["worker:stop", "worker:stopped", "rooms"]);
  });

  it("drains the rooms anyway when the worker refuses to stop", async () => {
    // Holding the port because a background loop misbehaved would fail the deploy, which is worse
    // than the lapsed lease another instance will retry in seconds.
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const shutdownRooms = vi.fn();
    await drainForShutdown({
      stopDeadlineWorker: () => Promise.reject(new Error("loop wedged")),
      shutdownRooms,
    });
    expect(shutdownRooms).toHaveBeenCalledTimes(1);
    // The failure is reported rather than swallowed: a wedged loop must be visible in the deploy log.
    expect(stderr.mock.calls.map(String).join("")).toContain("loop wedged");
    stderr.mockRestore();
  });

  it("tolerates a process with no worker at all", async () => {
    const shutdownRooms = vi.fn();
    await drainForShutdown({ stopDeadlineWorker: () => undefined, shutdownRooms });
    expect(shutdownRooms).toHaveBeenCalledTimes(1);
  });
});
