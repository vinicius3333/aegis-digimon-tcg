import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { setupEngine } from "./testkit/harness.js";

describe("Mervamon effect-played Assembly dev scenario", () => {
  it("stages Mervamon in hand and Dark plus its Assembly material in trash", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-mervamon-effect-assembly", s.state, [BLUE_DECK, RED_DECK]);

    expect(s.state.memory).toBe(13);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-081");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-073", "BT26-069"]),
    );
  });
});
