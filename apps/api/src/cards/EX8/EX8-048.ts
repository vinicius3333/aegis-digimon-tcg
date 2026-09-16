import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 },
                count: 1,
              },
            },
          ],
          raw: "When this card is trashed from the digivolution cards of a Digimon with the [Mineral]/[Rock] trait, delete 1 of your opponent's Digimon with a play cost of 4 or less.",
        },
      ],
      isInherited: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Close"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              countMax: 1,
            },
            raw: "you have 1 or fewer Tamers",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["Mineral"], cost: 2, isAlternate: true }],
};

registerIrCard("EX8-048", compiled);
