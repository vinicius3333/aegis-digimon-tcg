import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("EX13 Grademon immunity dev scenario", () => {
  it("stages Alphamon, Grademon, and a legal attack target for the trigger-order interaction", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-ex13-grademon-immunity", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0] as PlayerState;
    const opponent = state.players[1] as PlayerState;
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(10);
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX13-060"]);
    expect(human.hand.map(({ cardId }) => cardId)).toEqual(["EX13-057"]);
    expect(opponent.battleArea).toHaveLength(1);
    expect(opponent.battleArea[0]).toMatchObject({
      isSuspended: true,
      topCard: { cardId: "BT1-080" },
    });
    expect(opponent.security).toHaveLength(5);
  });
});
