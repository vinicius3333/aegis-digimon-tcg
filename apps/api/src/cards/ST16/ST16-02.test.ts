import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-02.js";
describe("ST16-02 Elecmon", () => {
  it("draws then trashes one card on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST16-02", as: "card" }], deck: ["BT1-009", "BT1-009"], battleArea: [] } });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1, 1000);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
