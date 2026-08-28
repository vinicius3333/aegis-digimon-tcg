import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-042.js";

describe("BT5-042 Knightmon", () => {
  it("gives one opponent Digimon -4000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-042", as: "source" }],
          battleArea: [{ card: "BT1-026", as: "mine" }],
        },
        1: {
          battleArea: [
            { card: "BT1-026", as: "target" },
            { card: "BT1-026", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 7000);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(11000);
    expect(s.perm("mine").currentDP).toBe(11000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(11000);
    expect(s.perm("other").currentDP).toBe(11000);
  });
});
