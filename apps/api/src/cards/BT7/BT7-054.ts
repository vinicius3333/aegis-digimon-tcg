import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Your Turn][Once Per Turn]: whenDeletesInBattle fires only when the attacker
// survived (BT2-051 precedent), so no extra "survives" field is needed.
// sourceFilter restricts to own Digimon with [Ten Warriors] or [Hybrid] trait.
// [On Deletion]: play a green level 4 or lower [Hybrid] card from hand.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ten Warriors", "Hybrid"],
                match: "trait",
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
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              colors: ["Green"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-054", compiled);
