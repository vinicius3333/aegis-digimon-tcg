import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-005.js";

describe("BT11-005 Koromon", () => {
  it("draws when an opponent's Digimon is deleted on their turn and its host is Greymon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-005"] }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand[0]?.cardId).toBe("BT1-009");
  });

  it("does not draw if the Greymon host is deleted in the same batch (Q2046)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-005"] }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([
      s.perm("host").permanentId,
      s.perm("victim").permanentId,
    ]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
