import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-030.js";

describe("BT18-030 Candlemon", () => {
  it("reveals three and adds a matching Witchelny card while returning the rest to deck bottom", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }] }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay" }] });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-030", as: "candle" }], deck: [{ card: "BT18-036" }, { card: "BT1-001" }, { card: "BT1-002" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candle").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT18-036"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-036")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
