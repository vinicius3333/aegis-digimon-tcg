import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-001.js";

describe("BT11-001 Yokomon", () => {
  it("draws 1 on its host's deletion while a red Tamer remains in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-015", as: "host", under: ["BT11-001"] },
          "BT1-085",
        ],
        deck: ["BT1-009"],
      },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand[0]?.cardId).toBe("BT1-009");
  });

  it("does not draw without a red Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-001"] }],
        deck: ["BT1-009"],
      },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
