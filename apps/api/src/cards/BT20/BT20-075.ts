import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Trash 2 cards in your hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 2,
          },
        },
        {
          effectTextPart: "Then, for the turn, 1 of your Digimon gains ＜Raid＞ and ＜Piercing＞ and gets +4000 DP.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "loudmonTarget",
          },
          amount: 4000,
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, for the turn, 1 of your Digimon gains ＜Raid＞ and ＜Piercing＞ and gets +4000 DP.",
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "loudmonTarget",
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, for the turn, 1 of your Digimon gains ＜Raid＞ and ＜Piercing＞ and gets +4000 DP.",
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "loudmonTarget",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Trash 2 cards in your hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 2,
          },
        },
        {
          effectTextPart: "Then, for the turn, 1 of your Digimon gains ＜Raid＞ and ＜Piercing＞ and gets +4000 DP.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "loudmonTarget",
          },
          amount: 4000,
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, for the turn, 1 of your Digimon gains ＜Raid＞ and ＜Piercing＞ and gets +4000 DP.",
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "loudmonTarget",
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, for the turn, 1 of your Digimon gains ＜Raid＞ and ＜Piercing＞ and gets +4000 DP.",
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "loudmonTarget",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Dragon", "Evil Dragon"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          },
          while: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 4,
            raw: "you have 4 or fewer cards in your hand",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Dark Dragon", "Evil Dragon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-075", compiled);
