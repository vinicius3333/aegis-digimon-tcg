import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "dp-change-names-its-target",
  memory: 3,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT1-020", as: "attacker", enterFieldTurnCount: -1 }],
      deck: Array.from({ length: 16 }, () => "BT1-009"),
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      deck: Array.from({ length: 16 }, () => "BT1-009"),
      security: ["ST22-10", "ST22-10", "ST22-10"],
    },
  },
};

export default fixture;
