// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["DS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["DS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "memoryAtLeast",
            value: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "beSuspended",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "memoryAtMost",
            value: 1,
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "memoryAtLeast",
            value: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "beSuspended",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "memoryAtMost",
            value: 1,
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["DS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("LM-041", compiled);
