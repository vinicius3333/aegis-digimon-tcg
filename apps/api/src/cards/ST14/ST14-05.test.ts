import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST14-05.js";

describe("ST14-05 Porcupamon", () => {
  it("has Blocker and mills 2 on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST14-05", as: "porcu" }], deck: ["BT1-009", "BT1-010"] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("porcu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "ST14-05")!;
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
