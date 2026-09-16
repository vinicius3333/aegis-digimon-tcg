import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] You may place up to 5 [Hybrid] trait cards with different names from your hand or trash under 1 of your Tamers.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
              ],
              distinctNames: true,
            },
            count: 5,
            upTo: true,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, 1 of your Tamers with 5 or more cards under it may digivolve into [EmperorGreymon] in the hand or trash, ignoring digivolution requirements and without paying the cost.",
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              digivolutionCardsAtLeast: 5,
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["EmperorGreymon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand", "trash"],
          ignoreRequirements: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] You may play 1 Tamer card with inherited effects from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              hasInheritedEffects: true,
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-095", compiled);
