import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "start-of-main-played-tamer-misses-main-phase",
  board: {
    0: {
      battleArea: [{ card: "EX7-051", as: "sparrowmon", under: [{ card: "BT25-005", as: "pagumon" }] }],
      hand: [
        { card: "EX7-071", as: "musketeersOption" },
        { card: "BT25-082", as: "blackGatomon" },
        { card: "BT25-092", as: "asuna" },
        { card: "BT25-100", as: "asunaCost" },
      ],
      deck: [
        { card: "BT1-009", as: "turnDraw" },
        { card: "BT1-010", as: "sparrowmonDraw" },
        { card: "BT1-012", as: "digivolveDraw" },
        { card: "AD1-001", as: "asunaDraw" },
        ...Array(5).fill("BT1-009"),
      ],
      security: 3,
    },
    1: { deck: Array(8).fill("BT1-009"), security: 3 },
  },
  memory: 0,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
