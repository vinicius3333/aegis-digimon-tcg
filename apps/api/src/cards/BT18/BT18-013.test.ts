import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-013.js";

describe("BT18-013 Deltamon", () => {
  it("trashes a hand card as cost and returns a Composite/Wicked God card from trash", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Return", to: "hand", cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } }, target: { filter: { zone: "trash", controller: "mine" } } }] });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-013", as: "deltamon" }, { card: "BT1-001", as: "cost" }], trash: ["BT18-015"] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deltamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT18-015"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-015")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
