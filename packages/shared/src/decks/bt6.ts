import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT6 Double Diamond format (from 2021-10-15 in the card-pool table). */
export const BT6_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt6-red-jesmon",
    revision: 1,
    name: "Red Jesmon",
    block: "BT6",
    archetype: "Jesmon / Royal Knight",
    colors: [CardColor.Red, CardColor.White],
    source:
      "1st place, Europe Evo Cup, 2021-11-21. Red Jesmon was the second most common deck of the BT6 format (15 of 112 recorded entries).",
    approximation:
      "Red Memory Boost! (P-035) postdates this block in the card-pool table, so its 2 slots went to Judgement of the Blade (BT6-093) and Monochromon (BT5-012), both already in the list.",
    mainDeck: [
      { cardId: "BT1-009", count: 2 }, // Monodramon
      { cardId: "BT5-008", count: 1 }, // Gaossmon
      { cardId: "ST7-03", count: 4 }, //  Guilmon
      { cardId: "BT6-009", count: 4 }, // Huckmon
      { cardId: "BT6-082", count: 3 }, // Sistermon Blanc
      { cardId: "BT6-084", count: 3 }, // Sistermon Ciel
      { cardId: "BT5-012", count: 3 }, // Monochromon
      { cardId: "ST1-07", count: 4 }, //  Greymon
      { cardId: "BT6-011", count: 4 }, // BaoHuckmon
      { cardId: "BT2-016", count: 1 }, // Lavogaritamon
      { cardId: "BT5-015", count: 2 }, // MetalGreymon: Alterous Mode
      { cardId: "BT6-015", count: 4 }, // SaviorHuckmon
      { cardId: "BT6-016", count: 4 }, // Jesmon
      { cardId: "BT5-086", count: 2 }, // Omnimon
      { cardId: "BT1-085", count: 3 }, // Tai Kamiya
      { cardId: "BT3-097", count: 2 }, // A Delicate Plan
      { cardId: "BT6-093", count: 4 }, // Judgement of the Blade
    ],
    eggDeck: [
      { cardId: "BT1-001", count: 4 }, // Yokomon
    ],
  }),
  defineMetaDeck({
    deckId: "bt6-blue-bond-of-friendship",
    revision: 1,
    name: "Blue BOF",
    block: "BT6",
    archetype: "Gabumon Bond of Friendship",
    colors: [CardColor.Blue, CardColor.Black],
    source: "1st place, Tamer Battle Spain, 2021-12-04. 14 of 112 recorded BT6-format entries.",
    approximation:
      "Hammer Spark (ST2-13) is capped at 1 by the banlist in force (restricted 2024-08-31) where the list ran 3; the freed slots went to Howling Memory Boost! (BT6-097) and Absolute Blast (BT5-097), both already in the list.",
    mainDeck: [
      { cardId: "BT1-028", count: 2 }, // Elecmon
      { cardId: "BT1-029", count: 4 }, // Gabumon
      { cardId: "BT4-023", count: 4 }, // Strabimon
      { cardId: "BT6-019", count: 4 }, // Gabumon
      { cardId: "P-042", count: 2 }, //   Gabumon (promo)
      { cardId: "BT4-025", count: 4 }, // Lobomon
      { cardId: "BT4-027", count: 2 }, // KendoGarurumon
      { cardId: "ST8-06", count: 4 }, //  Coredramon
      { cardId: "BT5-062", count: 2 }, // Mekanorimon
      { cardId: "BT6-030", count: 4 }, // Gabumon - Bond of Friendship
      { cardId: "BT3-093", count: 2 }, // Davis Motomiya
      { cardId: "ST2-12", count: 1 }, //  Matt Ishida
      { cardId: "BT6-088", count: 4 }, // Matt Ishida
      { cardId: "BT5-097", count: 3 }, // Absolute Blast
      { cardId: "ST2-13", count: 1 }, //  Hammer Spark (banlist: 1)
      { cardId: "ST2-16", count: 1 }, //  Cocytus Breath
      { cardId: "BT6-097", count: 4 }, // Howling Memory Boost!
      { cardId: "BT6-098", count: 2 }, // Raddle Star
    ],
    eggDeck: [
      { cardId: "BT1-003", count: 4 }, // Upamon
    ],
  }),
];
