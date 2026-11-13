import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "inherited-on-deletion-survives-source-replay",
  board: {
    0: {
      deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      battleArea: [
        {
          card: "BT27-083",
          as: "ravemon",
          under: [
            { card: "BT26-005", as: "pinamon" },
            { card: "BT26-072", as: "peckmon" },
            { card: "BT26-076", as: "crowmon" },
          ],
        },
      ],
      security: 3,
    },
    1: {
      hand: ["BT1-009", "BT1-009", "BT1-009"],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      battleArea: [{ card: "BT1-084", as: "strongerDigimon", suspended: true }],
      security: 3,
    },
  },
  turnSeat: 0,
  turnCount: 4,
  memory: 3,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
