import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("ST24 DNA Charge start-of-main dev scenario", () => {
  it("stages the placed Option beside two DATA SQUAD Tamers with the bot on turn", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-st24-dna-charge-start-of-main", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0]!;
    // The bot holds the turn, so ending it opens the human's Main phase and its picker.
    expect(state.turnSeat).toBe(1);
    expect(state.memory).toBe(3);
    expect(human.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT26-094", "ST24-14", "ST24-15"]);
    const option = human.battleArea.find((permanent) => permanent.topCard?.cardId === "ST24-15")!;
    expect(option.placedByEffect).toBe(true);
    expect(human.hand).toContainEqual(expect.objectContaining({ cardId: "ST24-02" }));
    expect(human.security).toHaveLength(5);
  });
});
