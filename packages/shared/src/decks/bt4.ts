import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT4 Great Legend format (from 2021-06-11). */
export const BT4_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt4-security-control",
    revision: 1,
    name: "Security Control",
    block: "BT4",
    archetype: "Security Control (Yellow/Red)",
    colors: [CardColor.Yellow, CardColor.Red, CardColor.White],
    source:
      "1st place, EU Online Premier TO, 2021-06-26 (135 players, 7-0). Tier-1 of the BT4 format alongside Green Nidhoggmon and Yellow WarGreymon.",
    mainDeck: [
      { cardId: "BT2-034", count: 4 }, // Salamon
      { cardId: "BT4-115", count: 2 }, // Lucemon
      { cardId: "P-005", count: 4 }, //   Patamon
      { cardId: "BT1-060", count: 4 }, // MagnaAngemon
      { cardId: "BT1-061", count: 3 }, // Mistymon
      { cardId: "BT1-062", count: 1 }, // SlashAngemon
      { cardId: "BT2-039", count: 4 }, // Magnadramon
      { cardId: "BT3-043", count: 2 }, // Kentaurosmon
      { cardId: "ST3-10", count: 2 }, //  Magnadramon
      { cardId: "BT4-091", count: 3 }, // Chaosmon: Valdur Arm
      { cardId: "ST1-12", count: 3 }, //  Tai Kamiya
      { cardId: "BT1-087", count: 3 }, // T.K. Takaishi
      { cardId: "ST1-16", count: 4 }, //  Gaia Force
      { cardId: "BT1-102", count: 2 }, // Blade of the True
      { cardId: "BT2-098", count: 4 }, // EDEN's Javelin
      { cardId: "BT2-099", count: 1 }, // Glorious Burst
      { cardId: "ST3-16", count: 4 }, //  Seven Heavens
    ],
    eggDeck: [
      { cardId: "BT1-005", count: 4 }, // Kyaromon
      { cardId: "BT3-003", count: 1 }, // Upamon
    ],
  }),
  defineMetaDeck({
    deckId: "bt4-yellow-wargreymon",
    revision: 1,
    name: "Yellow WarGreymon",
    block: "BT4",
    archetype: "Yellow WarGreymon",
    colors: [CardColor.Yellow, CardColor.White],
    source:
      "2nd place, EU Online Premier TO, 2021-06-26. WarGrowlmon into WarGreymon into Chaosmon: Valdur Arm — one of the two tier-0 decks of the BT4 format.",
    approximation:
      "Blinding Ray (BT4-104) is capped at 1 by the banlist in force (restricted 2025-03-28) where the list ran 3; the freed slots went to Reppamon (BT1-051), already in the list.",
    mainDeck: [
      { cardId: "BT2-034", count: 2 }, // Salamon
      { cardId: "BT4-038", count: 3 }, // BushiAgumon
      { cardId: "P-005", count: 2 }, //   Patamon
      { cardId: "P-028", count: 3 }, //   Pulsemon
      { cardId: "ST3-04", count: 4 }, //  Patamon
      { cardId: "BT1-051", count: 4 }, // Reppamon
      { cardId: "BT3-037", count: 4 }, // Turuiemon
      { cardId: "BT4-042", count: 4 }, // Piddomon
      { cardId: "ST3-07", count: 1 }, //  Unimon
      { cardId: "BT3-039", count: 4 }, // Angewomon
      { cardId: "BT4-046", count: 4 }, // WarGrowlmon
      { cardId: "ST3-09", count: 1 }, //  Angewomon
      { cardId: "BT1-062", count: 4 }, // SlashAngemon
      { cardId: "BT4-048", count: 3 }, // WarGreymon
      { cardId: "BT4-091", count: 3 }, // Chaosmon: Valdur Arm
      { cardId: "BT1-087", count: 3 }, // T.K. Takaishi
      { cardId: "BT4-104", count: 1 }, // Blinding Ray (banlist: 1)
    ],
    eggDeck: [
      { cardId: "BT3-003", count: 4 }, // Upamon
      { cardId: "BT4-003", count: 1 }, // Koromon
    ],
  }),
];
