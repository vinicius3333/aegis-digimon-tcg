import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-075.js";

describe("BT12-075 Psychemon", () => {
  it("returns a Save Digimon from under a Tamer to hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "tamer", under: ["BT10-008"] }],
          hand: [{ card: "BT12-075", as: "psyche" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("psyche").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT10-008"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT10-008");
  });
});
