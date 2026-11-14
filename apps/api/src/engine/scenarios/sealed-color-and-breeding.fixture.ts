import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "sealed-color-and-breeding",
  board: {
    0: {
      hand: [
        { card: "BT1-016", as: "red-champion" },
        { card: "BT1-029", as: "rookie" },
        { card: "BT1-090", as: "red-option" },
      ],
      battleArea: [{ card: "BT1-029", as: "blue-rookie" }],
      deck: Array<string>(8).fill("BT1-009"),
      security: 5,
    },
    1: { deck: Array<string>(8).fill("BT1-009"), security: 5 },
  },
  memory: 3,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
