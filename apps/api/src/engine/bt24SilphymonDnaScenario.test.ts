import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { setupEngine } from "./testkit/harness.js";

describe("BT24 Silphymon DNA dev scenario", () => {
  it("offers DNA from yellow Gatomon and green/blue Garurumon", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-bt24-silphymon-dna", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    const human = s.state.players[0]!;
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(3);
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT24-035", "BT24-046"]);

    const silphymon = human.hand.find(({ cardId }) => cardId === "BT24-037");
    expect(silphymon?.dnaDigivolveRoutes).toHaveLength(1);
    expect(silphymon?.dnaDigivolveRoutes[0]?.projectedCost).toBe(0);
  });
});
