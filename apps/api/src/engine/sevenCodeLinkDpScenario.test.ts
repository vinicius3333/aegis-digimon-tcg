import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("Seven Code Link DP dev scenario", () => {
  it("stages receiving, giving, and Seven-Code-to-Seven-Code DP comparisons", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-seven-code-link-dp", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0] as PlayerState;
    expect(state.turnSeat).toBe(0);
    expect(human.battleArea).toHaveLength(3);
    expect(
      human.battleArea.map(({ topCard, linked }) => ({
        host: topCard.cardId,
        linked: linked.map(({ cardId }) => cardId),
      })),
    ).toEqual([
      { host: "BT26-028", linked: ["BT21-009"] },
      { host: "BT21-023", linked: ["BT26-037"] },
      { host: "BT26-037", linked: ["BT26-028"] },
    ]);
    expect(state.players[1]!.security).toHaveLength(5);
  });
});
