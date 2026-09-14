// Hand-authored override — do not regenerate.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play][When Digivolving] You may place 1 Digimon card with [Xros Heart] in its traits from your hand or from under one of your Tamers under this Digimon as its bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["hand", "underTamers"],
          },
          position: "bottom",
          optional: true,
        },
        {
          effectTextPart:
            "Then, if [Beelzemon] is in this Digimon's digivolution cards, you may play 1 level 4 or lower Digimon card with [Xros Heart] in its traits from your trash without paying its cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Beelzemon"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[Beelzemon] is in this Digimon's digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play][When Digivolving] You may place 1 Digimon card with [Xros Heart] in its traits from your hand or from under one of your Tamers under this Digimon as its bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["hand", "underTamers"],
          },
          position: "bottom",
          optional: true,
        },
        {
          effectTextPart:
            "Then, if [Beelzemon] is in this Digimon's digivolution cards, you may play 1 level 4 or lower Digimon card with [Xros Heart] in its traits from your trash without paying its cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Beelzemon"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[Beelzemon] is in this Digimon's digivolution cards",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Shoutmon X5"],
        },
        {
          names: ["Beelzemon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT10-015", compiled);
