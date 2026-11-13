import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "security-play-on-play-before-next-check",
  turnSeat: 0,
  turnCount: 4,
  memory: 10,
  isFirstPlayersFirstTurn: false,
  presentation: { timed: false },
  board: {
    0: {
      hand: [{ card: "BT24-037", as: "director" }],
      battleArea: [{ card: "EX13-045", as: "attacker" }],
    },
    1: {
      hand: [
        { card: "BT20-083", as: "omekamon" },
        { card: "BT20-102", as: "omnimon" },
      ],
      security: [{ card: "BT20-100", as: "guardian" }, "ST1-02", "ST1-02"],
    },
  },
};

export default fixture;
