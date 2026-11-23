import type { ScenarioFixture } from "#api/engine/scenario/types";

const fixture: ScenarioFixture = {
  name: "breeding-played-tamer-starts-main-phase",
  board: {
    0: {
      breeding: { card: "BT25-078", as: "gazimon", under: [{ card: "BT25-005", as: "pagumon" }] },
      hand: [
        { card: "BT25-082", as: "blackGatomon" },
        { card: "BT25-092", as: "asuna" },
        { card: "BT25-100", as: "asunaCost" },
      ],
      deck: [
        { card: "BT1-009", as: "turnDraw" },
        { card: "BT25-085", as: "beelStarmon" },
        { card: "BT1-010", as: "revealedFiller" },
        { card: "BT1-011", as: "otherRevealedFiller" },
        { card: "BT1-012", as: "digivolveDraw" },
        { card: "AD1-001", as: "asunaDraw" },
        ...Array(4).fill("BT1-009"),
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
