import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type MetaDeck } from "./types.js";

/** BT9 X Record format (from 2022-07-29). */
export const BT9_DECKS: readonly MetaDeck[] = [
  defineMetaDeck({
    deckId: "bt9-wargreymon-x",
    revision: 1,
    name: "WarGreymon X Antibody",
    block: "BT9",
    archetype: "X Antibody (Red)",
    colors: [CardColor.Red, CardColor.White, CardColor.Yellow],
    source:
      "BT9 X Record format: the set's headline X Antibody line, Agumon X into Greymon X into MetalGreymon X into WarGreymon X, with the X Antibody Option and Tai & Kari.",
    approximation:
      "Base-name Agumon/Greymon/MetalGreymon/WarGreymon copies are the printed-evolution bodies the X line digivolves from for 0; era lists varied which printings they used, and these are the ones in the pool at BT9.",
    mainDeck: [
      { cardId: "EX1-001", count: 4 }, // Agumon                 Lv.3, attack-trigger search
      { cardId: "BT4-008", count: 4 }, // Agumon                 Lv.3, second [Agumon] body
      { cardId: "BT9-008", count: 4 }, // Agumon (X Antibody)    Lv.3, digs for Greymon + X Antibody
      { cardId: "BT1-015", count: 4 }, // Greymon                Lv.4, +2000 DP inherited
      { cardId: "BT9-012", count: 4 }, // Greymon (X Antibody)   Lv.4, deletion protection inherited
      { cardId: "BT1-021", count: 4 }, // MetalGreymon           Lv.5, memory swing when attacking
      { cardId: "BT9-015", count: 4 }, // MetalGreymon (X)       Lv.5, Security Attack +1 on digivolve
      { cardId: "BT1-025", count: 2 }, // WarGreymon             Lv.6, the [WarGreymon] base
      { cardId: "BT9-016", count: 4 }, // WarGreymon (X)         Lv.6, memory on security loss + removal
      { cardId: "BT9-109", count: 4 }, // X Antibody             Option, turns a base body into the X line
      { cardId: "BT9-084", count: 4 }, // Tai Kamiya & Kari      Tamer, memory on low security
      { cardId: "BT9-095", count: 4 }, // Gaia Force ZERO        Option, 13000-DP removal, cheaper with X
      { cardId: "BT9-094", count: 4 }, // Atomic Megalo Blaster  Option, split 10000 DP of removal
    ],
    eggDeck: [
      { cardId: "BT9-001", count: 4 }, // Koromon  +1000 DP under Agumon/Greymon
      { cardId: "BT1-001", count: 1 }, // Yokomon
    ],
  }),
];
