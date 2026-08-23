import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-067.js";

describe("EX2-067 Fire Ball", () => {
  it("draws 2 when it can't delete an opposing 3000-DP-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["EX2-056"], hand: [{ card: "EX2-067", as: "option" }], deck: ["BT1-001", "BT1-002"] },
        1: { battleArea: ["EX2-029"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });
});
