import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
        },
        {
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: "all",
          },
          effect: {
            kind: "modifyDP",
            amount: -4000,
          },
          while: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Rapidmon", "X Antibody"],
                  match: "name",
                },
              ],
            },
            raw: "[Rapidmon] or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 2,
              condition: {
                kind: "anyOf",
                conditions: [
                  {
                    kind: "triggerRemovalCause",
                    removalCause: "byBattle",
                  },
                  {
                    kind: "triggerDeletedByDpZero",
                    raw: "the opponent's Digimon was deleted by having 0 DP",
                  },
                ],
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Rapidmon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-101", compiled);
export { compiled };
