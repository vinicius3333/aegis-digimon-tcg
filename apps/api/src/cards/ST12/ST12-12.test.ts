import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST12-12 Sistermon Blanc", () => {
  it("may trash 1 hand card to draw exactly 2 and gains Decoy with Huckmon in play", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST12-04"], hand: [{ card: "ST12-12", as: "blanc" }, { card: "BT1-001", as: "cost" }], deck: ["BT1-002", "BT1-003"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blanc").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
    const blanc = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "ST12-12")!;
    expect(observe(s.engine).hasKeyword(blanc, "Decoy")).toBe(true);
    expect([...blanc.keywords]).toContain("Decoy");
  });
});
