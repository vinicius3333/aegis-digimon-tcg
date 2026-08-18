import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-062.js";

describe("BT11-062 Agumon (X Antibody)", () => {
  it("reveals 3 and independently adds a Greymon/X Antibody card and a black Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-062", as: "agumon" }],
          deck: ["BT11-064", "BT10-092", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT11-064", "BT10-092"]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });
});
