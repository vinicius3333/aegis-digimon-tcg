import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  name: "breeding-target-stays-clickable",
  board: {
    0: {
      deck: Array<string>(10).fill("ST1-03"),
      eggDeck: ["BT1-001", "BT1-001"],
      security: 5,
      hand: [
        { card: "EX11-067", as: "dokusonAruba" },
        { card: "EX10-013", as: "lucemonInHand" },
      ],
      breeding: { card: "EX10-004", as: "breedingCupimon", placedByEffect: false },
    },
    1: {
      deck: Array<string>(10).fill("ST1-03"),
      eggDeck: ["BT1-001", "BT1-001"],
      security: 5,
      battleArea: [{ card: "ST1-03", as: "opponentDigimon", placedByEffect: false }],
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
