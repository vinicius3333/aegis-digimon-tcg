import { describe, expect, it, vi } from "vitest";
import { createAegisRoomHandoffPorts } from "./roomHandoffAegisPorts.js";

describe("Aegis room handoff ports", () => {
  it("uses the durable generation task count and propagates store failures", async () => {
    const countPendingTasksByGeneration = vi.fn(async () => ({
      commands: 2,
      outbox: 3,
      transfers: 4,
      total: 9,
    }));
    const ports = createAegisRoomHandoffPorts({ store: { countPendingTasksByGeneration }, generationId: "g-test" });

    await expect(ports.authoritativePendingTasks?.("g-blue")).resolves.toBe(9);
    expect(countPendingTasksByGeneration).toHaveBeenCalledExactlyOnceWith("g-blue");

    countPendingTasksByGeneration.mockRejectedValueOnce(new Error("database_unavailable"));
    await expect(ports.authoritativePendingTasks?.("g-blue")).rejects.toThrow("database_unavailable");
  });

  it("rejects malformed durable counts so cleanup remains unverifiable", async () => {
    const ports = createAegisRoomHandoffPorts({
      generationId: "g-test",
      store: {
        countPendingTasksByGeneration: async () => ({ commands: Number.NaN, outbox: 0, transfers: 0, total: 0 }),
      },
    });

    await expect(ports.authoritativePendingTasks?.("g-blue")).rejects.toThrow(
      "room_handoff_pending_task_count_invalid",
    );
  });
});
