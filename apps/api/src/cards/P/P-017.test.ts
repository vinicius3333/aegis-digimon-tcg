import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-017.js";

describe("P-017 DemiDevimon", () => {
  it("trashes exactly the top two cards of its controller's deck", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-017", as: "demidevimon" }],
        deck: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-027", as: "second" },
          { card: "BT1-038", as: "third" },
        ],
      },
    });
    const p0 = s.state.players[0]!;
    const first = s.inst("first").instanceId;
    const second = s.inst("second").instanceId;
    const third = s.inst("third").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.length === 2);
    expect(p0.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([first, second]));
    expect(p0.deck.map((card) => card.instanceId)).toEqual([third]);
  });
});
