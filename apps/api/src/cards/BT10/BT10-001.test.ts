import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT10-001.js";

describe("BT10-001 DemiMeramon", () => {
  it("gives its host +1000 DP while a non-red card is in its digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-020", "BT10-001"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not treat a red multicolor digivolution card as non-red (Q1929)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT10-013",
            as: "host",
            under: ["BT10-009", "BT10-001"],
          },
        ],
      },
    });

    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not grant the bonus for an entirely red stack or during the opponent's turn", async () => {
    const redStack = setupEngine({
      0: { battleArea: [{ card: "BT10-013", as: "host", under: ["BT10-009", "BT10-001"] }] },
    });
    await redStack.ready();
    expect(redStack.perm("host").currentDP).toBe(redStack.perm("host").baseDP);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-020", "BT10-001"] }] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.engine.recomputeContinuousEffects();
    expect(opponentTurn.perm("host").currentDP).toBe(opponentTurn.perm("host").baseDP);
  });
});
