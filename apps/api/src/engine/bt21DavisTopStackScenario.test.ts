import { CATALOG_DECKS, GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import "../cards/index.js";

function catalogDeck(deckId: string) {
  const deck = CATALOG_DECKS.find((entry) => entry.deckId === deckId);
  if (deck === undefined) throw new Error(`Missing catalog deck ${deckId}`);
  return {
    mainDeck: [...deck.decklist.mainDeck],
    eggDeck: [...deck.decklist.eggDeck],
  };
}

describe("arena-bt21-davis-top-stack dev scenario", () => {
  it("starts Davis beside Magnamon stacked over Veemon with a drawable card and opposing Digimon", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-bt21-davis-top-stack", state, [
      catalogDeck("bt26-dgo-2026-08-28-7-chronomon"),
      catalogDeck("bt26-dgo-2026-08-28-8-plutomon"),
    ]);

    const human = state.players[0] as PlayerState;
    const davis = human.battleArea.find(({ topCard }) => topCard.cardId === "BT21-085");
    const magnamon = human.battleArea.find(({ topCard }) => topCard.cardId === "BT21-036");

    expect(davis).toBeDefined();
    expect(davis?.isSuspended).toBe(false);
    expect(magnamon?.stack.map(({ cardId }) => cardId)).toEqual(["BT3-021"]);
    expect(human.deck.slice(0, 2).map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(state.players[1]?.battleArea).toHaveLength(1);
    expect(state.turnSeat).toBe(0);
    expect(state.isFirstPlayersFirstTurn).toBe(false);
    expect(state.memory).toBe(3);
  });
});
