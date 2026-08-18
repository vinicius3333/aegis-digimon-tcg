import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-077.js";

describe("BT11-077 Chikurimon", () => {
  it("deletes itself on play to reveal 5 and add a Bagra Army card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-077", as: "chikurimon" }],
          deck: ["BT11-082", "BT1-009", "BT1-010", "BT1-015", "BT1-020"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chikurimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-082"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT11-077")).toBe(false);
  });
});
