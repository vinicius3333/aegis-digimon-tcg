import { GameState, PlayerState, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("Seven Code Link DP dev scenario", () => {
  it("preserves the printed +3000 Link DP for all seven BT26 Seven Code cards", () => {
    const cardIds = ["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"];
    expect(cardIds.map((cardId) => [cardId, getCardDefinition(cardId)?.linkDp])).toEqual(
      cardIds.map((cardId) => [cardId, 3000]),
    );
  });

  it("stages receiving, giving, and Seven-Code-to-Seven-Code DP comparisons", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-seven-code-link-dp", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0] as PlayerState;
    expect(state.turnSeat).toBe(0);
    expect(human.battleArea).toHaveLength(3);
    expect(
      human.battleArea.map(({ topCard, linked, currentDP }) => ({
        host: topCard.cardId,
        linked: linked.map(({ cardId }) => cardId),
        currentDP,
      })),
    ).toEqual([
      { host: "BT26-028", linked: ["BT21-009"], currentDP: 7000 },
      { host: "BT21-023", linked: ["BT26-037"], currentDP: 13000 },
      { host: "BT26-037", linked: ["BT26-028"], currentDP: 8000 },
    ]);
    expect(state.players[1]!.security).toHaveLength(5);
  });
});
