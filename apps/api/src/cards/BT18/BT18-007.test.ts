import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-007.js";

describe("BT18-007 Gazimon", () => {
  it("reveals three and adds one Millenniummon and one Composite/Wicked God card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }] }] });

    const s = setupEngine({ 0: { hand: [{ card: "BT18-007", as: "gazimon" }], deck: [{ card: "BT18-019" }, { card: "BT19-075" }, { card: "BT1-001" }, { card: "BT1-002" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gazimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT18-019") && s.state.players[0]!.hand.some((card) => card.cardId === "BT19-075"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-019")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-075")).toBe(true);
    expect(s.state.players[0]!.deck.length).toBe(2);
  });
});
