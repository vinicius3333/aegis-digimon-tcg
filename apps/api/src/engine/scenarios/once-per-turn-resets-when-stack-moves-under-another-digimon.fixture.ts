import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "once-per-turn-resets-when-stack-moves-under-another-digimon",
  board: {
    0: {
      battleArea: [
        { card: "EX5-017", as: "attacker", under: [{ card: "EX5-016", as: "keptLunamon" }, "EX6-014", "EX5-017"] },
        { card: "EX5-017", as: "placed", under: [{ card: "EX5-016", as: "movedLunamon" }] },
      ],
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
    1: {
      deck: ["BT1-009", "BT1-009", "BT1-009"],
      security: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
    },
  },
  memory: 0,
  turnSeat: 0,
  turnCount: 5,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
