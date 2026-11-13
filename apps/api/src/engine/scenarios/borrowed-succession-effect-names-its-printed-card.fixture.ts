import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "borrowed-succession-effect-names-its-printed-card",
  memory: 3,
  turnSeat: 0,
  turnCount: 3,
  isFirstPlayersFirstTurn: false,
  presentation: { holdBotAfterTurn: 7, opponent: { endBreeding: true, fallbackMain: "end" } },
  board: {
    0: {
      battleArea: [
        { card: "BT24-102", as: "homeros" },
        { card: "BT26-103", as: "wrathMode", under: [{ card: "BT24-101", as: "jupitermon" }] },
      ],
      security: 5,
      deck: Array(16).fill("BT1-009"),
    },
    1: {
      battleArea: [{ card: "BT1-080", as: "weakened", dp: 13000 }],
      security: 5,
      deck: Array(16).fill("BT1-009"),
    },
  },
};

export default fixture;
