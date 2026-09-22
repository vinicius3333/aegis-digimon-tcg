import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("BT11 Analogman redirect timing dev scenario", () => {
  it("stages a human effect-driven attacker against the bot's Analogman and level 6 Machine", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-bt11-analogman-redirect-timing", state, [BLUE_DECK, RED_DECK]);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(10);
    expect(state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT13-021"]);
    expect(state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT25-016");
    expect(state.players[0]!.deck[0]!.cardId).toBe("BT1-009");
    expect(state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT11-092", "BT15-066"]);
    expect(state.players[1]!.battleArea.every(({ isSuspended }) => !isSuspended)).toBe(true);
  });
});
