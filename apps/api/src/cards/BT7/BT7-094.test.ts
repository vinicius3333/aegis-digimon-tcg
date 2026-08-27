import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-094.js";
describe("BT7-094 Atomic Inferno", () => {
  it("deletes up to two opposing Digimon at 8000 DP or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-007"], hand: [{ card: "BT7-094", as: "option" }] },
        1: { battleArea: ["BT7-031", "BT7-032"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
