import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-02.js";

describe("ST9-02 Veemon", () => {
  it("adds a Free card from the top 3 and bottoms the rest", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST9-02", as: "veemon" }], deck: [{ card: "BT1-009", as: "miss1" }, { card: "ST9-05", as: "free" }, { card: "BT1-010", as: "miss2" }] } }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 2 && s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("free").instanceId));
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
