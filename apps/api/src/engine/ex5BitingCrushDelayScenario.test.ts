import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import "../cards/index.js";

describe("EX5-069 Biting Crush ＜Delay＞ dev scenario", () => {
  it("stages an established Biting Crush, Leviamon in the trash, and Fujitsumon in hand", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-ex5-biting-crush-delay", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0]!;
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(6);
    const bitingCrush = human.battleArea.find(({ topCard }) => topCard?.cardId === "EX5-069");
    expect(bitingCrush).toBeDefined();
    // Both gates that make the window reachable: the Option is a legal battle-area resident, and
    // it arrived before this turn (§16-17-3).
    expect(bitingCrush!.placedByEffect).toBe(true);
    expect(bitingCrush!.enterFieldTurnCount).not.toBe(state.turnCount);
    expect(human.trash).toContainEqual(expect.objectContaining({ cardId: "EX5-063" }));
    expect(human.hand).toContainEqual(expect.objectContaining({ cardId: "EX5-058" }));
    expect(human.security).toHaveLength(5);
    expect(state.players[1]!.battleArea).toHaveLength(0);
  });
});
