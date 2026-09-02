import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored fix:
// (1) PlayWithoutCost: added from:["underMyTamers"] — text says "from under your Tamers".
//     underMyTamers zone is defined in CAPABILITIES-BACKLOG.md CAP-A7.
// (2) digivolutionRequirement already has both entries (Psychemon cost 5 + Lv4/Save cost 3).
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
      names: ["Psychemon"],
      cost: 5,
      isAlternate: true,
    },
    {
      level: 4,
      texts: ["Save"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

export { compiled };

registerIrCard("EX10-018", compiled);
