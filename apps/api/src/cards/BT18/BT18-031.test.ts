import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-031.js";

describe("BT18-031 Neemon", () => {
  it("reveals and adds a Hybrid card and a yellow inherited-effect Tamer", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }] }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }] });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-031", as: "neemon" }], deck: [{ card: "BT12-009" }, { card: "AD1-023" }, { card: "BT1-001" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("neemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT12-009") && s.state.players[0]!.hand.some((card) => card.cardId === "AD1-023"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT12-009")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-023")).toBe(true);
  });
});
