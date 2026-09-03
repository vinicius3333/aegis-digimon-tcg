import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-037.js";

describe("BT3-037 Turuiemon", () => {
  it("plays as a 6000 DP vanilla Digimon without effect activation", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT3-037", as: "turuiemon" }] } });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("turuiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 6000, currentDP: 6000 });
    expect(s.state.memory).toBe(0);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
