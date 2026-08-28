import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-019.js";

describe("EX2-019 Renamon", () => {
  it("reveals four and adds a named evolution and Rika", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-019", as: "renamon" }],
          deck: [{ card: "EX2-021", as: "kyubimon" }, { card: "EX2-060", as: "rika" }, "BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("kyubimon").instanceId, s.inst("rika").instanceId]),
    );
  });
});
