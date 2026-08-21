import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-09.js";
describe("ST16-09 Pumpkinmon", () => {
  it("plays a purple level 3 from trash", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST16-09", as: "card" }], trash: ["ST16-05"] } });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2, 1500);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST16-05")).toBe(true);
  });
});
