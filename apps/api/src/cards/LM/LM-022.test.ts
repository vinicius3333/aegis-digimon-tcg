import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-022.js";

describe("LM-022 Gabumon - Bond of Friendship", () => {
  it("returns an opposing Digimon at or below the source-card count to the deck bottom", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-022", as: "bond" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "zero" },
          { card: "BT1-010", as: "one", under: ["BT1-001"] },
          { card: "BT1-011", as: "over", under: ["BT1-001", "BT1-002", "BT1-003"] },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bond").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toEqual(expect.arrayContaining(["BT1-010", "BT1-011"]));
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("BT1-009");
  });
});
