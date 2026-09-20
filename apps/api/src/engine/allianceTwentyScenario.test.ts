import { GameState, getCardDefinition, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("arena-alliance-20 dev scenario", () => {
  it("stages one Alliance attacker and 19 allies on the human field", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-alliance-20", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0] as PlayerState;
    expect(state.turnSeat).toBe(0);
    expect(human.battleArea).toHaveLength(20);
    expect(new Set(human.battleArea.map(({ permanentId }) => permanentId)).size).toBe(20);

    const attacker = human.battleArea.find(({ topCard }) => topCard.cardId === "BT23-020");
    expect(attacker).toBeDefined();
    expect(getCardDefinition(attacker!.topCard.cardId)?.effectText).toContain("＜Alliance＞");
    expect(human.battleArea.filter(({ topCard }) => topCard.cardId === "BT1-010")).toHaveLength(19);
  });
});
