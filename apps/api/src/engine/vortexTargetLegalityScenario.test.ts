import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("arena-vortex-target-legality dev scenario", () => {
  it("stages one suspended valid target and one unsuspended invalid target", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-vortex-target-legality", state, [BLUE_DECK, RED_DECK]);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(0);
    expect([...state.players[0]!.battleArea]).toEqual([
      expect.objectContaining({
        permanentId: "you-vortex-target-attacker",
        isSuspended: false,
        topCard: expect.objectContaining({ cardId: "EX7-034" }),
      }),
    ]);
    expect([...state.players[1]!.battleArea]).toEqual([
      expect.objectContaining({ permanentId: "opponent-vortex-valid-target", isSuspended: true }),
      expect.objectContaining({ permanentId: "opponent-vortex-invalid-target", isSuspended: false }),
    ]);
  });
});
