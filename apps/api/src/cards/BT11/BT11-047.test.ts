import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-047.js";

describe("BT11-047 Palmon", () => {
  it("maps the green rookie catalog facts and mandatory start-turn draw", () => {
    expect(getCardDefinition("BT11-047")).toMatchObject({
      cardId: "BT11-047",
      colors: ["Green"],
      level: 3,
      playCost: 3,
      dp: 2000,
      types: ["Vegetation"],
    });
    expect(compiled.effects).toEqual([
      { trigger: "StartOfYourTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
    ]);
  });

  it("draws at the start of its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-047", as: "palmon" },
          { card: "BT1-009", as: "spare" },
        ],
        deck: [
          { card: "BT1-009", as: "normalDraw" },
          { card: "BT1-010", as: "palmonDraw" },
          "BT1-011",
          "BT1-012",
          "BT1-013",
        ],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"], security: ["BT1-009"] },
    });
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("normalDraw").instanceId, s.inst("palmonDraw").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
