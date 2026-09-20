import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("suspend-lock Blocker dev scenario", () => {
  it("stages a plain established attacker opposite the Blocker that startup suspend-locks", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-suspend-lock-block", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0] as PlayerState;
    const opponent = state.players[1] as PlayerState;
    expect(state.turnSeat).toBe(1);
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["ST18-07"]);
    expect(human.security).toHaveLength(5);
    expect(opponent.battleArea).toHaveLength(1);
    expect(opponent.battleArea[0]).toMatchObject({
      isSuspended: false,
      topCard: { cardId: "AD1-001" },
    });
  });
});
