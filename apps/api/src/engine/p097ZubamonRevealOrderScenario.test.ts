import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("P-097 Zubamon reveal-order dev scenario", () => {
  it("stages a turn draw above the three cards Zubamon reveals, with a Legend-Arms host", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-p097-zubamon-reveal-order", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0]!;
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(3);
    expect(human.hand).toContainEqual(expect.objectContaining({ cardId: "P-097" }));
    expect(human.battleArea).toHaveLength(1);
    expect(human.battleArea[0]!.topCard.cardId).toBe("BT3-008");
    expect(human.deck.slice(0, 4).map(({ cardId }) => cardId)).toEqual(["BT1-019", "BT1-009", "BT1-010", "BT1-011"]);
    expect(human.security).toHaveLength(5);
  });
});
