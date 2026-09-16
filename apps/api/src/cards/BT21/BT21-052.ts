import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Evade",
          raw: "＜Evade＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Suspend all of your opponent's Digimon and Tamers.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: "all",
          },
        },
        {
          effectTextPart: "Then, delete 1 of their suspended Digimon or Tamers.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
        },
      ],
    },
    {
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
              kind: "Unsuspend",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
            },
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              condition: {
                kind: "selfDigivolutionStackHasTrait",
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Examon"],
                      match: "nameExact",
                    },
                    {
                      tokens: ["X Antibody"],
                      match: "nameExact",
                    },
                  ],
                },
                raw: "[Examon]/[X Antibody] is in this Digimon's digivolution cards",
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
      namesExact: ["Examon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-052", compiled);
