import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("BT8 Digimon Emperor breeding-memory dev scenario", () => {
  it("stages the human's level 3 breeding Digimon opposite the bot's Digimon Emperor at 1 memory", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-bt8-digimon-emperor-breeding-memory", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0]!;
    const bot = state.players[1]!;
    expect(state.turnSeat).toBe(0);
    // The Emperor's +2 must land the bot on exactly the 1-memory turn-end threshold.
    expect(state.memory).toBe(1);
    expect(human.breeding?.topCard.cardId).toBe("BT1-009");
    expect(human.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT19-088");
    expect(bot.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT8-094", "BT1-009"]);
    expect(human.security).toHaveLength(5);
  });
});
