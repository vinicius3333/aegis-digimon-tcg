import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-042.js";

describe("EX2-042 Mephistomon", () => {
  it("draws 2 and trashes 2 cards from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-042", as: "mephistomon" }, "BT1-001", "BT1-002"],
          deck: [
            { card: "BT1-003", as: "drawOne" },
            { card: "BT1-004", as: "drawTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mephistomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });
});
