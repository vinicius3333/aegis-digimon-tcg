import type { ScenarioFixture } from "../scenario/types.js";

const fixture: ScenarioFixture = {
  memory: 5,
  turnSeat: 0,
  turnCount: 0,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [
        { card: "ST22-04", as: "taomon" },
        { card: "BT19-083", as: "tamer" },
      ],
      hand: [{ card: "BT19-040", as: "sakuyamon" }],
      deck: [
        { card: "BT1-010", as: "turnDraw" },
        { card: "BT1-011", as: "digivolutionDraw" },
        { card: "ST22-09", as: "drawnBluePlugIn" },
        { card: "BT1-012", as: "secondEffectDraw" },
        "BT1-014",
        "BT1-015",
        "BT1-016",
      ],
      eggDeck: ["BT1-001"],
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT1-010", as: "opponentDigimon" }],
      deck: Array<string>(8).fill("BT1-010"),
      eggDeck: ["BT1-001"],
      security: 3,
    },
  },
};

export default fixture;
