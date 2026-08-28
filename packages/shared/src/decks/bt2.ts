import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT2 Ultimate Power format (from 2021-03-12). */
export const BT2_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt2-red-omnimon",
    revision: 1,
    name: "Red Aggro",
    block: "BT2",
    archetype: "Red Omnimon",
    colors: [CardColor.Red, CardColor.White],
    source:
      "BT1/BT2 format: the reference list as published — cheap red bodies into Omnimon, with Volcanicdramon added once BT2 was legal. English organised play barely existed then, so the reference is a Japanese tournament list filtered to the English-legal pool.",
    mainDeck: [
      { cardId: "BT1-009", count: 4 }, // Monodramon
      { cardId: "ST1-02", count: 4 }, //  Biyomon
      { cardId: "ST1-03", count: 4 }, //  Agumon
      { cardId: "P-009", count: 2 }, //   Agumon (promo)
      { cardId: "BT1-019", count: 4 }, // DarkTyrannomon
      { cardId: "ST1-06", count: 4 }, //  Coredramon
      { cardId: "ST1-07", count: 4 }, //  Greymon
      { cardId: "BT1-020", count: 4 }, // Groundramon
      { cardId: "BT1-021", count: 2 }, // MetalGreymon
      { cardId: "BT1-023", count: 2 }, // SkullGreymon
      { cardId: "ST1-10", count: 4 }, //  Phoenixmon
      { cardId: "BT2-018", count: 4 }, // Volcanicdramon
      { cardId: "BT1-084", count: 4 }, // Omnimon
      { cardId: "ST1-16", count: 4 }, //  Gaia Force
    ],
    eggDeck: [
      { cardId: "BT1-001", count: 4 }, // Yokomon
      { cardId: "ST1-01", count: 1 }, //  Koromon
    ],
  }),
];
