import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT5 Battle of Omni format (from 2021-08-06). */
export const BT5_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt5-lordknightmon",
    revision: 1,
    name: "Yellow LordKnightmon",
    block: "BT5",
    archetype: "Yellow LordKnightmon",
    colors: [CardColor.Yellow, CardColor.Purple, CardColor.White],
    source:
      "1st place, Online Regional (Carta Magica), 2021-10-24. The dominant deck of the English BT5 format — roughly 42 of the era's top-8 entries.",
    approximation:
      "Blinding Ray (BT4-104) is capped at 1 by the banlist in force (restricted 2025-03-28) where the list ran 2; the freed slot went to Angewomon (BT3-039), already in the list.",
    mainDeck: [
      { cardId: "BT4-038", count: 3 }, // BushiAgumon
      { cardId: "BT4-115", count: 1 }, // Lucemon
      { cardId: "BT5-034", count: 2 }, // Kotemon
      { cardId: "BT5-035", count: 4 }, // Starmons
      { cardId: "P-028", count: 4 }, //   Pulsemon
      { cardId: "BT3-037", count: 3 }, // Turuiemon
      { cardId: "BT4-042", count: 4 }, // Piddomon
      { cardId: "P-031", count: 1 }, //   Gatomon
      { cardId: "ST3-07", count: 3 }, //  Unimon
      { cardId: "BT3-039", count: 3 }, // Angewomon
      { cardId: "BT4-046", count: 3 }, // WarGrowlmon
      { cardId: "BT5-042", count: 4 }, // Knightmon
      { cardId: "BT1-062", count: 1 }, // SlashAngemon
      { cardId: "BT3-090", count: 2 }, // Mastemon
      { cardId: "BT5-045", count: 4 }, // LordKnightmon
      { cardId: "BT4-091", count: 2 }, // Chaosmon: Valdur Arm
      { cardId: "BT5-112", count: 2 }, // Omnimon Zwart Defeat
      { cardId: "BT1-087", count: 3 }, // T.K. Takaishi
      { cardId: "BT4-104", count: 1 }, // Blinding Ray (banlist: 1)
    ],
    eggDeck: [
      { cardId: "BT5-003", count: 4 }, // Pickmon
      { cardId: "BT4-003", count: 1 }, // Koromon
    ],
  }),
  defineMetaDeck({
    deckId: "bt5-shoutmon-dx",
    revision: 1,
    name: "Red Shoutmon DX",
    block: "BT5",
    archetype: "Red Shoutmon DX",
    colors: [CardColor.Red, CardColor.White],
    source: "1st place, Evo Cup Oceania, 2021-09-25. The red aggro deck of the BT5 format.",
    approximation:
      "Mega Digimon Fusion! (BT5-109) is banned under the banlist in force (2022-02-25) where the list ran 2; the freed slots went to A Delicate Plan (BT3-097), already in the list.",
    mainDeck: [
      { cardId: "BT1-009", count: 2 }, // Monodramon
      { cardId: "BT5-007", count: 4 }, // Agumon
      { cardId: "BT5-009", count: 3 }, // Shoutmon
      { cardId: "ST1-03", count: 4 }, //  Agumon
      { cardId: "BT1-015", count: 2 }, // Greymon
      { cardId: "BT5-010", count: 3 }, // Greymon
      { cardId: "BT5-012", count: 3 }, // Monochromon
      { cardId: "ST1-07", count: 2 }, //  Greymon
      { cardId: "BT1-020", count: 2 }, // Groundramon
      { cardId: "BT4-015", count: 3 }, // Volcdramon
      { cardId: "BT5-014", count: 3 }, // OmniShoutmon
      { cardId: "BT5-017", count: 4 }, // ZeigGreymon
      { cardId: "BT5-019", count: 4 }, // Shoutmon DX
      { cardId: "BT1-084", count: 3 }, // Omnimon
      { cardId: "BT5-091", count: 3 }, // Takumi Aiba
      { cardId: "BT5-093", count: 1 }, // Tai Kamiya & Matt Ishida
      { cardId: "BT3-097", count: 4 }, // A Delicate Plan
    ],
    eggDeck: [
      { cardId: "ST1-01", count: 4 }, //  Koromon
      { cardId: "BT2-001", count: 1 }, // Gigimon
    ],
  }),
];
