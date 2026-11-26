import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "derived-trigger-resolves-before-pending-queue",
  board: {
    0: {
      breeding: { card: "EX6-006", as: "gate" },
      battleArea: [
        { card: "AD1-019", as: "tamer" },
        { card: "ST16-07", as: "deletionMemoryDigimon" },
      ],
      eggDeck: ["EX6-006"],
      deck: Array<string>(12).fill("BT1-009"),
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT3-092", as: "maloMyotismon" }],
      deck: Array<string>(12).fill("BT1-009"),
      security: 3,
    },
  },
  memory: 2,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
