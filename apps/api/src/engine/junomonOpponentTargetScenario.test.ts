import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("arena-junomon-opponent-target dev scenario", () => {
  it("stages Junomon with one placement-cost target on each side", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-junomon-opponent-target", state, [BLUE_DECK, RED_DECK]);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(10);
    expect(state.players[0]!.hand).toContainEqual(expect.objectContaining({ cardId: "BT25-044" }));
    expect([...state.players[0]!.battleArea]).toEqual([
      expect.objectContaining({ topCard: expect.objectContaining({ cardId: "BT1-010" }) }),
    ]);
    expect([...state.players[1]!.battleArea]).toEqual([
      expect.objectContaining({ topCard: expect.objectContaining({ cardId: "BT1-009" }) }),
    ]);
    expect(state.players[0]!.security).toHaveLength(5);
    expect(state.players[1]!.security).toHaveLength(5);
  });
});
