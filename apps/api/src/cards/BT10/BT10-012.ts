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
              or: [
                { zone: "hand" },
                {
                  zone: "digivolutionCards",
                  hostFilter: {
                    controller: "mine",
                    kind: ["Tamer"],
                  },
                },
              ],
            },
            count: 1,
            from: ["hand", "digivolutionCards"],
          },
          position: "bottom",
          optional: true,
        },
        {
          effectTextPart:
            "Then, if [Beelzemon] is in this Digimon's digivolution cards, return 2 cards with [Xros Heart] in their traits from your trash to your hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 2,
          },
          to: "hand",
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
              or: [
                { zone: "hand" },
                {
                  zone: "digivolutionCards",
                  hostFilter: {
                    controller: "mine",
                    kind: ["Tamer"],
                  },
                },
              ],
            },
            count: 1,
            from: ["hand", "digivolutionCards"],
          },
          position: "bottom",
          optional: true,
        },
        {
          effectTextPart:
            "Then, if [Beelzemon] is in this Digimon's digivolution cards, return 2 cards with [Xros Heart] in their traits from your trash to your hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 2,
          },
          to: "hand",
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
          names: ["Shoutmon X4"],
        },
        {
          names: ["Beelzemon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT10-012", compiled);
