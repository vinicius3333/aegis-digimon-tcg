import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("BT20 Takemikazuchi turn-continue dev scenario", () => {
  it("stages Fenriloogamon as a digivolution card under Takemikazuchi with three walking plays", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-bt20-takemikazuchi-turn-continue", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0]!;
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(2);

    const host = human.battleArea.find((perm) => perm.topCard?.cardId === "BT20-081");
    expect(host).toBeDefined();
    expect(host!.stack.map(({ cardId }) => cardId)).toEqual(["BT17-091", "BT16-076", "BT17-069", "BT17-040"]);

    // Two 2-cost plays walk the gauge to 2 on the opponent's side, the 3-cost play crosses to 3.
    expect(human.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009", "BT14-069"]);
    expect(human.security).toHaveLength(5);
  });
});
