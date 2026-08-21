import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX5-040.
// Plan 13-01 Task 3 (Phase 13 primitives): PlayWithoutCost.breeding: true routes the
// played card to the BREEDING area. The engine's playInstances primitive now handles
// the breeding destination.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Deva"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            upTo: true,
          },
          payCost: false,
          from: ["hand"],
          breeding: true,
          notSameNameAs: ["battleArea", "trash"],
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Piercing",
            },
          },
          while: {
            kind: "youHave",
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Four Sovereigns", "God Beast"],
                  match: "trait",
                },
              ],
              isSelfRef: true,
            },
            count: 1,
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-040", compiled);
