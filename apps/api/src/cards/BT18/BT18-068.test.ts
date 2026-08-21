import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-068.js";

describe("BT18-068 Wisemon", () => {
  it("returns the five revealed cards to the chosen deck destination and has Blocker", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT18-068", as: "wisemon" }], deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"] } },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const topFive = s.state.players[0]!.deck.slice(0, 5).map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wisemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 6);
    await s.ready();

    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.players[0]!.deck.slice(0, 5).map((card) => card.instanceId)).toEqual(topFive);
    const wisemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-068")!;
    expect(observe(s.engine).hasKeyword(wisemon, "Blocker")).toBe(true);
  });
});
