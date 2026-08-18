import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-048.js";

describe("EX2-048 ADR-04 Bubbles", () => {
  it("places an ADR-02 Searcher from hand under Mother D-Reaper on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-007", as: "mother" }], hand: [{ card: "EX2-048", as: "bubbles" }, { card: "EX2-046", as: "searcher" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bubbles").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === s.inst("searcher").instanceId));
    expect(s.perm("mother").stack.some((card) => card.instanceId === s.inst("searcher").instanceId)).toBe(true);
  });
});
