import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("EX13 KingSukamon 0-DP deletion dev scenario", () => {
  it("stages the inherited host, EX13-035 aura, rewrite cost, reveal, and opposing target", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-ex13-kingsukamon-immunity-lapse", state, [BLUE_DECK, RED_DECK]);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(7);
    expect(state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX13-031", "BT3-061"]));
    expect(state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([
      "BT1-013",
      "EX13-035",
      "BT14-034",
      "BT13-065",
    ]);
    expect(state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(["EX13-031"]);
    expect(state.players[0]!.deck.slice(0, 3).map(({ cardId }) => cardId)).toEqual([
      "BT13-062",
      "BT1-009",
      "BT1-014",
    ]);
    expect(state.players[1]!.battleArea[0]).toMatchObject({
      permanentId: "opponent-kingsukamon-zero-dp-target",
      topCard: { cardId: "ST15-11" },
    });
  });
});
