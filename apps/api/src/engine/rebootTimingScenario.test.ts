import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";

describe("Reboot timing dev scenario", () => {
  it("starts the human turn with every own Reboot Digimon suspended", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-reboot-timing", state, [BLUE_DECK, RED_DECK]);

    expect(state.turnSeat).toBe(0);
    expect(state.isFirstPlayersFirstTurn).toBe(false);
    expect(
      state.players.map((player) =>
        player.battleArea.map(({ permanentId, isSuspended, topCard }) => ({
          permanentId,
          isSuspended,
          cardId: topCard.cardId,
        })),
      ),
    ).toEqual([
      [
        { permanentId: "reboot-meteormon", isSuspended: true, cardId: "BT4-070" },
        { permanentId: "reboot-blackwargreymon", isSuspended: true, cardId: "BT5-069" },
      ],
      [
        { permanentId: "opponent-garurumon-one", isSuspended: true, cardId: "ST2-06" },
        { permanentId: "opponent-garurumon-two", isSuspended: true, cardId: "ST2-06" },
        { permanentId: "opponent-control", isSuspended: true, cardId: "BT1-024" },
      ],
    ]);
  });
});
