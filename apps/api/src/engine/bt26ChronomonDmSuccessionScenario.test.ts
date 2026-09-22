import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("BT26 Chronomon: Destroy Mode Succession dev scenario", () => {
  it("stages both Destroy Mode routes: Holy Mode in play and Giant Slayer losing a battle", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-bt26-chronomon-dm-succession", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0]!;
    const bot = state.players[1]!;
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(6);

    const holyMode = human.battleArea.find(({ topCard }) => topCard.cardId === "BT26-016");
    expect(holyMode).toBeDefined();
    expect(holyMode!.stack.map(({ cardId }) => cardId)).toEqual(["BT26-073"]);

    const giantSlayer = human.battleArea.find(({ topCard }) => topCard.cardId === "BT26-085");
    expect(giantSlayer).toBeDefined();
    expect(giantSlayer!.stack.map(({ cardId }) => cardId)).toEqual(["BT26-016"]);
    expect(human.hand.filter(({ cardId }) => cardId === "BT26-060")).toHaveLength(2);
    expect(human.trash.filter(({ cardId }) => cardId === "BT1-009")).toHaveLength(3);

    const battleWinner = bot.battleArea.find(({ topCard }) => topCard.cardId === "BT1-080");
    expect(battleWinner).toBeDefined();
    expect(battleWinner!.isSuspended).toBe(true);
    expect(battleWinner!.currentDP).toBeGreaterThan(giantSlayer!.currentDP);
    // ＜Collision＞ forces a block, so a second opposing Digimon would absorb the attack and Giant
    // Slayer would never be deleted.
    expect(bot.battleArea).toHaveLength(1);
    expect(battleWinner!.stack).toHaveLength(2);
  });
});
