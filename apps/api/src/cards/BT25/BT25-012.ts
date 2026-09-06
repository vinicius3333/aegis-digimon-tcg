import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              or: [
                {
                  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
                  nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
                },
                { nameOrTrait: [{ tokens: ["Shaman", "TS"], match: "trait" }] },
              ],
            },
            count: 1,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              or: [
                {
                  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
                  nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
                },
                { nameOrTrait: [{ tokens: ["Shaman", "TS"], match: "trait" }] },
              ],
            },
            count: 1,
            sameTarget: true,
          },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              or: [
                {
                  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
                  nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
                },
                { nameOrTrait: [{ tokens: ["Shaman", "TS"], match: "trait" }] },
              ],
            },
            count: 1,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              or: [
                {
                  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
                  nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
                },
                { nameOrTrait: [{ tokens: ["Shaman", "TS"], match: "trait" }] },
              ],
            },
            count: 1,
            sameTarget: true,
          },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-012", compiled);
