import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT21-066 Arresterdramon:
// [On Play][When Digivolving] You may play 1 [Hunter]/[Hero] trait Tamer from
//   your hand without paying the cost.
// [On Deletion] You may place 1 Digimon card with the [Hero] trait or
//   <Save> in its text from your hand or trash under any of your Tamers.
//   Then, <Save>.
// [Inherited][Your Turn] This Digimon gets +2000 DP.
//
// KB Q4574: "with X in its text" includes name, traits, effects, keywords, etc.

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Hunter", "Hero"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
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
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Hunter", "Hero"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Hero"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                keywords: ["Save"],
              },
            ],
            count: 1,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
          },
          optional: true,
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
          },
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "YourTurn",
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
          amount: 2000,
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
      texts: ["Save"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["Hero"],
      cost: 2,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [{ texts: ["Save"] }],
      count: 2,
      maxMaterials: 1,
    },
  ],
};

registerIrCard("BT21-066", compiled);
