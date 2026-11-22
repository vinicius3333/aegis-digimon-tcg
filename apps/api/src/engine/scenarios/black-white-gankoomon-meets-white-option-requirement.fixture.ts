import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "black-white-gankoomon-meets-white-option-requirement",
  board: {
    0: {
      battleArea: [{ card: "BT27-068", as: "gankoomonX" }],
      breeding: { card: "BT23-006", as: "breedingHuckmon" },
      hand: [{ card: "EX13-066", as: "sistermonNoir" }],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [{ card: "BT1-019", as: "opponentDigimon" }],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-009", "BT1-009"],
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
