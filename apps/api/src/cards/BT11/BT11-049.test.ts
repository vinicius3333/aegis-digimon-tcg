import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-049.js";

describe("BT11-049 Vegiemon", () => {
  it("maps its green champion catalog facts and mandatory start-turn memory", () => {
    expect(getCardDefinition("BT11-049")).toMatchObject({
      cardId: "BT11-049",
      colors: ["Green"],
      level: 4,
      playCost: 4,
      dp: 3000,
      types: ["Carnivorous Plant"],
    });
    expect(compiled.effects).toEqual([{ trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", amount: 1 }] }]);
  });

  it("gains 1 memory at the start of its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-049", as: "vegiemon" },
          { card: "BT1-009", as: "spare" },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"], security: ["BT1-009"] },
    });
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
