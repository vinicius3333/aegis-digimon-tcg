import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-092.js";
describe("BT7-092 Atomic Inferno", () => {
  it("gives Security Attack +1 and enters the battle area", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT7-007"], hand: [{ card: "BT7-092", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT7-092"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT7-092")).toBe(true);
  });
});
