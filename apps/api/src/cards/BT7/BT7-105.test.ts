import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-105.js";
describe("BT7-105 Pride Memory Boost!", () => {
  it("reveals and plays a low-cost black Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT7-056"],
          hand: [{ card: "BT7-105", as: "option" }],
          deck: ["BT7-057", "BT7-001", "BT7-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT7-105"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT7-105")).toBe(true);
  });
});
