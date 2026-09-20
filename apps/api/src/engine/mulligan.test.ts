import { describe, expect, it, vi } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { GameState, PlayerState } from "@aegis/shared";
import { MulliganCoordinator } from "./mulligan.js";

describe("MulliganCoordinator execution frames", () => {
  it("keeps frame capture disabled in production even when requested", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const state = new GameState();
      state.players = new ArraySchema<PlayerState>();
      const coordinator = new MulliganCoordinator(
        state,
        { requestDecision: () => {} },
        { executionFramesEnabled: true },
      );
      const answer = coordinator.request(0);

      expect(() => coordinator.exportExecutionFrame()).toThrow(/no serializable execution continuation/);
      expect(coordinator.answer(0, false)).toBe(true);
      await expect(answer).resolves.toBe(false);
      expect(state.pendingDecision).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
