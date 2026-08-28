import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT8 New Awakening format (from 2022-05-13 in the card-pool table). */
export const BT8_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt8-mastemon",
    revision: 1,
    name: "Mastemon",
    block: "BT8",
    archetype: "Mastemon (Yellow/Purple)",
    colors: [CardColor.Purple, CardColor.Yellow, CardColor.White],
    source: "1st place, NA Regional @ Top Cut, 2022-06-04, the anchor event of the BT8 format.",
    mainDeck: [
      { cardId: "BT3-077", count: 2 }, // Gazimon
      { cardId: "ST10-02", count: 2 }, // Salamon
      { cardId: "BT8-035", count: 2 }, // Candlemon
      { cardId: "BT8-071", count: 2 }, // Psychemon
      { cardId: "ST10-04", count: 4 }, // Gatomon
      { cardId: "BT8-077", count: 2 }, // BlackGatomon
      { cardId: "BT3-088", count: 3 }, // LadyDevimon
      { cardId: "BT7-111", count: 2 }, // Lucemon: Chaos Mode
      { cardId: "ST10-05", count: 2 }, // Angewomon
      { cardId: "BT1-060", count: 3 }, // MagnaAngemon
      { cardId: "ST10-12", count: 1 }, // LadyDevimon
      { cardId: "BT8-084", count: 1 }, // Kimeramon
      { cardId: "ST10-06", count: 4 }, // Mastemon
      { cardId: "BT8-082", count: 2 }, // Ophanimon Falldown Mode
      { cardId: "BT8-111", count: 1 }, // Creepymon
      { cardId: "BT5-112", count: 2 }, // Omnimon Zwart Defeat
      { cardId: "BT8-090", count: 3 }, // Kari Kamiya
      { cardId: "P-040", count: 3 }, //   Purple Memory Boost!
      { cardId: "BT7-107", count: 1 }, // Calling From the Darkness
      { cardId: "ST10-14", count: 3 }, // Chaos Degradation
      { cardId: "BT8-109", count: 4 }, // Flame Hellscythe
      { cardId: "BT6-100", count: 1 }, // Reinforcing Memory Boost!
    ],
    eggDeck: [
      { cardId: "ST10-01", count: 4 }, // Nyaromon
      { cardId: "BT3-006", count: 1 }, // DemiMeramon
    ],
  }),
  defineMetaDeck({
    deckId: "bt8-blackwargreymon",
    revision: 1,
    name: "BlackWarGreymon",
    block: "BT8",
    archetype: "BlackWarGreymon (Red/Black)",
    colors: [CardColor.Red, CardColor.Black, CardColor.White],
    source: "2nd place, NA Regional @ Top Cut, 2022-06-04.",
    mainDeck: [
      { cardId: "BT5-007", count: 4 }, // Agumon
      { cardId: "P-001", count: 2 }, //   Agumon
      { cardId: "P-009", count: 4 }, //   Agumon
      { cardId: "ST1-03", count: 2 }, //  Agumon
      { cardId: "BT8-058", count: 2 }, // Agumon (Black)
      { cardId: "BT5-010", count: 3 }, // Greymon
      { cardId: "ST1-07", count: 2 }, //  Greymon
      { cardId: "ST7-06", count: 3 }, //  GeoGreymon
      { cardId: "BT8-064", count: 4 }, // Greymon (Black)
      { cardId: "EX1-008", count: 1 }, // MetalGreymon
      { cardId: "BT8-067", count: 4 }, // MetalGreymon (Black)
      { cardId: "BT8-084", count: 2 }, // Kimeramon
      { cardId: "BT1-025", count: 2 }, // WarGreymon
      { cardId: "EX1-009", count: 1 }, // WarGreymon
      { cardId: "BT8-070", count: 4 }, // BlackWarGreymon
      { cardId: "BT5-086", count: 2 }, // Omnimon
      { cardId: "BT1-085", count: 1 }, // Tai Kamiya
      { cardId: "BT5-092", count: 4 }, // Nokia Shiramine
      { cardId: "BT8-086", count: 1 }, // Hiro Amanokawa
      { cardId: "P-035", count: 1 }, //   Red Memory Boost!
      { cardId: "BT5-105", count: 1 }, // Ultimate Flare
    ],
    eggDeck: [
      { cardId: "BT5-001", count: 4 }, // Koromon
      { cardId: "BT8-001", count: 1 }, // Gurimon
    ],
  }),
];
