import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "link-at-limit-replaces-existing-card-immediately",
  board: {
    0: {
      battleArea: [
        { card: "ST22-03", as: "kyubimon", linked: [{ card: "ST22-09", as: "highSpeedPlugIn" }] },
        { card: "ST1-07", as: "redDigimon" },
      ],
      hand: [{ card: "ST22-08", as: "offensivePlugIn" }],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-009", "BT1-009"],
    },
    1: {
      battleArea: [{ card: "BT1-059", as: "opponentNineThousand" }],
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
