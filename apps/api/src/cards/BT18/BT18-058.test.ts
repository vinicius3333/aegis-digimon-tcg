import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-058.js";

describe("BT18-058 Kotemon", () => {
  it("trashes a Knightmon-text card from hand to draw two", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-058", as: "kotemon" },
            { card: "BT18-099", as: "knightmonText" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-011"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("knightmonText").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-010", "BT1-011"]));
  });
});
