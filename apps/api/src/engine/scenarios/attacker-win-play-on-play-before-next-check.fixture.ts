import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "attacker-win-play-on-play-before-next-check",
  turnSeat: 0,
  turnCount: 4,
  memory: 10,
  isFirstPlayersFirstTurn: false,
  presentation: { timed: false },
  board: {
    0: {
      hand: [
        { card: "BT24-037", as: "director" },
        { card: "EX13-044", as: "breakdramon" },
      ],
      battleArea: [{ card: "EX13-045", as: "attacker" }],
    },
    1: {
      security: ["ST1-02", { card: "AD1-022", as: "security-tamer" }, "ST1-02"],
    },
  },
};

export default fixture;
