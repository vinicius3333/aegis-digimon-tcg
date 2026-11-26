import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "deletion-watchers-publish-effect-queue",
  board: {
    0: {
      battleArea: [
        { card: "EX1-064", as: "piedmon" },
        { card: "BT3-092", as: "turnMaloMyotismon" },
      ],
      hand: [{ card: "P-001", as: "agumon" }],
      deck: Array<string>(12).fill("BT1-009"),
      security: 3,
    },
    1: {
      battleArea: [
        { card: "BT1-009", as: "monodramon" },
        { card: "BT3-092", as: "otherMaloMyotismon" },
      ],
      deck: Array<string>(12).fill("BT1-009"),
      security: 3,
    },
  },
  memory: 6,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
