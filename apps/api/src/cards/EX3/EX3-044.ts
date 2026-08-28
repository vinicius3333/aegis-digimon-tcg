// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Text: [All Turns][Once Per Turn] When this Digimon becomes suspended, suspend 1 of your opponent's Digimon.
// [All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name
// deletes an opponent's Digimon in battle and survives, trash the top card of your opponent's security stack.
// Inherited: same as second own effect.
// KB Q&A Q3399: 'when suspended' and 'when attacking' trigger simultaneously; turn-player's
//   [When Attacking] resolves first, then non-turn-player's 'when suspended' effect.
const compiled: CompiledCard = {
  effects: [
    {
      // Fires when THIS Digimon becomes suspended (not any Digimon).
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
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
      // Fires when any of your Digimon with [Dramon] or [Examon] in its name deletes in battle and survives.
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
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
            survivedBattle: true,
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
      // Inherited version of the Dramon/Examon delete trigger.
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
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
            survivedBattle: true,
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
