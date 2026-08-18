import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT3 Union Impact format (from 2021-03-12 in the card-pool table). */
export const BT3_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt3-omnimon-alter-s",
    revision: 1,
    name: "Red Omega",
    block: "BT3",
    archetype: "Red Omnimon Alter-S",
    colors: [CardColor.Red, CardColor.White],
    source:
      "BT3 Union Impact format: the red shell rebuilt around Omnimon Alter-S, the set's new Lv.7 finisher. Reference list is a tournament deck filtered to the English-legal ST1-ST3 / BT1-BT3 pool.",
    mainDeck: [
      { cardId: "BT1-009", count: 4 }, // Monodramon
      { cardId: "ST1-02", count: 3 }, //  Biyomon
      { cardId: "ST1-03", count: 4 }, //  Agumon
      { cardId: "BT2-010", count: 4 }, // Biyomon
      { cardId: "BT1-019", count: 4 }, // DarkTyrannomon
      { cardId: "ST1-06", count: 3 }, //  Coredramon
      { cardId: "BT3-011", count: 4 }, // Greymon
      { cardId: "BT1-020", count: 2 }, // Groundramon
      { cardId: "BT1-021", count: 2 }, // MetalGreymon
      { cardId: "BT1-023", count: 2 }, // SkullGreymon
      { cardId: "BT2-016", count: 4 }, // Lavogaritamon
      { cardId: "ST1-10", count: 3 }, //  Phoenixmon
      { cardId: "BT2-018", count: 1 }, // Volcanicdramon
      { cardId: "BT3-018", count: 3 }, // BlitzGreymon
      { cardId: "BT1-084", count: 3 }, // Omnimon
      { cardId: "BT3-112", count: 3 }, // Omnimon Alter-S
      { cardId: "ST1-16", count: 1 }, //  Gaia Force
    ],
    eggDeck: [
      { cardId: "BT2-001", count: 4 }, // Gigimon
      { cardId: "BT1-001", count: 1 }, // Yokomon
    ],
  }),
];
