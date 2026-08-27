import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-069.js";

describe("BT7-069 Eyesmon: Scatter Mode", () => {
  it("draws 3 and then trashes 2 cards from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-069", as: "scatter" }],
          hand: ["BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("scatter").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.length === 3);

    expect(s.state.players[0]!.hand).toHaveLength(3);
  });
});
