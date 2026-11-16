import { buildKeywordDrillFixture } from "#api/tutorial/buildKeywordDrillFixture";

const fixture = buildKeywordDrillFixture({
  name: "overclock-attacker-played-this-turn",
  player: {
    hand: ["ST1-02"],
    security: ["ST1-04"],
    battleArea: [
      { card: "ST19-08", as: "shoeShoemon", enteredThisTurn: true },
      { card: "ST19-03", as: "shoemon" },
    ],
  },
  opponent: { security: ["ST2-04"] },
});

export default fixture;
