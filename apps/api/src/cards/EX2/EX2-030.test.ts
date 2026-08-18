import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-030.js";

describe("EX2-030 Monodramon", () => {
  it("adds every black Tamer among the top four cards on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX2-030", as: "monodramon" }], deck: [{ card: "EX2-062", as: "ryo" }, { card: "EX2-063", as: "kazu" }, "BT1-001", "BT1-002"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monodramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("ryo").instanceId, s.inst("kazu").instanceId]));
  });
});
