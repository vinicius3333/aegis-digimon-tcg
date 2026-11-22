import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "arts-digivolve-rightmost-base",
  board: {
    0: {
      battleArea: [
        { card: "ST1-03", as: "first-filler" },
        { card: "ST1-03", as: "second-filler" },
        { card: "ST1-03", as: "third-filler" },
        { card: "ST1-03", as: "fourth-filler" },
        { card: "BT27-080", as: "arts-base" },
      ],
      hand: [{ card: "BT27-082", as: "nosferamon" }],
      deck: Array<string>(12).fill("ST1-03"),
      security: 3,
    },
    1: { deck: Array<string>(12).fill("ST1-03"), security: 3 },
  },
  memory: 10,
  turnSeat: 0,
  turnCount: 4,
  isFirstPlayersFirstTurn: false,
};

export default fixture;
