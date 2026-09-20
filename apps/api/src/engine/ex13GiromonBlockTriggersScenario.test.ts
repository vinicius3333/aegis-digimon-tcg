import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("EX13 Giromon block-trigger dev scenario", () => {
  it("stages Giromon over Guardromon, two ST15 Tai Tamers, and fixed follow-up cards", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-ex13-giromon-block-triggers", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0] as PlayerState;
    const opponent = state.players[1] as PlayerState;
    expect(state.turnSeat).toBe(1);
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX13-056", "ST15-14", "ST15-14"]);
    expect(human.battleArea[0]?.stack.map(({ cardId }) => cardId)).toEqual(["EX13-051"]);
    expect(human.deck.slice(0, 3).map(({ cardId }) => cardId)).toEqual(["LM-031", "EX13-047", "EX13-062"]);
    expect(human.hand.some(({ cardId }) => cardId === "EX13-051")).toBe(true);
    expect(opponent.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["AD1-001"]);
  });
});
