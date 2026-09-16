import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: [{ name: "Uka no Mitama", keywords: [{ keyword: "Rush" }] }],
          count: 1,
          payCost: false,
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfDigivolutionStackCountAtLeast",
                count: 1,
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Sakuyamon"],
                      match: "name",
                    },
                  ],
                },
              },
              {
                kind: "selfDigivolutionStackCountAtLeast",
                count: 1,
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["X Antibody"],
                      match: "trait",
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "UseOptionWithoutCost",
              filter: {
                controller: "mine",
                kind: ["Option"],
                singleColor: true,
                playCostLte: 5,
              },
              payCost: false,
              from: ["hand"],
              optional: true,
              raw: "you may use 1 1-color Option card with a use cost of 5 or less from your hand without paying the cost",
            },
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              condition: {
                kind: "ifThisEffectUsed",
                raw: "if you did (used an Option), 1 of your Digimon unsuspends (mandatory; KB Q4737)",
              },
            },
          ],
          raw: "when one of your Digimon attacks",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      names: ["Sakuyamon"],
      excludeTraits: ["X Antibody"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX8-037", compiled);
