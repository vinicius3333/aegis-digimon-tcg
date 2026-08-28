import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-020.js";

describe("EX2-020 Lopmon", () => {
  it("recovers on play with at most 3 security and Shu-Chong Wong in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-059"],
          hand: [{ card: "EX2-020", as: "lopmon" }],
          deck: ["BT1-001"],
          security: ["BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });
});
