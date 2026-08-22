import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-061.js";
import "../index.js";
describe("BT26-061 Chiropmon", () => {
  it("compiles reveal slots and inherited draw/trash", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "RevealAdd", add: [{ count: 1 }, { count: 1 }], rest: "deckBottom" });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
  });
  it("adds Glowing Dawn and purple BEATBREAK cards, bottoming the rest", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT26-061", as: "chirop" }], deck: [{ card: "BT25-035", as: "dawn" }, { card: "BT25-079", as: "beatbreak" }, { card: "BT1-009", as: "rest" }] } }, { autoSelectCards: true, autoOrderCards: true });
    s.state.memory = 3; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chirop").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 1);
    expect(s.state.players[0]!.hand.map((c) => c.cardId).sort()).toEqual(["BT25-035", "BT25-079"]);
    expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual(["BT1-009"]);
  });
});
