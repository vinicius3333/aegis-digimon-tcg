import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, if this Digimon has no digivolution cards, you may place 1 [Yuuko Kamishiro] from your hand or trash as this Digimon's bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Yuuko Kamishiro"],
                  match: "nameExact",
                },
              ],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
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
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, if this Digimon has no digivolution cards, you may place 1 [Yuuko Kamishiro] from your hand or trash as this Digimon's bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Yuuko Kamishiro"],
                  match: "nameExact",
                },
              ],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
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
                      tokens: ["Yuuko Kamishiro"],
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
      names: ["Yuuko Kamishiro"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-081", compiled);
