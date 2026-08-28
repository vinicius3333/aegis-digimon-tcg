import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-107.js";
describe("BT7-107 Calling From the Darkness", () => {
  it("deletes one Digimon and returns purple cards from trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT7-067"], hand: [{ card: "BT7-107", as: "option" }], trash: ["BT7-068"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "BT7-068"));
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT7-068")).toBe(true);
  });
});
