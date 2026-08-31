import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-020 Angoramon", () => {
  it("reveals three cards and adds the Angoramon-text card plus Ruli", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "RB1-020", as: "angoramon" }],
          deck: ["RB1-034", "RB1-022", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angoramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "RB1-034")).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "RB1-022")).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["RB1-022", "BT1-009"]);
  });

  it("adds no cards when the revealed cards have no matching text or Ruli name", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "RB1-020", as: "angoramon" }], deck: ["BT1-009", "BT1-014", "BT1-015"] },
    });

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angoramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
