import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-020.js";

describe("BT3-020 Patamon", () => {
  it("plays with its catalogued 4000 DP and has no effect resolution", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT3-020", as: "patamon" }] } });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 4000, currentDP: 4000 });
    expect(s.state.memory).toBe(-1);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
