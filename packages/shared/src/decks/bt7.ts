import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT7 Next Adventure format (from 2022-03-04). */
export const BT7_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt7-blue-hybrid",
    revision: 1,
    name: "Blue Hybrid",
    block: "BT7",
    archetype: "Hybrid (Blue)",
    colors: [CardColor.Blue, CardColor.White, CardColor.Purple],
    source:
      "1st place at two NA Ultimate Cups, 2022-04-24. The defining deck of the BT7 format — 9 of the top 16 at Canada DigiFest 2022 (200 players) were Blue Hybrid.",
    approximation:
      "Hammer Spark (ST2-13) is capped at 1 by the banlist in force (restricted 2024-08-31) where the list ran 4; the freed slots went to Bokomon (BT7-081) and Howling Memory Boost! (BT6-097), both already in the list. Tommy Himi (BT7-086) was restricted during this era but lifted on 2023-11-17, so the era-correct 4 copies are legal today.",
    mainDeck: [
      { cardId: "BT4-023", count: 4 }, // Strabimon
      { cardId: "BT5-021", count: 4 }, // Syakomon
      { cardId: "BT6-021", count: 4 }, // ModokiBetamon
      { cardId: "BT7-081", count: 4 }, // Bokomon
      { cardId: "BT4-027", count: 1 }, // KendoGarurumon
      { cardId: "BT7-021", count: 4 }, // Kumamon
      { cardId: "BT7-023", count: 4 }, // Korikakumon
      { cardId: "BT7-025", count: 4 }, // Beowolfmon
      { cardId: "BT6-029", count: 1 }, // Azulongmon
      { cardId: "BT3-093", count: 4 }, // Davis Motomiya
      { cardId: "BT5-088", count: 4 }, // Sora Takenouchi & Joe Kido
      { cardId: "ST2-12", count: 1 }, //  Matt Ishida
      { cardId: "BT7-086", count: 4 }, // Tommy Himi
      { cardId: "BT3-096", count: 1 }, // Mimi Tachikawa
      { cardId: "ST2-13", count: 1 }, //  Hammer Spark (banlist: 1)
      { cardId: "BT6-097", count: 4 }, // Howling Memory Boost!
      { cardId: "EX1-068", count: 1 }, // Ice Wall! (banlist: 1)
    ],
    eggDeck: [
      { cardId: "BT6-002", count: 4 }, // Kyaromon
      { cardId: "BT1-003", count: 1 }, // Upamon
    ],
  }),
  defineMetaDeck({
    deckId: "bt7-red-jesmon",
    revision: 1,
    name: "Red Jesmon",
    block: "BT7",
    archetype: "Jesmon / Royal Knight",
    colors: [CardColor.Red, CardColor.White],
    source: "1st place, Tamer Battle Australia, 2022-04-24.",
    mainDeck: [
      { cardId: "BT5-008", count: 4 }, // Gaossmon
      { cardId: "BT6-009", count: 4 }, // Huckmon
      { cardId: "BT6-082", count: 3 }, // Sistermon Blanc
      { cardId: "BT6-084", count: 2 }, // Sistermon Ciel
      { cardId: "BT7-009", count: 4 }, // Huckmon
      { cardId: "BT7-082", count: 2 }, // Sistermon Blanc (Awakened)
      { cardId: "ST1-07", count: 4 }, //  Greymon
      { cardId: "BT6-011", count: 4 }, // BaoHuckmon
      { cardId: "BT7-011", count: 3 }, // BurningGreymon
      { cardId: "BT5-015", count: 2 }, // MetalGreymon: Alterous Mode
      { cardId: "BT6-015", count: 4 }, // SaviorHuckmon
      { cardId: "BT6-016", count: 4 }, // Jesmon
      { cardId: "BT5-086", count: 2 }, // Omnimon
      { cardId: "BT1-085", count: 3 }, // Tai Kamiya
      { cardId: "P-035", count: 1 }, //   Red Memory Boost!
      { cardId: "BT6-093", count: 4 }, // Judgement of the Blade
    ],
    eggDeck: [
      { cardId: "BT6-001", count: 3 }, // DemiMeramon
      { cardId: "BT1-001", count: 2 }, // Yokomon
    ],
  }),
];
