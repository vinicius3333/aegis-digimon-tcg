import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-005.js";
import "../index.js";

describe("EX5-005 Tokomon", () => {
  it("draws one on deletion during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "isOpponentsTurn" } }],
    });
  });

  it("draws when deleted during the opponent's turn but not during its own turn", async () => {
    const opponentTurn = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-005"] }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    await opponentTurn.ready();
    opponentTurn.state.turnSeat = 1;
    await advance(opponentTurn.engine).verb.deletePermanent([opponentTurn.perm("host").permanentId], "byEffect");
    await settle(
      () =>
        opponentTurn.state.players[0]!.hand.some((card) => card.instanceId === opponentTurn.inst("drawn").instanceId),
      500,
    );
    expect(
      opponentTurn.state.players[0]!.hand.some((card) => card.instanceId === opponentTurn.inst("drawn").instanceId),
    ).toBe(true);

    const ownTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-005"] }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    await ownTurn.ready();
    await advance(ownTurn.engine).verb.deletePermanent([ownTurn.perm("host").permanentId], "byEffect");
    await settle(() => ownTurn.state.players[0]!.battleArea.length === 0, 300);
    expect(ownTurn.state.players[0]!.hand.some((card) => card.instanceId === ownTurn.inst("drawn").instanceId)).toBe(
      false,
    );
  });
});
