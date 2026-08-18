import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-047.js";

describe("EX2-047 ADR-03 Pendulum Feet", () => {
  it("adds a D-Reaper and ADR-02 Searcher from the top three", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX2-047", as: "pendulum" }], deck: [{ card: "EX2-050", as: "dreaper" }, { card: "EX2-046", as: "searcher" }, "BT1-001"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulum").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("dreaper").instanceId, s.inst("searcher").instanceId]));
  });
});
