import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "self-deletion-cost-offers-inherited-on-deletion",
  board: {
    0: {
      hand: [{ card: "BT26-078", as: "cherubimon" }],
      deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      trash: [{ card: "BT25-078", as: "gazimon" }],
      battleArea: [{ card: "BT25-083", as: "ladyDevimon" }],
      security: 3,
    },
    1: {
      hand: ["BT1-009", "BT1-009", "BT1-009"],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: 3,
    },
  },
  turnSeat: 0,
  turnCount: 4,
  memory: 6,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
