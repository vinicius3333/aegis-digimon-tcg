import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("EX13 Chirinmon cost-choice dev scenario", () => {
  it("stages both printed costs as payable before digivolving into Chirinmon", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-ex13-chirinmon-cost-choice", state, [BLUE_DECK, RED_DECK]);

    const [human, opponent] = [state.players[0]!, state.players[1]!];
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(3);
    expect(human.hand).toContainEqual(expect.objectContaining({ cardId: "EX13-032" }));
    expect(human.security.length).toBeGreaterThan(0);
    const tamer = human.battleArea.find(({ topCard }) => topCard.cardId === "BT13-098")!;
    expect([...tamer.stack].map(({ faceUp }) => faceUp)).toEqual([false]);
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT25-023");
    expect(opponent.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT20-031"]);
  });
});
