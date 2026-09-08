import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored fix:
// (1) PlayWithoutCost: added from:["underMyTamers"] — text says "from under your Tamers".
//     underMyTamers zone is defined in CAPABILITIES-BACKLOG.md CAP-A7.
// (2) digivolutionRequirement has both entries (Psychemon cost 5 + Lv4/Save cost 3).
// (3) The played card is gated by `keywords: ["Save"]`, which matches a declared ＜Save＞ or the
//     printed ＜Save＞/<Save> token in effect or inherited text. That is the precise reading of
//     KB Q5050 for this clause: no play-cost-4-or-lower card in the catalog carries ＜Save＞ only
//     in security, link, dual or option text, so the keyword gate and the Q5050 text union pick
//     the same cards, and the keyword gate additionally rejects the ＜Material Save＞/[Savemon]/
//     [Deep Savers] substrings.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 4,
              keywords: ["Save"],
            },
            count: 1,
          },
          from: ["underMyTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 4,
              keywords: ["Save"],
            },
            count: 1,
          },
          from: ["underMyTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      // "[Digivolve] [Psychemon]" is a bracketed name, so the gate is exact equality,
      // not the "[X] in name" substring gate.
      namesExact: ["Psychemon"],
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      // KB Q5050: "＜Save＞ in text" spans name, traits, effects, inherited effects and the
      // requirement headers, which is what the `texts` union matches. The token keeps its
      // keyword delimiters because a bare "Save" also matches ＜Material Save N＞ (BT10-111,
      // BT11-012), [Savemon] (BT21-059) and [Deep Savers] (EX8-068), none of which is ＜Save＞.
      // Both delimiter spellings are listed: the catalog prints ASCII "<Save>" on EX4-016.
      texts: ["＜Save＞", "<Save>"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

export { compiled };

registerIrCard("EX10-018", compiled);
