import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-109.js";
describe("BT7-109 Dead or Alive", () => {
  it("plays a purple level 5 from trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT7-067"], hand: [{ card: "BT7-109", as: "option" }], trash: ["BT7-074"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});
