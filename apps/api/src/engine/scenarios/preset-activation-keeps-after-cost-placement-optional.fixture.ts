import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  memory: 3,
  turnSeat: 0,
  turnCount: 2,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        { card: "BT27-089", as: "firstThomas" },
        { card: "BT27-089", as: "secondThomas" },
        { card: "BT27-024", as: "gaogamon", under: [{ card: "BT27-019", as: "inheritedGaomon" }] },
      ],
      deck: [
        { card: "BT1-010", as: "turnDraw" },
        { card: "BT1-011", as: "attackDraw" },
        { card: "BT1-012", as: "deckTop" },
        { card: "BT1-013", as: "deckSecond" },
        "BT1-014",
      ],
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: { deck: Array<string>(8).fill("BT1-010"), eggDeck: ["BT1-001"], security: 3 },
  },
};

export default fixture;
