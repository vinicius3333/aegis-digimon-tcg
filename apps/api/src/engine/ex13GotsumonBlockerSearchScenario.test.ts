import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("EX13 Gotsumon printed-Blocker dev scenario", () => {
  it("stages Gotsumon over one main Blocker, one inherited-only Blocker, and one non-match", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-ex13-gotsumon-blocker-search", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0]!;
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(3);
    expect(human.hand).toContainEqual(expect.objectContaining({ cardId: "EX13-047" }));
    expect(human.deck.slice(0, 3).map(({ cardId }) => cardId)).toEqual(["BT20-047", "BT1-079", "BT1-009"]);
    expect(human.security).toHaveLength(5);
  });
});
