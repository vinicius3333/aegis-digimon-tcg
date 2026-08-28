import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT1 New Evolution format (from 2021-02-12). */
export const BT1_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt1-red-omnimon",
    revision: 1,
    name: "Red Aggro",
    block: "BT1",
    archetype: "Red Omnimon",
    colors: [CardColor.Red, CardColor.White],
    source:
      "BT1/BT2 opening format: cheap red bodies into Omnimon as a memory-free finisher, with Gaia Force as removal. English organised play barely existed at BT1, so the reference is a Japanese tournament list filtered to the English-legal pool.",
    approximation:
      "The reference list runs 4 Volcanicdramon (BT2-018), which postdates BT1; those slots became WarGreymon (BT1-025), the pool's other Lv.6 red finisher. The BT2 block ships the reference list unchanged.",
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
      { cardId: "BT1-025", count: 4 }, // WarGreymon
      { cardId: "BT1-084", count: 4 }, // Omnimon
      { cardId: "ST1-16", count: 4 }, //  Gaia Force
    ],
    eggDeck: [
      { cardId: "BT1-001", count: 4 }, // Yokomon
      { cardId: "ST1-01", count: 1 }, //  Koromon
    ],
  }),
];
