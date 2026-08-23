import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST8-03.js";

describe("ST8-03 Dracomon", () => {
  it("reveals 3, adds a Dramon Digimon and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST8-03", as: "dracomon" }],
          deck: [
            { card: "BT1-009", as: "miss1" },
            { card: "ST8-02", as: "miss2" },
            { card: "ST8-07", as: "hit" },
            { card: "ST8-04", as: "remaining" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hit").instanceId));
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
