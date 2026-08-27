import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX2-046.js";

describe("EX2-046 ADR-02 Searcher", () => {
  it("registers full compiled IR without residuals", () => {
    const compiled = registeredCompiledCards.get("EX2-046");
    expect(compiled?.coverage).toBe("full");
    expect(compiled?.residual).toEqual([]);
    expect(compiled?.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { isSelfRef: true } }],
    });
  });
  it("costs 2 less without another Searcher and draws 1 on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX2-046", as: "searcher" }], deck: [{ card: "BT1-001", as: "drawn" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("searcher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
