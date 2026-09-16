import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          raw: "[All Turns][Once Per Turn] When this Digimon becomes suspended, suspend 1 of your opponent's Digimon.",
          effectTextPart:
            "[All Turns][Once Per Turn] When this Digimon becomes suspended, suspend 1 of your opponent's Digimon.",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  suspended: false,
                },
                count: 1,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          raw: "[All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name deletes an opponent's Digimon in battle and survives, trash the top card of your opponent's security stack.",
          effectTextPart:
            "[All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name deletes an opponent's Digimon in battle and survives, trash the top card of your opponent's security stack.",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Dramon"],
                match: "name",
              },
              {
                tokens: ["Examon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          raw: "[All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name deletes an opponent's Digimon in battle and survives, trash the top card of your opponent's security stack.",
          effectTextPart:
            "[All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name deletes an opponent's Digimon in battle and survives, trash the top card of your opponent's security stack.",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Dramon"],
                match: "name",
              },
              {
                tokens: ["Examon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Groundramon"],
      cost: 3,
      isAlternate: true,
    },
    {
      names: ["Wingdramon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX3-044", compiled);
