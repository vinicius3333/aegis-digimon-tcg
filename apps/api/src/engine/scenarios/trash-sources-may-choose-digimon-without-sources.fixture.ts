import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "trash-sources-may-choose-digimon-without-sources",
  board: {
    0: {
      hand: [{ card: "EX12-026", as: "shellmon" }],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [
        { card: "EX12-024", as: "stackedDigimon", under: ["BT1-009", "BT1-010", "BT1-011"] },
        { card: "BT1-019", as: "sourcelessDigimon" },
      ],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-009", "BT1-009"],
    },
  },
  memory: 5,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
