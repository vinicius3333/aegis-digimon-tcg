// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1836: check is by either exact card name, not trait or name substring.
// [When Digivolving]: the same scaled DP reduction applies to battle-area Digimon
// and Security Digimon. These are distinct runtime modifier channels.
// [End of Attack]: "You may add the top security card to hand TO unsuspend" —
// the security add is the cost that enables the unsuspend (cost kind securityToHand).
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
              includeSecurityZone: true,
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
            amount: 1,
            fromTop: true,
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
