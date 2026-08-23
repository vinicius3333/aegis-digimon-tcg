import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-062.js";

describe("EX2-062 Ryo Akiyama", () => {
  it("adds a Dramon or Justimon card from the top four on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-062", as: "ryo" }],
          deck: [{ card: "EX2-035", as: "cyberdramon" }, "BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cyberdramon").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cyberdramon").instanceId)).toBe(true);
  });
});
