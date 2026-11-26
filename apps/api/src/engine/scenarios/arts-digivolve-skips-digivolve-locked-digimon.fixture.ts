import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "arts-digivolve-skips-digivolve-locked-digimon",
  turnSeat: 0,
  turnCount: 3,
  memory: 10,
  isFirstPlayersFirstTurn: false,
  presentation: { timed: false },
  board: {
    0: {
      battleArea: [
        { card: "BT9-092", as: "whiteTamer" },
        { card: "BT6-084", as: "lockedNoir" },
        { card: "BT6-084", as: "freeNoir" },
      ],
      hand: [{ card: "EX13-066", as: "mickey" }],
      deck: ["BT1-010", "BT1-011"],
    },
    1: { hand: ["BT1-009"], security: ["BT1-009"] },
  },
};

export default fixture;
