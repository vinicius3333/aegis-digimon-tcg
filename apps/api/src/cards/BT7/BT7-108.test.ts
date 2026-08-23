import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-108.js";
describe("BT7-108 Trump Sword", () => {
  it("deletes opposing level 5 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-067", "BT7-011"], hand: [{ card: "BT7-108", as: "option" }] },
        1: { battleArea: ["BT7-044"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
