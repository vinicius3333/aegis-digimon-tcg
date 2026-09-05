import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-024.js";

describe("EX1-024 Patamon", () => {
  it("reveals 4 and adds an Angel, Archangel, or Three Great Angels Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-024", as: "patamon" }],
          deck: ["EX1-028", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX1-028"));
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it.each([
    ["Angel", "BT1-055"],
    ["Archangel", "BT1-060"],
    ["Three Great Angels", "BT1-063"],
  ])("accepts the %s trait alternative", async (_trait, matchingCard) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-024", as: "patamon" }],
          deck: [matchingCard, "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === matchingCard));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === matchingCard)).toBe(true);
  });

  it("bottom-decks all four revealed cards when no trait matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-024", as: "patamon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
