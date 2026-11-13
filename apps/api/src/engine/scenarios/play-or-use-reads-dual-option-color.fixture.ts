import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "play-or-use-reads-dual-option-color",
  board: {
    0: {
      battleArea: [{ card: "EX13-012", as: "saviorHuckmon" }],
      hand: [{ card: "BT27-068", as: "gankoomonDual" }],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [{ card: "BT1-019", as: "opponentDigimon" }],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-009", "BT1-009"],
    },
  },
  memory: 4,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
