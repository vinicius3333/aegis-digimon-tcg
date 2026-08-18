import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** EX1 Classic Collection format (from 2021-12-10). */
export const EX1_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "ex1-blue-hybrid",
    revision: 1,
    name: "Blue Hybrid",
    block: "EX1",
    archetype: "Gabumon Bond of Friendship",
    colors: [CardColor.Blue],
    source:
      "1st place, North America Final Championship 2021, 2022-02-06 (1000+ players). Blue Hybrid also took the EU and Oceania Final Championships.",
    approximation:
      "Two cards the list ran at 4 are capped at 1 today: Hammer Spark (ST2-13, restricted 2024-08-31) and Ice Wall! (EX1-068, restricted 2022-02-25). The six freed slots went to Forbidden Trident (BT6-096), Howling Memory Boost! (BT6-097) and Octomon (BT6-023) — all already in the list.",
    mainDeck: [
      { cardId: "BT1-029", count: 4 }, // Gabumon
      { cardId: "BT6-019", count: 4 }, // Gabumon
      { cardId: "BT6-021", count: 4 }, // ModokiBetamon
      { cardId: "EX1-011", count: 4 }, // Gabumon
      { cardId: "BT4-025", count: 4 }, // Lobomon
      { cardId: "BT4-027", count: 2 }, // KendoGarurumon
      { cardId: "BT6-023", count: 4 }, // Octomon
      { cardId: "EX1-016", count: 1 }, // Ikkakumon
      { cardId: "BT6-030", count: 4 }, // Gabumon - Bond of Friendship
      { cardId: "BT3-093", count: 3 }, // Davis Motomiya
      { cardId: "BT5-088", count: 1 }, // Sora Takenouchi & Joe Kido
      { cardId: "BT6-088", count: 4 }, // Matt Ishida
      { cardId: "ST2-13", count: 1 }, //  Hammer Spark (banlist: 1)
      { cardId: "ST2-16", count: 1 }, //  Cocytus Breath
      { cardId: "BT6-096", count: 4 }, // Forbidden Trident
      { cardId: "BT6-097", count: 4 }, // Howling Memory Boost!
      { cardId: "EX1-068", count: 1 }, // Ice Wall! (banlist: 1)
    ],
    eggDeck: [
      { cardId: "BT1-003", count: 4 }, // Upamon
      { cardId: "BT6-002", count: 1 }, // Kyaromon
    ],
  }),
  defineMetaDeck({
    deckId: "ex1-lilith-loop",
    revision: 1,
    name: "Lilith Loop",
    block: "EX1",
    archetype: "Purple Lilithmon",
    colors: [CardColor.Purple, CardColor.White],
    source:
      "1st place, LATAM Final Championship 2021, 2022-01-30 (600+ players); the deck also took 3rd/4th at the NA and Oceania championships.",
    approximation:
      "Jack Raid (BT4-111) is capped at 1 (restricted 2025-03-28) where the list ran 4, and Mega Digimon Fusion! (BT5-109) is banned (2022-02-25) where it ran 2. The five freed slots went to Impmon (BT6-068), DemiDevimon (BT2-067) and Underworld's Call (BT6-108) — all already in the list.",
    mainDeck: [
      { cardId: "BT2-067", count: 2 }, // DemiDevimon
      { cardId: "BT3-076", count: 1 }, // Candlemon
      { cardId: "BT3-077", count: 4 }, // Gazimon
      { cardId: "BT4-079", count: 1 }, // Labramon
      { cardId: "ST6-03", count: 4 }, //  Gabumon
      { cardId: "BT6-068", count: 4 }, // Impmon
      { cardId: "BT6-071", count: 2 }, // Kinkakumon
      { cardId: "BT6-073", count: 4 }, // Ginkakumon
      { cardId: "BT6-075", count: 4 }, // Ginkakumon Promote
      { cardId: "BT3-088", count: 4 }, // LadyDevimon
      { cardId: "BT6-077", count: 3 }, // Rebellimon
      { cardId: "BT3-091", count: 4 }, // Lilithmon
      { cardId: "BT5-087", count: 3 }, // Omnimon Zwart
      { cardId: "BT5-091", count: 2 }, // Takumi Aiba
      { cardId: "EX1-066", count: 3 }, // Analog Youth
      { cardId: "BT4-111", count: 1 }, // Jack Raid (banlist: 1)
      { cardId: "P-040", count: 2 }, //   Purple Memory Boost!
      { cardId: "BT6-108", count: 2 }, // Underworld's Call
    ],
    eggDeck: [
      { cardId: "BT6-006", count: 4 }, // Tsunomon
      { cardId: "BT3-006", count: 1 }, // DemiMeramon
    ],
  }),
];
