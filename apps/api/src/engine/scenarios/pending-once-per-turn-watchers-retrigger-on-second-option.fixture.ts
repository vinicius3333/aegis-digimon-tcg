import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "pending-once-per-turn-watchers-retrigger-on-second-option",
  board: {
    0: {
      battleArea: [
        { card: "ST22-03", as: "kyubimon", under: ["ST22-01", "EX2-019"] },
        { card: "BT19-034", as: "otherKyubimon", under: ["BT17-031"] },
      ],
      hand: [
        { card: "BT17-035", as: "taomon" },
        { card: "ST22-06", as: "sakuyamon" },
        { card: "ST22-10", as: "firstOption" },
        { card: "ST22-10", as: "secondOption" },
      ],
      deck: Array(10).fill("BT1-009"),
      security: 3,
    },
    1: {
      battleArea: [{ card: "BT1-019", as: "opponentDigimon" }],
      deck: Array(10).fill("BT1-009"),
      security: 3,
    },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
