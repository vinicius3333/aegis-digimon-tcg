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

describe("arena-security-effect-pacing dev scenario", () => {
  it("stacks the bot's [Security] effects in check order and readies three attackers", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-security-effect-pacing", state, [
      catalogDeck("bt26-dgo-2026-08-28-7-chronomon"),
      catalogDeck("bt26-dgo-2026-08-28-8-plutomon"),
    ]);

    const human = state.players[0] as PlayerState;
    const bot = state.players[1] as PlayerState;
    expect(bot.security.map((card) => card.cardId)).toEqual(["ST1-16", "BT1-108", "BT10-087", "ST2-13", "ST2-13"]);
    expect(human.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009", "BT1-009", "BT1-009"]);
    expect(human.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
    expect(state.turnSeat).toBe(0);
  });
});
