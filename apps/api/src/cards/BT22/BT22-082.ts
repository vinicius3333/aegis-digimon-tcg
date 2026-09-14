// HAND-FIXED IR for BT22-082 — do not regenerate.
// OnPlay/WhenDigivolving Delete: added playCost lte 7 (text: "play cost 7 or lower").
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's play cost 7 or lower Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCost: {
                op: "lte",
                value: 7,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if this Digimon has no digivolution cards, you may place 1 [Arata Sanada] from your hand or trash as this Digimon's bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Arata Sanada"],
                  match: "nameExact",
                },
              ],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          condition: {
            kind: "selfHasNoDigivolutionCards",
            raw: "this Digimon has no digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's play cost 7 or lower Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCost: {
                op: "lte",
                value: 7,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if this Digimon has no digivolution cards, you may place 1 [Arata Sanada] from your hand or trash as this Digimon's bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Arata Sanada"],
                  match: "nameExact",
                },
              ],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          condition: {
            kind: "selfHasNoDigivolutionCards",
            raw: "this Digimon has no digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  zone: "digivolutionCards",
                  hostFilter: { isSelfRef: true },
                  nameOrTrait: [
                    {
                      tokens: ["Arata Sanada"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Arata Sanada"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-082", compiled);
