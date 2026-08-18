import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-08.js";

describe("ST10-08 Tsukaimon", () => {
  it("adds an Angel-trait card from the revealed top 3", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST10-08", as: "tsukaimon" }], deck: [{ card: "ST10-05", as: "angel" }, { card: "ST10-07", as: "rest1" }, { card: "ST10-11", as: "rest2" }] } }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tsukaimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("angel").instanceId));
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
