import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          effectTextPart: "[When Digivolving] Suspend all of your opponent’s Digimon.",
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
          effectTextPart: "Then, this Digimon may attack.",
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
                  match: "nameExact",
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
          raw: "[All Turns] [Once Per Turn] When an opponent's Digimon is deleted in battle or by having 0 DP, gain 2 memory.",
          effectTextPart:
            "[All Turns] [Once Per Turn] When an opponent's Digimon is deleted in battle or by having 0 DP, gain 2 memory.",
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
