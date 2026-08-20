import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-014.js";

describe("LM-014 Espimon", () => {
  it("plays through the public engine and adds a revealed Tamer", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "LM-014", as: "espimon" }],
        deck: ["AD1-020", "BT1-001", "BT1-002"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("espimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-020"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-020")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
