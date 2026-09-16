import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -1000,
          duration: "forTheTurn",
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              {
                tokens: ["Magnadramon", "X Antibody"],
                match: "nameExact",
              },
            ],
            raw: "[Magnadramon] or [X Antibody] is in this Digimon's digivolution cards",
          },
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
            },
            unit: "security",
          },
        },
        {
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -1000,
          duration: "forTheTurn",
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              {
                tokens: ["Magnadramon", "X Antibody"],
                match: "nameExact",
              },
            ],
            raw: "[Magnadramon] or [X Antibody] is in this Digimon's digivolution cards",
          },
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
            },
            unit: "security",
          },
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "securityToHand",
            controller: "mine",
            count: 1,
            position: "top",
            raw: "by adding the top card of your security stack to your hand",
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Magnadramon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-043", compiled);
