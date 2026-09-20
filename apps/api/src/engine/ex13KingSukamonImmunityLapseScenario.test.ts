import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("EX13 KingSukamon immunity-lapse dev scenario", () => {
  it("stages KingSukamon, its cost, and the opposing immunity target", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-ex13-kingsukamon-immunity-lapse", state, [BLUE_DECK, RED_DECK]);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(7);
    expect(state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX13-031", "BT3-061"]));
    expect(state.players[1]!.battleArea[0]).toMatchObject({
      permanentId: "opponent-kingsukamon-immune-target",
      topCard: { cardId: "ST15-11" },
    });
  });
});
